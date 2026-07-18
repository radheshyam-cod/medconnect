import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MemoryLogger } from '../memory/memory-logger.service';
import { MedicalContext } from './dto/medical-context.dto';

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

@Injectable()
export class ContextSynchronizer {
  constructor(
    @InjectQueue('ai-context') private readonly contextQueue: Queue,
    private readonly memoryLogger: MemoryLogger,
  ) {}

  /**
   * Fire-and-forget: triggers context sync without blocking the caller.
   * Only validated facts should be synced.
   */
  triggerSync(event: ContextSyncEvent): void {
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

  onFactValidated(userId: string, data: Partial<MedicalContext>): void {
    this.triggerSync({
      userId,
      eventType: ContextSyncEventType.FACT_VALIDATED,
      data,
    });
  }

  onMedicalRecordConfirmed(userId: string, data: Partial<MedicalContext>): void {
    this.triggerSync({
      userId,
      eventType: ContextSyncEventType.MEDICAL_RECORD_CONFIRMED,
      data,
    });
  }
}
