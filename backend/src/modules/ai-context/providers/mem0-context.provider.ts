import { Injectable, Logger } from '@nestjs/common';
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
import { MemoryService } from '../../memory/memory.service';
import { ContextHealthService, CIRCUIT_BREAKER } from './context-health.service';
import type { MemorySearchResult } from '../../memory/interfaces/memory.interface';
import crypto from 'crypto';

// ─── Category constants (matches MemoryProcessor eventType metadata) ───
const CAT_MEDICATION = 'medication';
const CAT_LAB_RESULT = 'lab_result';
const CAT_TIMELINE_EVENT = 'timeline_event';

/**
 * Subset of ContextMetadata fields that entity builders accept.
 * The caller (classifyMemories) fills in version/source/timestamp/confidence
 * per result; each builder then adds `hash` and passes through the rest.
 */
interface MetaFields {
  version: string;
  source: string;
  timestamp: string;
  confidence: number;
  hash?: string;
}

@Injectable()
export class Mem0ContextProvider implements IContextProvider {
  readonly name = 'Mem0';
  readonly version = '1.0.0';
  private readonly logger = new Logger(Mem0ContextProvider.name);

  constructor(
    private readonly memoryService: MemoryService,
    private readonly healthService: ContextHealthService,
  ) {}

  get isAvailable(): boolean {
    return true;
  }

