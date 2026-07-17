import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { MemoryService } from './memory.service';
import { MemoryLogger } from './memory-logger.service';
import { MemoryEventType } from './interfaces/memory.interface';

@Processor('memory')
@Injectable()
export class MemoryProcessor extends WorkerHost {
  private readonly logger = new Logger(MemoryProcessor.name);

  constructor(
    private readonly memoryService: MemoryService,
    private readonly memoryLogger: MemoryLogger,
  ) {
    super();
  }

  async process(job: Job<Record<string, unknown>, unknown, string>): Promise<unknown> {
    this.logger.log(`Processing memory job ${job.id} type: ${job.name}`);

    if (job.name === 'sync-memory') {
      return this.handleSyncMemory(job);
    }

    if (job.name === 'store-extraction') {
      return this.handleStoreExtraction(job);
    }

    if (job.name === 'store-summary') {
      return this.handleStoreSummary(job);
    }

    if (job.name === 'cleanup-memory') {
      return this.handleCleanup(job);
    }

    this.logger.warn(`Unknown job type: ${job.name}`);
  }

  private async handleSyncMemory(job: Job): Promise<boolean> {
    const { userId, eventType, data, timestamp } = job.data;

    this.memoryLogger.log('SYNC_PROCESSING', {
      eventType,
      timestamp,
    });

    try {
      switch (eventType) {
        case MemoryEventType.DOCUMENT_UPLOADED:
          return await this.syncDocumentUpload(userId, data);
        case MemoryEventType.OCR_COMPLETED:
          return await this.syncOcrCompleted(userId, data);
        case MemoryEventType.EXTRACTION_COMPLETED:
          return await this.syncExtraction(userId, data);
        case MemoryEventType.MEDICATION_CREATED:
          return await this.syncMedication(userId, data, 'created');
        case MemoryEventType.MEDICATION_UPDATED:
          return await this.syncMedication(userId, data, 'updated');
        case MemoryEventType.MEDICATION_DELETED:
          return await this.syncMedicationDeleted(userId, data);
        case MemoryEventType.LAB_CREATED:
          return await this.syncLabResult(userId, data, 'created');
        case MemoryEventType.LAB_UPDATED:
          return await this.syncLabResult(userId, data, 'updated');
        case MemoryEventType.TIMELINE_CREATED:
          return await this.syncTimelineEvent(userId, data);
        case MemoryEventType.SUMMARY_GENERATED:
          return await this.syncSummary(userId, data);
        case MemoryEventType.FHIR_IMPORTED:
          return await this.syncFhirImport(userId, data);
        case MemoryEventType.MANUAL_CORRECTION:
          return await this.syncManualCorrection(userId, data);
        default:
          this.logger.warn(`Unhandled event type: ${eventType}`);
          return false;
      }
    } catch (error) {
      this.memoryLogger.error('SYNC_PROCESSING_FAILED', error as Error, { eventType });
      throw error; // Let BullMQ handle retries
    }
  }

  private async handleStoreExtraction(job: Job): Promise<boolean> {
    const { userId, extractionData, source } = job.data;
    return this.memoryService.storeMemory(userId, extractionData, source);
  }

  private async handleStoreSummary(job: Job): Promise<boolean> {
    const { userId, summaryData, source } = job.data;
    return this.memoryService.storeMemory(userId, summaryData, source);
  }

  private async handleCleanup(job: Job): Promise<boolean> {
    const { userId } = job.data;
    return this.memoryService.deleteAllUserData(userId);
  }

  private async syncDocumentUpload(
    userId: string,
    data: Record<string, unknown>,
  ): Promise<boolean> {
    return this.memoryService.addStructuredMemory(
      userId,
      'document_metadata',
      JSON.stringify({
        documentId: data.documentId,
        fileName: data.fileName,
        uploadedAt: new Date().toISOString(),
      }),
      { eventType: 'document_upload' },
    );
  }

  private async syncOcrCompleted(
    userId: string,
    data: Record<string, unknown>,
  ): Promise<boolean> {
    this.memoryLogger.debug('OCR_COMPLETED_SYNC', { extractionId: data.extractionId });
    // The extraction data will be synced separately via extraction_completed
    return true;
  }

