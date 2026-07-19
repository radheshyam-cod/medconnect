import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MemoryLogger } from '../memory/memory-logger.service';
import { MedicalContext, ContextMetadata } from './dto/medical-context.dto';

export enum ContextSyncEventType {
  FACT_VALIDATED = 'fact_validated',
  MEDICAL_RECORD_CONFIRMED = 'medical_record_confirmed',
}

export interface ContextSyncEvent {
  userId: string;
  eventType: ContextSyncEventType;
  data: Partial<MedicalContext>;
  timestamp?: string;
}

/** Result of the sync gate validation. */
export interface SyncGateResult {
  /** Items that passed the gate and will be synced. */
  passed: Partial<MedicalContext>;
  /** Number of items filtered out. */
  filtered: number;
  /** Human-readable list of why items were filtered. */
  reasons: string[];
  /** Whether any items remain after filtering. */
  hasData: boolean;
}

// ─── Sync gate validation rules ───────────────────────────────────

/** Minimum confidence score for a fact to be synced. */
const MIN_SYNC_CONFIDENCE = 0.8;

/** Source values that should NOT be synced (raw/unprocessed data). */
const BLOCKED_SOURCE_PATTERNS = ['ocr_raw', 'ocr-raw', 'raw_ocr'];

/**
 * Status value that indicates a fully processed extraction.
 * Entities whose extraction pipeline hasn't completed should NOT be synced.
 *
 * NOTE: MedicalContext entities from PostgreSQL and confirmed providers
 * carry the default empty status and pass through. Entities from the
 * extraction pipeline should explicitly set this to 'COMPLETED'.
 */
const VALID_EXTRACTION_STATUS = 'COMPLETED';

@Injectable()
export class ContextSynchronizer {
  private readonly logger = new Logger(ContextSynchronizer.name);

  constructor(
    @InjectQueue('ai-context') private readonly contextQueue: Queue,
    private readonly memoryLogger: MemoryLogger,
  ) {}

  /**
   * Validate a Partial<MedicalContext> against the sync gate rules.
   *
   * Rules:
   *   1. Each entity's meta.confidence >= 0.8
   *   2. Each entity's meta.source NONE of: ocr_raw, ocr-raw, raw_ocr
   *   3. Never sync: empty meta, missing meta, or meta without hash
   *
   * These rules prevent raw OCR text, unprocessed extractions, and
   * low-confidence data from polluting external context providers.
   */
  validateForSync(data: Partial<MedicalContext>): SyncGateResult {
    const reasons: string[] = [];
    let totalIn = 0;
    let totalOut = 0;

    // Helper: check a single entity against gate rules.
    // Returns true if the entity PASSES the gate.
    const passesGate = (entity: { meta?: ContextMetadata }, label: string): boolean => {
      totalIn++;
      const meta = entity?.meta;
      if (!meta) {
        reasons.push(`${label}: missing meta`);
        totalOut++;
        return false;
      }
      if (!meta.hash) {
        reasons.push(`${label} (${meta.source}): missing hash`);
        totalOut++;
        return false;
      }
      if (meta.confidence < MIN_SYNC_CONFIDENCE) {
        reasons.push(`${label} (${meta.source}): confidence ${meta.confidence} < ${MIN_SYNC_CONFIDENCE}`);
        totalOut++;
        return false;
      }
      if (BLOCKED_SOURCE_PATTERNS.includes(meta.source.toLowerCase())) {
        reasons.push(`${label}: blocked source '${meta.source}'`);
        totalOut++;
        return false;
      }

      // Check extraction status if present on the entity or metadata.
      // Entities from PostgreSQL / confirmed providers won't have extraction
      // status — they pass through. Entities from the extraction pipeline
      // should carry a status field indicating the document processing state.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const extractionStatus: string | undefined = (entity as any)['extractionStatus'] ?? (meta as any)['extractionStatus'];
      if (extractionStatus && extractionStatus !== VALID_EXTRACTION_STATUS) {
        reasons.push(`${label}: extraction status '${extractionStatus}' !== '${VALID_EXTRACTION_STATUS}'`);
        totalOut++;
        return false;
      }

      return true;
    };

    const passed: Partial<MedicalContext> = {};

    if (data.conditions) {
      const filtered = data.conditions.filter((c) => passesGate(c, `condition:${c.name || c.id}`));
      if (filtered.length > 0) passed.conditions = filtered;
    }

    if (data.medications) {
      const filtered = data.medications.filter((m) => passesGate(m, `medication:${m.name || m.id}`));
      if (filtered.length > 0) passed.medications = filtered;
    }

    if (data.labs) {
      const filtered = data.labs.filter((l) => passesGate(l, `lab:${l.testName || l.id}`));
      if (filtered.length > 0) passed.labs = filtered;
    }

    if (data.timeline) {
      const filtered = data.timeline.filter((t) => passesGate(t, `timeline:${t.title || t.id}`));
      if (filtered.length > 0) passed.timeline = filtered;
    }

    if (data.importantEvents) {
      const filtered = data.importantEvents.filter((e) => passesGate(e, `event:${(e.description || e.id).slice(0, 40)}`));
      if (filtered.length > 0) passed.importantEvents = filtered;
    }

    if (data.patient) {
      // Patient profile always passes the gate (it's the source of truth)
      passed.patient = data.patient;
    }

    // Log gate summary
    if (totalOut > 0) {
      this.logger.log(
        `[SyncGate] Filtered ${totalOut}/${totalIn} items ` +
        `(${passed.conditions?.length || 0} conditions, ${passed.medications?.length || 0} medications, ` +
        `${passed.labs?.length || 0} labs, ${passed.timeline?.length || 0} timeline items passed)`,
      );
    }

    return {
      passed,
      filtered: totalOut,
      reasons,
      hasData:
        (passed.conditions?.length ?? 0) > 0 ||
        (passed.medications?.length ?? 0) > 0 ||
        (passed.labs?.length ?? 0) > 0 ||
        (passed.timeline?.length ?? 0) > 0 ||
        (passed.importantEvents?.length ?? 0) > 0 ||
        !!passed.patient,
    };
  }

