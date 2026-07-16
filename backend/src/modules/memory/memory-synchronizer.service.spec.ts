import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { MemoryLogger } from './memory-logger.service';
import { MemorySynchronizer } from './memory-synchronizer.service';
import { MemoryEventType } from './interfaces/memory.interface';

describe('MemorySynchronizer', () => {
  let synchronizer: MemorySynchronizer;
  let memoryQueue: any;

  beforeEach(async () => {
    memoryQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job_123' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemorySynchronizer,
        {
          provide: getQueueToken('memory'),
          useValue: memoryQueue,
        },
        {
          provide: MemoryLogger,
          useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
        },
      ],
    }).compile();

    synchronizer = module.get<MemorySynchronizer>(MemorySynchronizer);
  });

  it('should be defined', () => {
    expect(synchronizer).toBeDefined();
  });

  describe('onDocumentUploaded', () => {
    it('should enqueue a sync job with DOCUMENT_UPLOADED event', () => {
      synchronizer.onDocumentUploaded('user_123', 'doc_123', 'test.pdf');
      expect(memoryQueue.add).toHaveBeenCalledWith(
        'sync-memory',
        expect.objectContaining({
          userId: 'user_123',
          eventType: MemoryEventType.DOCUMENT_UPLOADED,
          data: expect.objectContaining({
            documentId: 'doc_123',
            fileName: 'test.pdf',
          }),
        }),
        expect.objectContaining({
          attempts: 3,
        }),
      );
    });
  });

  describe('onExtractionCompleted', () => {
    it('should enqueue a sync job with EXTRACTION_COMPLETED event', () => {
      synchronizer.onExtractionCompleted('user_123', 'ext_123', { diseases: ['Diabetes'] });
      expect(memoryQueue.add).toHaveBeenCalledWith(
        'sync-memory',
        expect.objectContaining({
          eventType: MemoryEventType.EXTRACTION_COMPLETED,
          data: expect.objectContaining({
            extractionId: 'ext_123',
            extractedData: { diseases: ['Diabetes'] },
          }),
        }),
        expect.any(Object),
      );
    });
  });

  describe('onMedicationCreated', () => {
    it('should enqueue a sync job with MEDICATION_CREATED event', () => {
      synchronizer.onMedicationCreated('user_123', { name: 'Metformin', dosage: '500mg' });
      expect(memoryQueue.add).toHaveBeenCalledWith(
        'sync-memory',
        expect.objectContaining({
          eventType: MemoryEventType.MEDICATION_CREATED,
          data: expect.objectContaining({
            medication: { name: 'Metformin', dosage: '500mg' },
          }),
        }),
        expect.any(Object),
      );
    });
  });

  describe('onMedicationUpdated', () => {
    it('should enqueue a sync job with MEDICATION_UPDATED event', () => {
      synchronizer.onMedicationUpdated('user_123', { name: 'Metformin', dosage: '1000mg' });
      expect(memoryQueue.add).toHaveBeenCalledWith(
        'sync-memory',
        expect.objectContaining({
          eventType: MemoryEventType.MEDICATION_UPDATED,
        }),
        expect.any(Object),
      );
    });
  });

  describe('onMedicationDeleted', () => {
    it('should enqueue a sync job with MEDICATION_DELETED event', () => {
      synchronizer.onMedicationDeleted('user_123', 'med_123', 'Metformin');
      expect(memoryQueue.add).toHaveBeenCalledWith(
        'sync-memory',
        expect.objectContaining({
          eventType: MemoryEventType.MEDICATION_DELETED,
          data: expect.objectContaining({
            medicationId: 'med_123',
            medicationName: 'Metformin',
          }),
        }),
        expect.any(Object),
      );
    });
  });

  describe('onLabCreated', () => {
    it('should enqueue a sync job with LAB_CREATED event', () => {
      synchronizer.onLabCreated('user_123', { testName: 'Blood Sugar', value: '140' });
      expect(memoryQueue.add).toHaveBeenCalledWith(
        'sync-memory',
        expect.objectContaining({
          eventType: MemoryEventType.LAB_CREATED,
          data: expect.objectContaining({
            labResult: { testName: 'Blood Sugar', value: '140' },
          }),
        }),
        expect.any(Object),
      );
    });
  });

  describe('onLabUpdated', () => {
    it('should enqueue a sync job with LAB_UPDATED event', () => {
      synchronizer.onLabUpdated('user_123', { testName: 'Blood Sugar', value: '150' });
      expect(memoryQueue.add).toHaveBeenCalledWith(
        'sync-memory',
        expect.objectContaining({
          eventType: MemoryEventType.LAB_UPDATED,
        }),
        expect.any(Object),
      );
    });
  });

  describe('onTimelineCreated', () => {
    it('should enqueue a sync job with TIMELINE_CREATED event', () => {
      synchronizer.onTimelineCreated('user_123', { title: 'Checkup', eventType: 'VISIT' });
      expect(memoryQueue.add).toHaveBeenCalledWith(
        'sync-memory',
        expect.objectContaining({
          eventType: MemoryEventType.TIMELINE_CREATED,
          data: expect.objectContaining({
            event: { title: 'Checkup', eventType: 'VISIT' },
          }),
        }),
        expect.any(Object),
      );
    });
  });

  describe('onSummaryGenerated', () => {
    it('should enqueue a sync job with SUMMARY_GENERATED event', () => {
      synchronizer.onSummaryGenerated('user_123', { summary: 'Patient is stable' });
      expect(memoryQueue.add).toHaveBeenCalledWith(
        'sync-memory',
        expect.objectContaining({
          eventType: MemoryEventType.SUMMARY_GENERATED,
          data: expect.objectContaining({
            summary: { summary: 'Patient is stable' },
          }),
        }),
        expect.any(Object),
      );
    });
  });

  describe('onFhirImported', () => {
    it('should enqueue a sync job with FHIR_IMPORTED event', () => {
      synchronizer.onFhirImported('user_123', { resourceType: 'Patient', id: 'pat_123' });
      expect(memoryQueue.add).toHaveBeenCalledWith(
        'sync-memory',
        expect.objectContaining({
          eventType: MemoryEventType.FHIR_IMPORTED,
          data: expect.objectContaining({
            importData: { resourceType: 'Patient', id: 'pat_123' },
          }),
        }),
        expect.any(Object),
      );
    });
  });

  describe('onManualCorrection', () => {
    it('should enqueue a sync job with MANUAL_CORRECTION event', () => {
      synchronizer.onManualCorrection('user_123', 'medication', 'med_123', { dosage: '1000mg' });
      expect(memoryQueue.add).toHaveBeenCalledWith(
        'sync-memory',
        expect.objectContaining({
          eventType: MemoryEventType.MANUAL_CORRECTION,
          data: expect.objectContaining({
            entityType: 'medication',
            entityId: 'med_123',
            changes: { dosage: '1000mg' },
          }),
        }),
        expect.any(Object),
      );
    });
  });

  describe('triggerSync', () => {
    it('should handle queue add failure gracefully', () => {
      memoryQueue.add.mockRejectedValue(new Error('Queue unavailable'));
      
      // Should not throw - fire-and-forget
      expect(() => {
        synchronizer.triggerSync({
          userId: 'user_123',
          eventType: MemoryEventType.DOCUMENT_UPLOADED,
          data: { documentId: 'doc_123' },
        });
      }).not.toThrow();
    });
  });
});
