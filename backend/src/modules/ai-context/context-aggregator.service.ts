import { Injectable, Logger } from '@nestjs/common';
import {
  MedicalContext,
  ContextMetadata,
  ConditionContext,
  MedicationContext,
  LabContext,
  TimelineContext,
  ImportantEventContext,
  PatientProfileContext,
} from './dto/medical-context.dto';
import { ProviderRegistry } from './providers/provider-registry.service';
import { ContextHealthService } from './providers/context-health.service';
import { PrismaService } from '../database/prisma.service';
import { MemorySanitizer } from '../memory/memory-sanitizer.service';
import { PromptBuilder } from './prompt-builder.service';
import type { ProviderContext } from './providers/context-provider.interface';
import crypto from 'crypto';

// ─── Constants ───────────────────────────────────────────────────────

/** Maximum total tokens for the merged context before compression. */
const MAX_CONTEXT_TOKENS = 30_000;

/** Default confidence when a PostgreSQL entity has no explicit confidence. */
const POSTGRES_DEFAULT_CONFIDENCE = 0.95;

/** Source-reliability weights used in confidence scoring. */
const SOURCE_WEIGHTS: Record<string, number> = {
  PostgreSQL: 0.2,
  Mem0: 0.1,
  Alchemyst: 0.0, // provisional — revisit after Phase 3 live-data verification
};

/** Agreement bonus when two or more non-PostgreSQL sources share a dedup hash. */
const AGREEMENT_BONUS = 0.15;

/** Recency bonuses (applied on top of base confidence). */
const RECENCY_BONUS_7_DAYS = 0.05;
const RECENCY_BONUS_30_DAYS = 0.02;

/** Minimum confidence threshold for including an item in the final context. */
const MIN_CONFIDENCE_THRESHOLD = 0.3;

/**
 * Internal fact record used during the pipeline.
 * Every piece of medical data flowing through the pipeline carries
 * a dedup hash, a source label, and a resolved confidence score.
 */
interface FactRecord {
  /** Entity type discriminator. */
  type: 'condition' | 'medication' | 'lab' | 'timeline' | 'event';
  /** The actual entity object. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item: any;
  /** Dedup key — MD5 hash of canonical fields for this entity type. */
  dedupHash: string;
  /** Human-readable source name (e.g. 'PostgreSQL', 'Mem0', 'Alchemyst'). */
  source: string;
  /** The confidence value carried from the provider or assigned to PostgreSQL. */
  baseConfidence: number;
  /** Resolved confidence after applying bonuses. */
  finalConfidence: number;
  /** ISO timestamp used for recency bonus and tie-breaking. */
  timestamp: string;
  /** Relevance score to the current query (0-1). */
  relevanceScore: number;
}

@Injectable()
export class ContextAggregator {
  private readonly logger = new Logger(ContextAggregator.name);

  constructor(
    private readonly providerRegistry: ProviderRegistry,
    private readonly healthService: ContextHealthService,
    private readonly prisma: PrismaService,
    private readonly sanitizer: MemorySanitizer,
    private readonly promptBuilder: PromptBuilder,
  ) {}