  /**
   * Public entry point: validates data through the sync gate first.
   * Only items that pass the gate are queued for provider sync.
   *
   * Returns the SyncGateResult so callers can see what was filtered.
   */
  onFactValidated(userId: string, data: Partial<MedicalContext>): SyncGateResult {
    const gateResult = this.validateForSync(data);

    if (gateResult.hasData) {
      this.triggerSync({
        userId,
        eventType: ContextSyncEventType.FACT_VALIDATED,
        data: gateResult.passed,
      });
    } else {
      this.logger.warn(
        `[SyncGate] onFactValidated for user ${userId?.slice(0, 8)}: ALL items filtered (${gateResult.filtered} removed). Nothing to sync.`,
      );
    }

    return gateResult;
  }

  /**
   * Public entry point for confirmed medical records.
   * Same gate logic applies.
   */
  onMedicalRecordConfirmed(userId: string, data: Partial<MedicalContext>): SyncGateResult {
    const gateResult = this.validateForSync(data);

    if (gateResult.hasData) {
      this.triggerSync({
        userId,
        eventType: ContextSyncEventType.MEDICAL_RECORD_CONFIRMED,
        data: gateResult.passed,
      });
    } else {
      this.logger.warn(
        `[SyncGate] onMedicalRecordConfirmed for user ${userId?.slice(0, 8)}: ALL items filtered (${gateResult.filtered} removed). Nothing to sync.`,
      );
    }

    return gateResult;
  }

  /**
   * Fire-and-forget: triggers context sync without blocking the caller.
   * Only called internally after the sync gate has validated the data.
   */
  private triggerSync(event: ContextSyncEvent): void {
    this.contextQueue.add(
      'sync-context',
      {
        userId: event.userId,
        eventType: event.eventType,
        data: event.data,
        timestamp: event.timestamp || new Date().toISOString(),
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    ).then(() => {
      this.memoryLogger.debug('CONTEXT_SYNC_TRIGGERED', {
        eventType: event.eventType,
        userId: event.userId?.substring(0, 8),
      });
    }).catch((error) => {
      this.memoryLogger.error('CONTEXT_SYNC_TRIGGER_FAILED', error as Error, {
        eventType: event.eventType,
      });
    });
  }
}
