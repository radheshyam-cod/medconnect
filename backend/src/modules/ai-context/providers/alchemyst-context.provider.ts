import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IContextProvider,
  ContextQuery,
  ProviderContext,
  ProviderHealth,
} from './context-provider.interface';
import {
  MedicalContext,
  MedicationContext,
  LabContext,
  TimelineContext,
  ConditionContext,
  ImportantEventContext,
} from '../dto/medical-context.dto';
import { ContextHealthService, CIRCUIT_BREAKER } from './context-health.service';
import crypto from 'crypto';

// ─── API constants ────────────────────────────────────────────────────
const ALCHEMYST_BASE_URL = 'https://platform-backend.getalchemystai.com';
const ALCHEMYST_SEARCH_PATH = '/api/v1/context/search';
const ALCHEMYST_ADD_PATH = '/api/v1/context/add';
const DEFAULT_TIMEOUT_MS = 10_000;

/** Shape returned by the Alchemyst search API. */
interface AlchemystSearchResult {
  content: string;
  score: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

interface AlchemystSearchResponse {
  contexts?: AlchemystSearchResult[];
}

interface MetaFields {
  version: string;
  source: string;
  timestamp: string;
  confidence: number;
  hash?: string;
}

@Injectable()
export class AlchemystContextProvider implements IContextProvider {
  readonly name = 'Alchemyst';
  readonly version = '1.0.0';
  private readonly logger = new Logger(AlchemystContextProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly healthService: ContextHealthService,
  ) {
    this.apiKey = this.configService.get<string>('ALCHEMYST_API_KEY', '');
    this.baseUrl = this.configService.get<string>('ALCHEMYST_BASE_URL', ALCHEMYST_BASE_URL);
    this.timeoutMs = this.configService.get<number>('ALCHEMYST_TIMEOUT', DEFAULT_TIMEOUT_MS);

    if (this.apiKey) {
      this.logger.log(`Alchemyst provider initialized (baseUrl: ${this.baseUrl})`);
    } else {
      this.logger.warn('ALCHEMYST_API_KEY not configured. Alchemyst context features disabled.');
    }
  }

  get isAvailable(): boolean {
    return !!this.apiKey;
  }