  /**
   * Full context aggregation pipeline.
   *
   * (a) PostgreSQL query (source of truth)
   * (b) Query all registered providers in parallel
   * (c) Merge results into a common schema
   * (d) Deduplicate by canonical dedup hash
   * (e) Resolve conflicts: PostgreSQL > any provider; higher confidence; most recent
   * (f) Calculate confidence scores (source + agreement + recency)
   * (g) Normalize medical entities (MemorySanitizer)
   * (h) Rank by relevance to the current query
   * (i) Compress to fit MAX_CONTEXT_TOKENS budget
   * (j) Return MedicalContext
   */
  async aggregateContext(userId: string, query: string): Promise<MedicalContext> {
    const startTime = Date.now();

    // ── Step (a): PostgreSQL query (source of truth) ────────────
    const postgresData = await this.queryPostgreSQL(userId);

    // ── Step (b): Query all registered providers in parallel ──
    const providers = this.providerRegistry.getProviders();
    const providerPromises = providers.map(async (provider) => {
      const providerStartTime = Date.now();
      try {
        const result: ProviderContext = await provider.retrieveContext({ userId, query });
        const latencyMs = Date.now() - providerStartTime;
        this.healthService.recordSuccess(provider.name, latencyMs);
        return result;
      } catch (error) {
        const latencyMs = Date.now() - providerStartTime;
        this.healthService.recordFailure(provider.name, error as Error);
        this.healthService.recordLatency(provider.name, latencyMs);
        this.logger.warn(
          `[ContextAggregator] Provider ${provider.name} threw (${(error as Error).message}), returning empty.`,
        );
        return { source: provider.name, version: provider.version, data: {} } as ProviderContext;
      }
    });

    const providerResults = await Promise.all(providerPromises);

    // ── Step (c): Merge all results into a flat fact list ─────
    const allFacts = this.collectFacts(
      postgresData,
      providerResults,
    );

    // ── Step (d + e): Deduplicate + resolve conflicts ─────────
    const dedupedFacts = this.deduplicateAndResolve(allFacts);

    // ── Step (f): Confidence scoring ──────────────────────────
    const scoredFacts = this.calculateConfidence(dedupedFacts);

    // ── Step (g): Normalize entities ─────────────────────────
    const normalizedFacts = this.normalizeEntities(scoredFacts);

    // ── Step (h): Rank by relevance ───────────────────────────
    const rankedFacts = this.rankByRelevance(normalizedFacts, query);

    // ── Step (i): Compress to token budget ────────────────────
    const compressed = this.compressToBudget(rankedFacts);

    // ── Step (j): Build and return MedicalContext ─────────
    const result = this.buildMedicalContext(compressed);

    // Restore patient profile from PostgreSQL (not tracked through fact pipeline)
    result.patient = postgresData.patient ?? null;

    this.logger.debug(
      `Aggregated context for user ${userId} in ${Date.now() - startTime}ms ` +
      `(PG: ${(postgresData.conditions ?? []).length + (postgresData.medications ?? []).length + (postgresData.labs ?? []).length + (postgresData.timeline ?? []).length} facts, ` +
      `providers: ${providerResults.length}, ` +
      `output: ${result.conditions.length + result.medications.length + result.labs.length + result.timeline.length + result.importantEvents.length} items)`,
    );

    return result;
  }

  // ────────────────────────────────────────────────────────────────
  //  Step (a): PostgreSQL query
  // ────────────────────────────────────────────────────────────────

