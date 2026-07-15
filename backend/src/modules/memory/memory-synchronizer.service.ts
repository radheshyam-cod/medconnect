import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MemoryLogger } from './memory-logger.service';
import { MemoryEventType, MemorySyncEvent } from './interfaces/memory.interface';

@Injectable()
export class MemorySynchronizer {
  constructor(
    @InjectQueue('memory') private readonly memoryQueue: Queue,
    private readonly memoryLogger: MemoryLogger,
  ) {}

  /**
   * Fire-and-forget: triggers memory sync without blocking the caller.
   * Errors are caught and logged - never propagate to HTTP response layer.
   */
  triggerSync(event: MemorySyncEvent): void {
    this.memoryQueue.add(
      'sync-memory',
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
      this.memoryLogger.debug('SYNC_TRIGGERED', {
        eventType: event.eventType,
        userId: event.userId?.substring(0, 8),
      });
    }).catch((error) => {
      this.memoryLogger.error('SYNC_TRIGGER_FAILED', error as Error, {
        eventType: event.eventType,
      });
    });
  }

  onDocumentUploaded(userId: string, documentId: string, fileName: string): void {
    this.triggerSync({
      userId,
      eventType: MemoryEventType.DOCUMENT_UPLOADED,
      data: { documentId, fileName },
    });
  }

  onOcrCompleted(userId: string, documentId: string, extractionId: string): void {
    this.triggerSync({
      userId,
      eventType: MemoryEventType.OCR_COMPLETED,
      data: { documentId, extractionId },
    });
  }

  onExtractionCompleted(userId: string, extractionId: string, extractedData: Record<string, any>): void {
    this.triggerSync({
      userId,
      eventType: MemoryEventType.EXTRACTION_COMPLETED,
      data: { extractionId, extractedData },
    });
  }

  onMedicationCreated(userId: string, medication: Record<string, any>): void {
    this.triggerSync({
      userId,
      eventType: MemoryEventType.MEDICATION_CREATED,
      data: { medication },
    });
  }

  onMedicationUpdated(userId: string, medication: Record<string, any>): void {
    this.triggerSync({
      userId,
      eventType: MemoryEventType.MEDICATION_UPDATED,
      data: { medication },
    });
  }

  onMedicationDeleted(userId: string, medicationId: string, medicationName: string): void {
    this.triggerSync({
      userId,
      eventType: MemoryEventType.MEDICATION_DELETED,
      data: { medicationId, medicationName },
    });
  }

  onLabCreated(userId: string, labResult: Record<string, any>): void {
    this.triggerSync({
      userId,
      eventType: MemoryEventType.LAB_CREATED,
      data: { labResult },
    });
  }

  onLabUpdated(userId: string, labResult: Record<string, any>): void {
    this.triggerSync({
      userId,
      eventType: MemoryEventType.LAB_UPDATED,
      data: { labResult },
    });
  }

  onTimelineCreated(userId: string, event: Record<string, any>): void {
    this.triggerSync({
      userId,
      eventType: MemoryEventType.TIMELINE_CREATED,
      data: { event },
    });
  }

  onSummaryGenerated(userId: string, summary: Record<string, any>): void {
    this.triggerSync({
      userId,
      eventType: MemoryEventType.SUMMARY_GENERATED,
      data: { summary },
    });
  }

  onFhirImported(userId: string, importData: Record<string, any>): void {
    this.triggerSync({
      userId,
      eventType: MemoryEventType.FHIR_IMPORTED,
      data: { importData },
    });
  }

  onManualCorrection(userId: string, entityType: string, entityId: string, changes: Record<string, any>): void {
    this.triggerSync({
      userId,
      eventType: MemoryEventType.MANUAL_CORRECTION,
      data: { entityType, entityId, changes },
    });
  }
}