  private async syncExtraction(
    userId: string,
    data: Record<string, unknown>,
  ): Promise<boolean> {
    const extractedData = (data.extractedData as Record<string, unknown>) || {};
    const memoryData: Record<string, unknown> = {};

    if (Array.isArray(extractedData.diseases) && extractedData.diseases.length > 0) {
      memoryData.medicalConditions = extractedData.diseases.map((d: string) => ({
        name: d,
        confidence: 0.7,
        source: 'document_extraction',
        lastUpdated: new Date().toISOString(),
      }));
    }

    if (Array.isArray(extractedData.medicines) && extractedData.medicines.length > 0) {
      memoryData.currentMedicines = extractedData.medicines.map((m: string) => ({
        name: m,
        isActive: true,
        source: 'document_extraction',
        lastUpdated: new Date().toISOString(),
      }));
    }

    if (Array.isArray(extractedData.doctors) && extractedData.doctors.length > 0) {
      memoryData.doctors = extractedData.doctors;
    }

    if (Array.isArray(extractedData.hospitals) && extractedData.hospitals.length > 0) {
      memoryData.hospitals = extractedData.hospitals;
    }

    if (Array.isArray(extractedData.labValues) && extractedData.labValues.length > 0) {
      memoryData.labTrends = [
        {
          testName: 'Extracted Lab Values',
          values: extractedData.labValues.map((v: string) => ({
            value: v,
            isAbnormal: false,
            date: new Date().toISOString(),
            source: 'document_extraction',
          })),
        },
      ];
    }

    if (Array.isArray(extractedData.procedures) && extractedData.procedures.length > 0) {
      memoryData.procedures = extractedData.procedures.map((p: string) => ({
        name: p,
        source: 'document_extraction',
      }));
    }

    if (Object.keys(memoryData).length > 0) {
      return this.memoryService.storeMemory(userId, memoryData, 'extraction');
    }

    return true;
  }

  private async syncMedication(
    userId: string,
    data: Record<string, unknown>,
    action: 'created' | 'updated',
  ): Promise<boolean> {
    const medication = data.medication as Record<string, unknown>;
    if (!medication) return false;

    return this.memoryService.addStructuredMemory(
      userId,
      'medication',
      JSON.stringify({
        name: medication.name,
        dosage: medication.dosage,
        frequency: medication.frequency,
        isActive: medication.isActive ?? true,
        action,
        timestamp: new Date().toISOString(),
      }),
      { eventType: `medication_${action}` },
    );
  }

  private async syncMedicationDeleted(
    userId: string,
    data: Record<string, unknown>,
  ): Promise<boolean> {
    return this.memoryService.addStructuredMemory(
      userId,
      'medication',
      JSON.stringify({
        medicationId: data.medicationId,
        name: data.medicationName,
        isActive: false,
        action: 'deleted',
        timestamp: new Date().toISOString(),
      }),
      { eventType: 'medication_deleted' },
    );
  }

  private async syncLabResult(
    userId: string,
    data: Record<string, unknown>,
    action: 'created' | 'updated',
  ): Promise<boolean> {
    const labResult = data.labResult as Record<string, unknown>;
    if (!labResult) return false;

    return this.memoryService.addStructuredMemory(
      userId,
      'lab_result',
      JSON.stringify({
        testName: labResult.testName,
        value: labResult.value,
        unit: labResult.unit,
        isAbnormal: labResult.isAbnormal,
        date: labResult.date,
        action,
        timestamp: new Date().toISOString(),
      }),
      { eventType: `lab_${action}` },
    );
  }

  private async syncTimelineEvent(
    userId: string,
    data: Record<string, unknown>,
  ): Promise<boolean> {
    const event = data.event as Record<string, unknown>;
    if (!event) return false;

    return this.memoryService.addStructuredMemory(
      userId,
      'timeline_event',
      JSON.stringify({
        eventType: event.eventType,
        title: event.title,
        description: event.description,
        date: event.eventDate,
        facility: event.facility,
        doctorName: event.doctorName,
        timestamp: new Date().toISOString(),
      }),
      { eventType: 'timeline_created' },
    );
  }

  private async syncSummary(
    userId: string,
    data: Record<string, unknown>,
  ): Promise<boolean> {
    const summary = data.summary as Record<string, unknown>;
    if (!summary) return false;

    return this.memoryService.storeMemory(userId, summary, 'ai_summary');
  }

  private async syncFhirImport(
    userId: string,
    data: Record<string, unknown>,
  ): Promise<boolean> {
    const importData = (data.importData || data) as Record<string, unknown>;
    return this.memoryService.storeMemory(userId, importData, 'fhir_import');
  }

  private async syncManualCorrection(
    userId: string,
    data: Record<string, unknown>,
  ): Promise<boolean> {
    return this.memoryService.addStructuredMemory(
      userId,
      'manual_correction',
      JSON.stringify({
        entityType: data.entityType,
        entityId: data.entityId,
        changes: data.changes,
        timestamp: new Date().toISOString(),
      }),
      { eventType: 'manual_correction' },
    );
  }
}