  /**
   * Query PostgreSQL — the authoritative source of truth — for all
   * confirmed medical records belonging to this user.
   *
   * Each entity is tagged with `source: 'PostgreSQL'` and a stable
   * dedup hash, so it can participate in the cross-provider merge pipeline.
   */
  private async queryPostgreSQL(userId: string): Promise<Partial<MedicalContext>> {
    const now = new Date().toISOString();

    // Fetch medications
    const medications = await this.prisma.medication.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    const medContexts: MedicationContext[] = medications.map((m) => {
      const dedupRaw = `med:${m.name}:${m.dosage || ''}:${m.isActive}`;
      const hash = crypto.createHash('md5').update(dedupRaw).digest('hex');
      return {
        id: m.id,
        name: m.name,
        dosage: m.dosage ?? undefined,
        frequency: m.frequency ?? undefined,
        isActive: m.isActive,
        meta: {
          version: '1.0.0',
          source: 'PostgreSQL',
          timestamp: (m.updatedAt || m.createdAt).toISOString(),
          confidence: POSTGRES_DEFAULT_CONFIDENCE,
          hash,
        },
      };
    });

    // Fetch lab results
    const labs = await this.prisma.labResult.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });

    const labContexts: LabContext[] = labs.map((l) => {
      const dateStr = l.date.toISOString().split('T')[0];
      const dedupRaw = `lab:${l.testName}:${l.value}:${dateStr}`;
      const hash = crypto.createHash('md5').update(dedupRaw).digest('hex');
      return {
        id: l.id,
        testName: l.testName,
        value: l.value,
        unit: l.unit ?? undefined,
        isAbnormal: l.isAbnormal,
        date: l.date.toISOString().split('T')[0],
        meta: {
          version: '1.0.0',
          source: 'PostgreSQL',
          timestamp: (l.updatedAt || l.createdAt).toISOString(),
          confidence: POSTGRES_DEFAULT_CONFIDENCE,
          hash,
        },
      };
    });

    // Fetch timeline events
    const timelines = await this.prisma.timeline.findMany({
      where: { userId },
      orderBy: { eventDate: 'desc' },
    });

    const timelineContexts: TimelineContext[] = timelines.map((t) => {
      const dateStr = t.eventDate.toISOString().split('T')[0];
      const dedupRaw = `tl:${t.eventType}:${t.title}:${dateStr}`;
      const hash = crypto.createHash('md5').update(dedupRaw).digest('hex');
      return {
        id: t.id,
        eventType: t.eventType,
        title: t.title,
        description: t.description ?? undefined,
        date: dateStr,
        meta: {
          version: '1.0.0',
          source: 'PostgreSQL',
          timestamp: (t.updatedAt || t.createdAt).toISOString(),
          confidence: POSTGRES_DEFAULT_CONFIDENCE,
          hash,
        },
      };
    });

    // Fetch patient profile
    const profile = await this.prisma.patientProfile.findUnique({
      where: { userId },
    });

    let patientContext: PatientProfileContext | null = null;
    if (profile) {
      const hash = crypto.createHash('md5').update(`patient:${userId}`).digest('hex');
      patientContext = {
        id: profile.id,
        age: profile.dateOfBirth
          ? Math.floor((Date.now() - profile.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : undefined,
        gender: profile.gender ?? undefined,
        bloodGroup: profile.bloodGroup ?? undefined,
        allergies: profile.allergies,
        meta: {
          version: '1.0.0',
          source: 'PostgreSQL',
          timestamp: now,
          confidence: POSTGRES_DEFAULT_CONFIDENCE,
          hash,
        },
      };
    }

    return {
      patient: patientContext,
      conditions: [], // Conditions are derived from extractions, not stored as a first-class table yet
      medications: medContexts,
      labs: labContexts,
      timeline: timelineContexts,
      riskFactors: [],
      importantEvents: [],
    };
  }

  // ────────────────────────────────────────────────────────────────
  //  Step (c): Collect facts into a unified list
  // ────────────────────────────────────────────────────────────────

  /**
   * Flatten PostgreSQL data and all provider results into a single
   * array of FactRecords, tagged with source and dedup hash.
   */
  private collectFacts(
    pg: Partial<MedicalContext>,
    providers: ProviderContext[],
  ): FactRecord[] {
    const facts: FactRecord[] = [];

    // PostgreSQL facts
    this.pushFacts(facts, 'condition', pg.conditions ?? []);
    this.pushFacts(facts, 'medication', pg.medications ?? []);
    this.pushFacts(facts, 'lab', pg.labs ?? []);
    this.pushFacts(facts, 'timeline', pg.timeline ?? []);
    this.pushFacts(facts, 'event', pg.importantEvents ?? []);

    // Provider facts
    for (const pc of providers) {
      const ctx = pc.data;
      if (!ctx) continue;
      this.pushFacts(facts, 'condition', ctx.conditions ?? []);
      this.pushFacts(facts, 'medication', ctx.medications ?? []);
      this.pushFacts(facts, 'lab', ctx.labs ?? []);
      this.pushFacts(facts, 'timeline', ctx.timeline ?? []);
      this.pushFacts(facts, 'event', ctx.importantEvents ?? []);
    }

    return facts;
  }

  /** Helper: push entities of one type into the fact list. */
  private pushFacts(
    facts: FactRecord[],
    type: FactRecord['type'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: any[],
  ): void {
    for (const item of items) {
      if (!item || !item.meta) continue;
      const meta = item.meta as ContextMetadata;
      facts.push({
        type,
        item,
        dedupHash: meta.hash || '',
        source: meta.source || 'unknown',
        baseConfidence: meta.confidence ?? 0.5,
        finalConfidence: meta.confidence ?? 0.5,
        timestamp: meta.timestamp || new Date().toISOString(),
        relevanceScore: 0,
      });
    }
  }

  // ────────────────────────────────────────────────────────────────
  //  Steps (d + e): Deduplicate + resolve conflicts
  // ────────────────────────────────────────────────────────────────

  /**
   * Deduplicate facts by their `dedupHash`.
   *
   * Conflict resolution rules (applied per hash group):
   *   1. PostgreSQL always wins over any provider (source of truth).
   *   2. Between providers, higher confidence score wins.
   *   3. Ties default to the most recent `timestamp`.
   *   4. @provisional Alchemyst-tiebreaker — when Mem0 and Alchemyst
   *      have identical confidence AND identical timestamp, Mem0 wins
   *      by default. This is an untested prior — reassess after
   *      Phase 3 live-data verification.
   */
  private deduplicateAndResolve(facts: FactRecord[]): FactRecord[] {
    const groups = new Map<string, FactRecord[]>();

    for (const fact of facts) {
      if (!fact.dedupHash) continue;
      const existing = groups.get(fact.dedupHash);
      if (existing) {
        existing.push(fact);
      } else {
        groups.set(fact.dedupHash, [fact]);
      }
    }

    const resolved: FactRecord[] = [];

    for (const [, group] of groups) {
      // Sort group by precedence: PostgreSQL first, then higher confidence, then more recent
      group.sort((a, b) => {
        // PostgreSQL always wins
        if (a.source === 'PostgreSQL' && b.source !== 'PostgreSQL') return -1;
        if (b.source === 'PostgreSQL' && a.source !== 'PostgreSQL') return 1;

        // Higher confidence wins
        if (a.baseConfidence !== b.baseConfidence) {
          return b.baseConfidence - a.baseConfidence;
        }

        // @provisional Alchemyst-tiebreaker: if both are providers with same confidence,
        // Mem0 wins over Alchemyst
        if (
          a.source === 'Mem0' && b.source === 'Alchemyst' ||
          a.source === 'Alchemyst' && b.source === 'Mem0'
        ) {
          return a.source === 'Mem0' ? -1 : 1;
        }

        // Most recent timestamp wins
        return b.timestamp.localeCompare(a.timestamp);
      });

      resolved.push(group[0]);
    }

    // Also keep facts that didn't have a hash (edge case)
    const unhashed = facts.filter((f) => !f.dedupHash);
    resolved.push(...unhashed);

    return resolved;
  }

  // ────────────────────────────────────────────────────────────────
  //  Step (f): Confidence scoring
  // ────────────────────────────────────────────────────────────────

  /**
   * Calculate final confidence for each fact.
   *
   * Formula:
   *   finalConfidence = clamp(baseConfidence + sourceBonus + agreementBonus + recencyBonus, 0, 1)
   *
   * Where:
   *   sourceBonus: PostgreSQL=+0.2, Mem0=+0.1, Alchemyst=+0.0
   *   agreementBonus: +0.15 if the same dedupHash appears in 2+ non-PostgreSQL sources
   *   recencyBonus: +0.05 if <7 days old, +0.02 if <30 days old
   *
   * NOTE: With only 2 non-PostgreSQL providers (Mem0, Alchemyst), the max
   * agreeing providers is 2, so only the "2+" branch of agreementBonus applies.
   * TODO[providers>2]: Add a graduated tier (e.g. 3+ → +0.25) when a third
   * non-PostgreSQL provider is registered.
   */
  private calculateConfidence(facts: FactRecord[]): FactRecord[] {
    // Build a set of dedupHashes that appear in multiple non-PostgreSQL sources
    const providerHashCounts = new Map<string, Set<string>>();
    for (const fact of facts) {
      if (fact.source === 'PostgreSQL') continue;
      if (!fact.dedupHash) continue;
      if (!providerHashCounts.has(fact.dedupHash)) {
        providerHashCounts.set(fact.dedupHash, new Set());
      }
      providerHashCounts.get(fact.dedupHash)!.add(fact.source);
    }

    const agreedHashes = new Set<string>();
    for (const [hash, sources] of providerHashCounts) {
      if (sources.size >= 2) {
        agreedHashes.add(hash);
        this.logger.debug(
          `[Confidence] Agreement detected on hash ${hash.slice(0, 12)} across [${[...sources].join(', ')}]`,
        );
      }
    }

    return facts.map((fact) => {
      const now = Date.now();
      const factTime = new Date(fact.timestamp).getTime();
      const ageMs = now - factTime;

      // Source bonus
      const sourceBonus = SOURCE_WEIGHTS[fact.source] ?? 0.0;

      // Agreement bonus
      const agreementBonus = agreedHashes.has(fact.dedupHash) ? AGREEMENT_BONUS : 0;

      // Recency bonus
      let recencyBonus = 0;
      if (ageMs < 7 * 24 * 60 * 60 * 1000) {
        recencyBonus = RECENCY_BONUS_7_DAYS;
      } else if (ageMs < 30 * 24 * 60 * 60 * 1000) {
        recencyBonus = RECENCY_BONUS_30_DAYS;
      }

      let finalConfidence = fact.baseConfidence + sourceBonus + agreementBonus + recencyBonus;
      finalConfidence = Math.max(0, Math.min(1, finalConfidence));

      return { ...fact, finalConfidence };
    });
  }

  // ────────────────────────────────────────────────────────────────
  //  Step (g): Normalize entities
  // ────────────────────────────────────────────────────────────────

  /**
   * Normalize medical entities using MemorySanitizer's normalization methods.
   *
   * - Medication names: normalizeMedicineName()
   * - Medical terms (conditions, allergies, etc.): normalizeMedicalTerm()
   * - Lab units: normalizeUnit()
   * - Dates: normalizeDate()
   * - Names (doctors, hospitals): normalizeName()
   *
   * Also applies a simple canonicalization map for well-known name variants.
   */
  private normalizeEntities(facts: FactRecord[]): FactRecord[] {
    return facts.map((fact) => {
      const item = fact.item;

      switch (fact.type) {
        case 'medication': {
          const med = item as MedicationContext;
          return {
            ...fact,
            item: {
              ...med,
              name: this.sanitizer.normalizeMedicineName(med.name),
            },
          };
        }

        case 'condition': {
          const cond = item as ConditionContext;
          return {
            ...fact,
            item: {
              ...cond,
              name: this.sanitizer.normalizeMedicalTerm(cond.name),
            },
          };
        }

        case 'lab': {
          const lab = item as LabContext;
          return {
            ...fact,
            item: {
              ...lab,
              testName: this.sanitizer.normalizeMedicalTerm(lab.testName),
              unit: lab.unit ? this.sanitizer.normalizeUnit(lab.unit) : undefined,
              date: this.sanitizer.normalizeDate(lab.date),
            },
          };
        }

        case 'timeline': {
          const tl = item as TimelineContext;
          return {
            ...fact,
            item: {
              ...tl,
              title: this.sanitizer.normalizeMedicalTerm(tl.title),
              date: this.sanitizer.normalizeDate(tl.date),
              description: tl.description
                ? this.sanitizer.normalizeMedicalTerm(tl.description)
                : undefined,
            },
          };
        }

        default:
          return fact;
      }
    });
  }

  // ────────────────────────────────────────────────────────────────
  //  Step (h): Rank by relevance
  // ────────────────────────────────────────────────────────────────

  /**
   * Score each fact's relevance to the current query using simple
   * text matching, then sort by (finalConfidence * relevance) descending.
   *
   * Relevance factors:
   *   - Direct name/title match with query words → +0.3 per match
   *   - Type match (e.g. query mentions 'medication' → boost medications) → +0.2
   *   - Base relevance = 0.5 for all items
   *
   * Final rank = (finalConfidence * 0.7 + relevanceScore * 0.3)
   */
  private rankByRelevance(facts: FactRecord[], query: string): FactRecord[] {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(Boolean);

    for (const fact of facts) {
      let score = 0.5; // base relevance

      // Text matching against relevant fields
      const textFields = this.getSearchableText(fact).toLowerCase();
      for (const word of queryWords) {
        if (word.length < 2) continue;
        if (textFields.includes(word)) {
          score += 0.3;
        }
      }

      // Type match
      const typeKeywords = this.getTypeKeywords(fact.type);
      for (const word of queryWords) {
        if (typeKeywords.includes(word)) {
          score += 0.2;
          break;
        }
      }

      fact.relevanceScore = Math.min(1, score);
    }

    // Sort by composite rank score descending
    return facts.sort((a, b) => {
      const rankA = a.finalConfidence * 0.7 + a.relevanceScore * 0.3;
      const rankB = b.finalConfidence * 0.7 + b.relevanceScore * 0.3;
      return rankB - rankA;
    });
  }

  /** Get a flat string of all searchable fields for a fact. */
  private getSearchableText(fact: FactRecord): string {
    const item = fact.item;
    switch (fact.type) {
      case 'medication':
        return `${(item as MedicationContext).name} ${(item as MedicationContext).dosage || ''} ${(item as MedicationContext).frequency || ''}`;
      case 'condition':
        return `${(item as ConditionContext).name}`;
      case 'lab':
        return `${(item as LabContext).testName} ${(item as LabContext).value} ${(item as LabContext).unit || ''}`;
      case 'timeline':
        return `${(item as TimelineContext).title} ${(item as TimelineContext).description || ''} ${(item as TimelineContext).eventType}`;
      case 'event':
        return `${(item as ImportantEventContext).description || ''}`;
      default:
        return '';
    }
  }

  /** Get relevant type keywords for a given fact type. */
  private getTypeKeywords(type: FactRecord['type']): string[] {
    const map: Record<string, string[]> = {
      condition: ['condition', 'disease', 'diagnosis', 'illness', 'chronic', 'disorder'],
      medication: ['medication', 'medicine', 'drug', 'prescription', 'pill', 'dosage', 'med'],
      lab: ['lab', 'test', 'blood', 'result', 'value', 'panel', 'biomarker'],
      timeline: ['timeline', 'event', 'visit', 'appointment', 'history', 'surgery', 'procedure'],
      event: ['event', 'note', 'important', 'summary', 'fact', 'alert'],
    };
    return map[type] ?? [];
  }

  // ────────────────────────────────────────────────────────────────
  //  Step (i): Compress to token budget
  // ────────────────────────────────────────────────────────────────

  /**
   * Compress the fact list to fit within MAX_CONTEXT_TOKENS.
   *
   * Strategy:
   *   1. Estimate token count of the full MedicalContext serialization.
   *   2. If under budget, return as-is.
   *   3. If over budget, remove items with finalConfidence < MIN_CONFIDENCE_THRESHOLD.
   *   4. If still over budget, remove lowest-ranked items (from the end of the sorted list)
   *      until under budget.
   *   5. If all items have confidence >= threshold and we're still over budget,
   *      trim the lowest-ranked items from the tail (they're already sorted by rank descending).
   */
  private compressToBudget(facts: FactRecord[]): FactRecord[] {
    // Helper: estimate token count for a subset of facts
    const estimateTokens = (subset: FactRecord[]): number => {
      const placeholder = this.buildMedicalContext(subset);
      return this.promptBuilder.estimateTokenCount(JSON.stringify(placeholder));
    };

    let current = [...facts];
    let estimated = estimateTokens(current);

    if (estimated <= MAX_CONTEXT_TOKENS) {
      return current;
    }

    this.logger.debug(
      `[Compress] Full context ~${estimated} tokens (budget: ${MAX_CONTEXT_TOKENS}). Applying compression.`,
    );

    // Pass 1: Remove low-confidence items
    const pass1 = current.filter((f) => f.finalConfidence >= MIN_CONFIDENCE_THRESHOLD);
    if (pass1.length < current.length) {
      current = pass1;
      estimated = estimateTokens(current);
      this.logger.debug(
        `[Compress] After removing low-confidence (< ${MIN_CONFIDENCE_THRESHOLD}): ~${estimated} tokens, ${current.length} items.`,
      );
      if (estimated <= MAX_CONTEXT_TOKENS) return current;
    }

    // Pass 2: Remove lowest-ranked items from the tail until under budget
    // (items are already sorted by rank descending from Step h)
    while (current.length > 0 && estimateTokens(current) > MAX_CONTEXT_TOKENS) {
      // Remove the lowest-ranked item (last in sorted array)
      current.pop();
    }

    if (current.length > 0) {
      this.logger.debug(
        `[Compress] After trimming tail: ~${estimateTokens(current)} tokens, ${current.length} items.`,
      );
    } else {
      // Worst case: keep top 10 items to avoid returning completely empty context
      current = facts.slice(0, 10);
      this.logger.warn(
        `[Compress] Aggressive compression: kept top 10 items (~${estimateTokens(current)} tokens).`,
      );
    }

    return current;
  }

  // ────────────────────────────────────────────────────────────────
  //  Step (j): Build MedicalContext
  // ────────────────────────────────────────────────────────────────

  /**
   * Reconstruct a MedicalContext from the final filtered fact list.
   */
  private buildMedicalContext(facts: FactRecord[]): MedicalContext {
    const conditions: ConditionContext[] = [];
    const medications: MedicationContext[] = [];
    const labs: LabContext[] = [];
    const timeline: TimelineContext[] = [];
    const importantEvents: ImportantEventContext[] = [];

    for (const fact of facts) {
      // Update confidence in the item's meta with the final resolved value
      if (fact.item?.meta) {
        fact.item.meta.confidence = fact.finalConfidence;
      }

      switch (fact.type) {
        case 'condition':
          conditions.push(fact.item as ConditionContext);
          break;
        case 'medication':
          medications.push(fact.item as MedicationContext);
          break;
        case 'lab':
          labs.push(fact.item as LabContext);
          break;
        case 'timeline':
          timeline.push(fact.item as TimelineContext);
          break;
        case 'event':
          importantEvents.push(fact.item as ImportantEventContext);
          break;
      }
    }

    return {
      patient: null,
      conditions,
      medications,
      labs,
      timeline,
      riskFactors: [],
      importantEvents,
    };
  }
}