  async retrieveContext(query: ContextQuery): Promise<ProviderContext> {
    try {
      const results = await this.memoryService.searchRelevantMemories(
        query.userId,
        query.query,
        query.limit || 15,
      );

      const data = this.classifyMemories(results);

      return { source: this.name, version: this.version, data };
    } catch (error) {
      this.logger.error(`[${this.name}] retrieveContext failed: ${(error as Error).message}`);
      return { source: this.name, version: this.version, data: {} };
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    try {
      const mem0Health = await this.memoryService.healthCheck();
      const providerHealth = this.healthService.getHealth(this.name, this.version);

      if (!mem0Health.available) {
        return {
          ...providerHealth,
          status: 'down',
          lastError: 'Mem0 service unavailable',
        };
      }

      return providerHealth;
    } catch (error) {
      this.logger.error(`[${this.name}] healthCheck failed: ${(error as Error).message}`);
      return {
        status: 'down',
        providerName: this.name,
        version: this.version,
        lastCheck: new Date().toISOString(),
        latencyMs: 0,
        consecutiveFailures: CIRCUIT_BREAKER.CONSECUTIVE_FAILURES_TO_TRIP,
        lastError: `healthCheck error: ${(error as Error).message}`,
      };
    }
  }

  async updateContext(userId: string, data: Partial<MedicalContext>): Promise<void> {
    if (!userId) return;

    try {
      const promises: Promise<boolean>[] = [];

      // Sync medications
      if (data.medications) {
        for (const med of data.medications) {
          promises.push(
            this.memoryService.addStructuredMemory(
              userId,
              CAT_MEDICATION,
              JSON.stringify({
                name: med.name,
                dosage: med.dosage,
                frequency: med.frequency,
                isActive: med.isActive,
                _hash: med.meta?.hash,
              }),
              {
                action: 'sync',
                source: this.name,
                confidence: med.meta?.confidence ?? 0.85,
                syncedAt: new Date().toISOString(),
              },
            ),
          );
        }
      }

      // Sync lab results
      if (data.labs) {
        for (const lab of data.labs) {
          promises.push(
            this.memoryService.addStructuredMemory(
              userId,
              CAT_LAB_RESULT,
              JSON.stringify({
                testName: lab.testName,
                value: lab.value,
                unit: lab.unit,
                isAbnormal: lab.isAbnormal,
                date: lab.date,
                _hash: lab.meta?.hash,
              }),
              {
                action: 'sync',
                source: this.name,
                confidence: lab.meta?.confidence ?? 0.85,
                syncedAt: new Date().toISOString(),
              },
            ),
          );
        }
      }

      // Sync timeline events
      if (data.timeline) {
        for (const tl of data.timeline) {
          promises.push(
            this.memoryService.addStructuredMemory(
              userId,
              CAT_TIMELINE_EVENT,
              JSON.stringify({
                eventType: tl.eventType,
                title: tl.title,
                description: tl.description,
                date: tl.date,
                _hash: tl.meta?.hash,
              }),
              {
                action: 'sync',
                source: this.name,
                confidence: tl.meta?.confidence ?? 0.85,
                syncedAt: new Date().toISOString(),
              },
            ),
          );
        }
      }

      // Sync conditions (stored as medication category memories with type marker)
      if (data.conditions) {
        for (const cond of data.conditions) {
          promises.push(
            this.memoryService.addStructuredMemory(
              userId,
              'medical_condition',
              JSON.stringify({
                name: cond.name,
                status: cond.status,
                diagnosedDate: cond.diagnosedDate,
                _type: 'condition',
                _hash: cond.meta?.hash,
              }),
              {
                action: 'sync',
                source: this.name,
                confidence: cond.meta?.confidence ?? 0.85,
                syncedAt: new Date().toISOString(),
              },
            ),
          );
        }
      }

      // Sync important events as free-text
      if (data.importantEvents) {
        for (const evt of data.importantEvents) {
          promises.push(
            this.memoryService.addStructuredMemory(
              userId,
              'important_event',
              JSON.stringify({
                description: evt.description,
                date: evt.date,
                _type: 'important_event',
                _hash: evt.meta?.hash,
              }),
              {
                action: 'sync',
                source: this.name,
                confidence: evt.meta?.confidence ?? 0.85,
                syncedAt: new Date().toISOString(),
              },
            ),
          );
        }
      }

      if (promises.length === 0) {
        this.logger.debug(`[${this.name}] updateContext: no entities to sync for user ${userId?.slice(0, 8)}`);
        return;
      }

      await Promise.all(promises);
      this.logger.debug(`[${this.name}] updateContext synced ${promises.length} entities for user ${userId?.slice(0, 8)}`);
    } catch (error) {
      this.logger.error(`[${this.name}] updateContext failed: ${(error as Error).message}`);
    }
  }

  // ── Private helpers ────────────────────────────────────────────────

  /**
   * Categorise each memory result by its `category` field and map it into
   * the appropriate MedicalContext array. Memories whose `memory` field
   * is valid JSON are parsed for structured fields; others are treated
   * as free-text `ImportantEventContext`.
   */
  private classifyMemories(results: MemorySearchResult[]): Partial<MedicalContext> {
    const conditions: ConditionContext[] = [];
    const medications: MedicationContext[] = [];
    const labs: LabContext[] = [];
    const timeline: TimelineContext[] = [];
    const importantEvents: ImportantEventContext[] = [];

    for (const r of results) {
      const cat = (r.category || '').toLowerCase();
      const now = new Date().toISOString();
      const baseMeta: MetaFields = {
        version: this.version,
        source: this.name,
        timestamp: now,
        confidence: r.score ? Math.min(1, Math.max(0.3, r.score)) : 0.85,
      };

      // Try parsing the memory text as structured JSON first
      let parsed: Record<string, unknown> | null = null;
      try {
        const maybe = JSON.parse(r.memory);
        if (maybe && typeof maybe === 'object' && !Array.isArray(maybe)) {
          parsed = maybe as Record<string, unknown>;
        }
      } catch {
        // Not JSON — treat as free text
      }

      if (cat === CAT_MEDICATION && parsed) {
        medications.push(this.toMedicationContext(r, parsed, baseMeta));
      } else if (cat === CAT_LAB_RESULT && parsed) {
        labs.push(this.toLabContext(r, parsed, baseMeta));
      } else if (cat === CAT_TIMELINE_EVENT && parsed) {
        timeline.push(this.toTimelineContext(r, parsed, baseMeta));
      } else if (parsed && (parsed.medicalConditions || parsed.diagnoses || parsed._type === 'condition')) {
        const extractedConditions = this.extractConditionsFromParsed(r, parsed, baseMeta);
        conditions.push(...extractedConditions);
        // Also keep the raw text for free-text search context
        importantEvents.push(this.toImportantEvent(r, r.memory, baseMeta));
      } else {
        // Uncategorised or free-text memory
        importantEvents.push(this.toImportantEvent(r, r.memory, baseMeta));
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

  // ── Entity builders ────────────────────────────────────────────────

  private toMedicationContext(
    r: MemorySearchResult,
    parsed: Record<string, unknown>,
    base: MetaFields,
  ): MedicationContext {
    const name = String(parsed.name || '');
    const dosage = parsed.dosage ? String(parsed.dosage) : undefined;
    const frequency = parsed.frequency ? String(parsed.frequency) : undefined;
    const isActive = parsed.isActive !== false;

    const dedupRaw = `med:${name}:${dosage || ''}:${isActive}`;
    const hash = crypto.createHash('md5').update(dedupRaw).digest('hex');

    return {
      id: r.id,
      name,
      dosage,
      frequency,
      isActive,
      meta: { ...base, hash, confidence: base.confidence || 0.85 },
    };
  }

  private toLabContext(
    r: MemorySearchResult,
    parsed: Record<string, unknown>,
    base: MetaFields,
  ): LabContext {
    const testName = String(parsed.testName || '');
    const value = String(parsed.value || '');
    const date = String(parsed.date || r.createdAt || new Date().toISOString().split('T')[0]);

    const dedupRaw = `lab:${testName}:${value}:${date.split('T')[0]}`;
    const hash = crypto.createHash('md5').update(dedupRaw).digest('hex');

    return {
      id: r.id,
      testName,
      value,
      unit: parsed.unit ? String(parsed.unit) : undefined,
      isAbnormal: parsed.isAbnormal === true,
      date,
      meta: { ...base, hash, confidence: base.confidence || 0.85 },
    };
  }

  private toTimelineContext(
    r: MemorySearchResult,
    parsed: Record<string, unknown>,
    base: MetaFields,
  ): TimelineContext {
    const eventType = String(parsed.eventType || 'OTHER');
    const title = String(parsed.title || '');
    const date = String(
      parsed.date || parsed.eventDate || r.createdAt || new Date().toISOString().split('T')[0],
    );

    const dedupRaw = `tl:${eventType}:${title}:${date.split('T')[0]}`;
    const hash = crypto.createHash('md5').update(dedupRaw).digest('hex');

    return {
      id: r.id,
      eventType,
      title,
      description: parsed.description ? String(parsed.description) : undefined,
      date,
      meta: { ...base, hash, confidence: base.confidence || 0.85 },
    };
  }

  /**
   * Extract ConditionContext items from extraction memories that contain
   * `medicalConditions` or `diagnoses` arrays, or `_type === 'condition'`.
   */
  private extractConditionsFromParsed(
    r: MemorySearchResult,
    parsed: Record<string, unknown>,
    base: MetaFields,
  ): ConditionContext[] {
    const result: ConditionContext[] = [];

    // Single condition object (from updateContext sync with _type: 'condition')
    if (parsed._type === 'condition' && parsed.name) {
      const name = String(parsed.name);
      const dedupRaw = `cond:${name}`;
      const hash = crypto.createHash('md5').update(dedupRaw).digest('hex');
      result.push({
        id: `${r.id}-cond-${hash.slice(0, 8)}`,
        name,
        status: (parsed.status as ConditionContext['status']) || 'ACTIVE',
        diagnosedDate: parsed.diagnosedDate ? String(parsed.diagnosedDate) : undefined,
        meta: { ...base, hash, confidence: 0.7 },
      });
      return result;
    }

    // medicalConditions array (structured objects from PatientMemory interface)
    const medConditions = parsed.medicalConditions;
    if (Array.isArray(medConditions)) {
      for (const mc of medConditions) {
        if (mc && typeof mc === 'object') {
          const name = String((mc as Record<string, unknown>).name || '');
          if (!name) continue;
          const dedupRaw = `cond:${name}`;
          const hash = crypto.createHash('md5').update(dedupRaw).digest('hex');
          result.push({
            id: `${r.id}-cond-${hash.slice(0, 8)}`,
            name,
            status:
              ((mc as Record<string, unknown>).status as ConditionContext['status']) || 'ACTIVE',
            diagnosedDate: (mc as Record<string, unknown>).diagnosedDate
              ? String((mc as Record<string, unknown>).diagnosedDate)
              : undefined,
            meta: { ...base, hash, confidence: 0.7 },
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
        // Avoid duplicates from medicalConditions
        if (!result.some((c) => c.meta.hash === hash)) {
          result.push({
            id: `${r.id}-diag-${hash.slice(0, 8)}`,
            name,
            status: 'ACTIVE',
            meta: { ...base, hash, confidence: 0.65 },
          });
        }
      }
    }

    return result;
  }

  private toImportantEvent(
    r: MemorySearchResult,
    text: string,
    base: MetaFields,
  ): ImportantEventContext {
    const hash = crypto.createHash('md5').update(text).digest('hex');
    return {
      id: r.id,
      description: text.length > 500 ? text.slice(0, 500) + '\u2026' : text,
      date: r.createdAt,
      meta: { ...base, hash, confidence: base.confidence || 0.85 },
    };
  }
}