  async retrieveContext(query: ContextQuery): Promise<ProviderContext> {
    if (!this.isAvailable) {
      return { source: this.name, version: this.version, data: {} };
    }

    try {
      const response = await this.callSearchApi(
        query.query,
        query.timeoutMs || this.timeoutMs,
      );

      const data = this.mapSearchResults(response);

      return { source: this.name, version: this.version, data };
    } catch (error) {
      this.logger.error(`[${this.name}] retrieveContext failed: ${(error as Error).message}`);
      return { source: this.name, version: this.version, data: {} };
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    const providerHealth = this.healthService.getHealth(this.name, this.version);

    if (!this.apiKey) {
      return {
        ...providerHealth,
        status: 'down',
        lastError: 'ALCHEMYST_API_KEY not configured',
      };
    }

    try {
      // Probe the search API with a trivial query to verify connectivity
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5_000);

      const startTime = Date.now();
      const response = await fetch(
        `${this.baseUrl}${ALCHEMYST_SEARCH_PATH}?metadata=false&mode=fast`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: 'ping',
            similarity_threshold: 1.0,
            minimum_similarity_threshold: 1.0,
            scope: 'internal',
          }),
          signal: controller.signal,
        },
      );
      clearTimeout(timeout);

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        return {
          ...providerHealth,
          status: 'degraded',
          latencyMs,
          lastError: `Alchemyst API returned ${response.status}: ${body.slice(0, 200)}`,
        };
      }

      return {
        ...providerHealth,
        status: 'healthy',
        latencyMs,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[${this.name}] healthCheck failed: ${msg}`);
      return {
        status: 'down',
        providerName: this.name,
        version: this.version,
        lastCheck: new Date().toISOString(),
        latencyMs: 0,
        consecutiveFailures: CIRCUIT_BREAKER.CONSECUTIVE_FAILURES_TO_TRIP,
        lastError: `healthCheck error: ${msg}`,
      };
    }
  }

  async updateContext(userId: string, data: Partial<MedicalContext>): Promise<void> {
    if (!this.isAvailable) return;

    try {
      const documents: Array<{ content: string }> = [];

      // Flatten MedicalContext into content strings
      const pushContent = (label: string, items: unknown[]) => {
        for (const item of items) {
          if (item && typeof item === 'object') {
            documents.push({
              content: JSON.stringify({ _type: label, ...(item as Record<string, unknown>) }),
            });
          }
        }
      };

      if (data.conditions) pushContent('condition', data.conditions);
      if (data.medications) pushContent('medication', data.medications);
      if (data.labs) pushContent('lab', data.labs);
      if (data.timeline) pushContent('timeline', data.timeline);
      if (data.importantEvents) pushContent('event', data.importantEvents);

      if (documents.length === 0) return;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(`${this.baseUrl}${ALCHEMYST_ADD_PATH}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documents,
          source: 'medconnect-context-sync',
          context_type: 'resource',
          scope: 'internal',
          metadata: {
            userId: userId,
            providerVersion: this.version,
            syncedAt: new Date().toISOString(),
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        this.logger.warn(
          `[${this.name}] updateContext returned ${response.status}: ${body.slice(0, 200)}`,
        );
      }
    } catch (error) {
      this.logger.error(`[${this.name}] updateContext failed: ${(error as Error).message}`);
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────

  /**
   * Call the Alchemyst search API with the given query text.
   * Throws on network errors or non-2xx responses.
   */
  private async callSearchApi(
    query: string,
    timeoutMs: number,
  ): Promise<AlchemystSearchResult[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(
        `${this.baseUrl}${ALCHEMYST_SEARCH_PATH}?metadata=true&mode=standard`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            similarity_threshold: 0.8,
            minimum_similarity_threshold: 0.5,
            scope: 'internal',
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(
          `Alchemyst API returned ${response.status}: ${body.slice(0, 300)}`,
        );
      }

      const json = (await response.json()) as AlchemystSearchResponse;
      return json.contexts || [];
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Map Alchemyst search results into Partial<MedicalContext>.
   *
   * Each result's `content` field is:
   *   - Parsed as JSON — if it contains known type markers (_type) the
   *     result is routed into the correct entity array (medication, lab,
   *     timeline, condition, event).
   *   - Parsed as JSON without a type marker — classified by detected
   *     fields (e.g. `name+dosage` → medication, `testName+value` → lab).
   *   - Otherwise — stored as ImportantEventContext (free text).
   */
  private mapSearchResults(results: AlchemystSearchResult[]): Partial<MedicalContext> {
    const conditions: ConditionContext[] = [];
    const medications: MedicationContext[] = [];
    const labs: LabContext[] = [];
    const timeline: TimelineContext[] = [];
    const importantEvents: ImportantEventContext[] = [];

    for (const r of results) {
      const baseMeta: MetaFields = {
        version: this.version,
        source: this.name,
        timestamp: r.createdAt || new Date().toISOString(),
        confidence: r.score ? Math.min(1, Math.max(0.3, r.score)) : 0.7,
      };

      // Try parsing content as structured JSON
      let parsed: Record<string, unknown> | null = null;
      try {
        const maybe = JSON.parse(r.content);
        if (maybe && typeof maybe === 'object' && !Array.isArray(maybe)) {
          parsed = maybe as Record<string, unknown>;
        }
      } catch {
        // Not JSON — treat as free text
      }

      if (parsed) {
        this.routeStructuredItem(parsed, r, baseMeta, {
          conditions,
          medications,
          labs,
          timeline,
          importantEvents,
        });
      } else {
        // Free-text content — store as ImportantEventContext
        importantEvents.push(this.toImportantEvent(r.content, r, baseMeta));
      }
    }

    return {
      conditions: conditions.length > 0 ? conditions : undefined,
      medications: medications.length > 0 ? medications : undefined,
      labs: labs.length > 0 ? labs : undefined,
      timeline: timeline.length > 0 ? timeline : undefined,
      importantEvents: importantEvents.length > 0 ? importantEvents : undefined,
    };
  }

  /**
   * Classify a parsed JSON object into the correct entity type.
   * Respects explicit `_type` markers from updateContext() output first,
   * then falls back to field-based heuristics.
   */
  private routeStructuredItem(
    parsed: Record<string, unknown>,
    raw: AlchemystSearchResult,
    base: MetaFields,
    buckets: {
      conditions: ConditionContext[];
      medications: MedicationContext[];
      labs: LabContext[];
      timeline: TimelineContext[];
      importantEvents: ImportantEventContext[];
    },
  ): void {
    // Explicit type marker set by our updateContext() serializer
    const explicitType = parsed._type as string | undefined;

    if (explicitType === 'condition' || (parsed.name && parsed.status)) {
      buckets.conditions.push(this.toConditionContext(parsed, raw, base));
    } else if (explicitType === 'medication' || (parsed.name && (parsed.dosage || parsed.frequency))) {
      buckets.medications.push(this.toMedicationContext(parsed, raw, base));
    } else if (explicitType === 'lab' || (parsed.testName && parsed.value)) {
      buckets.labs.push(this.toLabContext(parsed, raw, base));
    } else if (explicitType === 'timeline' || parsed.eventType) {
      buckets.timeline.push(this.toTimelineContext(parsed, raw, base));
    } else if (parsed.medicalConditions || parsed.diagnoses) {
      const extracted = this.extractConditionsFromParsed(parsed, raw, base);
      buckets.conditions.push(...extracted);
      // Also keep the raw JSON as an important event for free-text search
      buckets.importantEvents.push(
        this.toImportantEvent(JSON.stringify(parsed), raw, base),
      );
    } else {
      // Unknown structured object — store as free text
      buckets.importantEvents.push(
        this.toImportantEvent(JSON.stringify(parsed), raw, base),
      );
    }
  }

  // ── Entity builders ─────────────────────────────────────────────────

  private toMedicationContext(
    parsed: Record<string, unknown>,
    _raw: AlchemystSearchResult,
    base: MetaFields,
  ): MedicationContext {
    const name = String(parsed.name || '');
    const dosage = parsed.dosage ? String(parsed.dosage) : undefined;
    const frequency = parsed.frequency ? String(parsed.frequency) : undefined;
    const isActive = parsed.isActive !== false;

    const dedupRaw = `med:${name}:${dosage || ''}:${isActive}`;
    const hash = crypto.createHash('md5').update(dedupRaw).digest('hex');

    return {
      id: `alchemyst-med-${hash.slice(0, 12)}`,
      name,
      dosage,
      frequency,
      isActive,
      meta: { ...base, hash, confidence: base.confidence || 0.7 },
    };
  }

  private toLabContext(
    parsed: Record<string, unknown>,
    _raw: AlchemystSearchResult,
    base: MetaFields,
  ): LabContext {
    const testName = String(parsed.testName || '');
    const value = String(parsed.value || '');
    const date = String(
      parsed.date || (_raw.createdAt) || new Date().toISOString().split('T')[0],
    );

    const dedupRaw = `lab:${testName}:${value}:${date.split('T')[0]}`;
    const hash = crypto.createHash('md5').update(dedupRaw).digest('hex');

    return {
      id: `alchemyst-lab-${hash.slice(0, 12)}`,
      testName,
      value,
      unit: parsed.unit ? String(parsed.unit) : undefined,
      isAbnormal: parsed.isAbnormal === true,
      date,
      meta: { ...base, hash, confidence: base.confidence || 0.7 },
    };
  }

  private toTimelineContext(
    parsed: Record<string, unknown>,
    _raw: AlchemystSearchResult,
    base: MetaFields,
  ): TimelineContext {
    const eventType = String(parsed.eventType || 'OTHER');
    const title = String(parsed.title || '');
    const date = String(
      parsed.date || parsed.eventDate || (_raw.createdAt) || new Date().toISOString().split('T')[0],
    );

    const dedupRaw = `tl:${eventType}:${title}:${date.split('T')[0]}`;
    const hash = crypto.createHash('md5').update(dedupRaw).digest('hex');

    return {
      id: `alchemyst-tl-${hash.slice(0, 12)}`,
      eventType,
      title,
      description: parsed.description ? String(parsed.description) : undefined,
      date,
      meta: { ...base, hash, confidence: base.confidence || 0.7 },
    };
  }

  private toConditionContext(
    parsed: Record<string, unknown>,
    _raw: AlchemystSearchResult,
    base: MetaFields,
  ): ConditionContext {
    const name = String(parsed.name || '');
    const dedupRaw = `cond:${name}`;
    const hash = crypto.createHash('md5').update(dedupRaw).digest('hex');

    return {
      id: `alchemyst-cond-${hash.slice(0, 12)}`,
      name,
      status: (parsed.status as ConditionContext['status']) || 'ACTIVE',
      diagnosedDate: parsed.diagnosedDate
        ? String(parsed.diagnosedDate)
        : undefined,
      meta: { ...base, hash, confidence: base.confidence || 0.7 },
    };
  }

  private extractConditionsFromParsed(
    parsed: Record<string, unknown>,
    _raw: AlchemystSearchResult,
    base: MetaFields,
  ): ConditionContext[] {
    const result: ConditionContext[] = [];

    // medicalConditions array (structured objects)
    const medConditions = parsed.medicalConditions;
    if (Array.isArray(medConditions)) {
      for (const mc of medConditions) {
        if (mc && typeof mc === 'object') {
          const name = String((mc as Record<string, unknown>).name || '');
          if (!name) continue;
          const dedupRaw = `cond:${name}`;
          const hash = crypto.createHash('md5').update(dedupRaw).digest('hex');
          result.push({
            id: `alchemyst-cond-${hash.slice(0, 12)}`,
            name,
            status:
              ((mc as Record<string, unknown>).status as ConditionContext['status']) || 'ACTIVE',
            diagnosedDate: (mc as Record<string, unknown>).diagnosedDate
              ? String((mc as Record<string, unknown>).diagnosedDate)
              : undefined,
            meta: { ...base, hash, confidence: 0.65 },
          });
        }
      }
    }

    // diagnoses array (simple strings)
    const diagnoses = parsed.diagnoses;
    if (Array.isArray(diagnoses)) {
      for (const d of diagnoses) {
        const name = String(d || '').trim();
        if (!name) continue;
        const dedupRaw = `cond:${name}`;
        const hash = crypto.createHash('md5').update(dedupRaw).digest('hex');
        if (!result.some((c) => c.meta.hash === hash)) {
          result.push({
            id: `alchemyst-diag-${hash.slice(0, 12)}`,
            name,
            status: 'ACTIVE',
            meta: { ...base, hash, confidence: 0.6 },
          });
        }
      }
    }

    return result;
  }

  private toImportantEvent(
    text: string,
    raw: AlchemystSearchResult,
    base: MetaFields,
  ): ImportantEventContext {
    const hash = crypto.createHash('md5').update(text).digest('hex');
    return {
      id: `alchemyst-ev-${hash.slice(0, 12)}`,
      description: text.length > 500 ? text.slice(0, 500) + '\u2026' : text,
      date: raw.createdAt,
      meta: { ...base, hash, confidence: base.confidence || 0.7 },
    };
  }
}
