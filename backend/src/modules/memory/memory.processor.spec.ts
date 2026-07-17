import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { MemoryProcessor } from './memory.processor';
import { MemoryService } from './memory.service';
import { MemoryLogger } from './memory-logger.service';
import { MemoryEventType } from './interfaces/memory.interface';

// ─── Job Builder Helper ─────────────────────────────────────────
function createJob(name: string, data: Record<string, unknown>): Job {
  return {
    id: 'job_123',
    name,
    data,
    timestamp: Date.now(),
  } as unknown as Job;
}

describe('MemoryProcessor', () => {
  let processor: MemoryProcessor;
  let memoryService: {
    storeMemory: jest.Mock;
    addStructuredMemory: jest.Mock;
    deleteAllUserData: jest.Mock;
  };
  let memoryLogger: {
    log: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
    debug: jest.Mock;
  };

  async function buildModule(overrides?: {
    storeMemory?: jest.Mock;
    addStructuredMemory?: jest.Mock;
    deleteAllUserData?: jest.Mock;
  }) {
    memoryService = {
      storeMemory: jest.fn().mockResolvedValue(true),
      addStructuredMemory: jest.fn().mockResolvedValue(true),
      deleteAllUserData: jest.fn().mockResolvedValue(true),
      ...overrides,
    };
    memoryLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoryProcessor,
        { provide: MemoryService, useValue: memoryService },
        { provide: MemoryLogger, useValue: memoryLogger },
      ],
    }).compile();

    processor = module.get<MemoryProcessor>(MemoryProcessor);
  }

  // ─── process() — Job Routing ──────────────────────────────────

  describe('process — job routing', () => {
    beforeEach(async () => await buildModule());

    it('should route sync-memory jobs to handleSyncMemory', async () => {
      const job = createJob('sync-memory', {
        userId: 'user_123',
        eventType: MemoryEventType.DOCUMENT_UPLOADED,
        data: { documentId: 'doc_1', fileName: 'test.pdf' },
      });
      await processor.process(job);
      expect(memoryService.addStructuredMemory).toHaveBeenCalled();
    });

    it('should route store-extraction jobs to handleStoreExtraction', async () => {
      const job = createJob('store-extraction', {
        userId: 'user_123',
        extractionData: { diseases: ['Diabetes'] },
        source: 'test',
      });
      await processor.process(job);
      expect(memoryService.storeMemory).toHaveBeenCalledWith(
        'user_123',
        { diseases: ['Diabetes'] },
        'test',
      );
    });

    it('should route store-summary jobs to handleStoreSummary', async () => {
      const job = createJob('store-summary', {
        userId: 'user_123',
        summaryData: { summary: 'Patient is stable' },
        source: 'ai',
      });
      await processor.process(job);
      expect(memoryService.storeMemory).toHaveBeenCalledWith(
        'user_123',
        { summary: 'Patient is stable' },
        'ai',
      );
    });

    it('should route cleanup-memory jobs to handleCleanup', async () => {
      const job = createJob('cleanup-memory', { userId: 'user_123' });
      await processor.process(job);
      expect(memoryService.deleteAllUserData).toHaveBeenCalledWith('user_123');
    });

    it('should silently handle unknown job types', async () => {
      const job = createJob('unknown-job', {});
      const result = await processor.process(job);
      expect(result).toBeUndefined();
    });
  });

  // ─── handleSyncMemory — Event Type Routing ────────────────────

  describe('handleSyncMemory — event type routing', () => {
    beforeEach(async () => await buildModule());

    it('should route DOCUMENT_UPLOADED to syncDocumentUpload', async () => {
      const data = { documentId: 'doc_1', fileName: 'report.pdf' };
      const job = createJob('sync-memory', {
        userId: 'user_123',
        eventType: MemoryEventType.DOCUMENT_UPLOADED,
        data,
        timestamp: new Date().toISOString(),
      });
      await processor.process(job);
      expect(memoryService.addStructuredMemory).toHaveBeenCalledWith(
        'user_123',
        'document_metadata',
        expect.stringContaining('documentId'),
        { eventType: 'document_upload' },
      );
    });

    it('should route OCR_COMPLETED to syncOcrCompleted (no-op)', async () => {
      const data = { extractionId: 'ext_1' };
      const job = createJob('sync-memory', {
        userId: 'user_123',
        eventType: MemoryEventType.OCR_COMPLETED,
        data,
      });
      const result = await processor.process(job);
      expect(result).toBe(true);
      expect(memoryService.addStructuredMemory).not.toHaveBeenCalled();
      expect(memoryService.storeMemory).not.toHaveBeenCalled();
    });

    it('should route EXTRACTION_COMPLETED to syncExtraction', async () => {
      const data = { extractionId: 'ext_1', extractedData: { diseases: ['Diabetes'] } };
      const job = createJob('sync-memory', {
        userId: 'user_123',
        eventType: MemoryEventType.EXTRACTION_COMPLETED,
        data,
      });
      await processor.process(job);
      expect(memoryService.storeMemory).toHaveBeenCalled();
    });

    it('should route MEDICATION_CREATED to syncMedication', async () => {
      const data = { medication: { name: 'Metformin', dosage: '500mg' } };
      const job = createJob('sync-memory', {
        userId: 'user_123',
        eventType: MemoryEventType.MEDICATION_CREATED,
        data,
      });
      await processor.process(job);
      expect(memoryService.addStructuredMemory).toHaveBeenCalledWith(
        'user_123',
        'medication',
        expect.stringContaining('Metformin'),
        { eventType: 'medication_created' },
      );
    });

    it('should route MEDICATION_UPDATED to syncMedication', async () => {
      const data = { medication: { name: 'Metformin', dosage: '1000mg' } };
      const job = createJob('sync-memory', {
        userId: 'user_123',
        eventType: MemoryEventType.MEDICATION_UPDATED,
        data,
      });
      await processor.process(job);
      expect(memoryService.addStructuredMemory).toHaveBeenCalledWith(
        expect.any(String),
        'medication',
        expect.any(String),
        { eventType: 'medication_updated' },
      );
    });

    it('should route MEDICATION_DELETED to syncMedicationDeleted', async () => {
      const data = { medicationId: 'med_1', medicationName: 'Metformin' };
      const job = createJob('sync-memory', {
        userId: 'user_123',
        eventType: MemoryEventType.MEDICATION_DELETED,
        data,
      });
      await processor.process(job);
      expect(memoryService.addStructuredMemory).toHaveBeenCalledWith(
        'user_123',
        'medication',
        expect.stringContaining('"isActive":false'),
        { eventType: 'medication_deleted' },
      );
    });

    it('should route LAB_CREATED to syncLabResult', async () => {
      const data = { labResult: { testName: 'Blood Sugar', value: '140', isAbnormal: true, date: '2024-01-15' } };
      const job = createJob('sync-memory', {
        userId: 'user_123',
        eventType: MemoryEventType.LAB_CREATED,
        data,
      });
      await processor.process(job);
      expect(memoryService.addStructuredMemory).toHaveBeenCalledWith(
        'user_123',
        'lab_result',
        expect.stringContaining('Blood Sugar'),
        { eventType: 'lab_created' },
      );
    });

    it('should route LAB_UPDATED to syncLabResult', async () => {
      const data = { labResult: { testName: 'Blood Sugar', value: '150', isAbnormal: true, date: '2024-01-20' } };
      const job = createJob('sync-memory', {
        userId: 'user_123',
        eventType: MemoryEventType.LAB_UPDATED,
        data,
      });
      await processor.process(job);
      expect(memoryService.addStructuredMemory).toHaveBeenCalledWith(
        expect.any(String),
        'lab_result',
        expect.any(String),
        { eventType: 'lab_updated' },
      );
    });

    it('should route TIMELINE_CREATED to syncTimelineEvent', async () => {
      const data = { event: { eventType: 'VISIT', title: 'Checkup', eventDate: '2024-01-10', facility: 'Clinic', doctorName: 'Dr. Smith' } };
      const job = createJob('sync-memory', {
        userId: 'user_123',
        eventType: MemoryEventType.TIMELINE_CREATED,
        data,
      });
      await processor.process(job);
      expect(memoryService.addStructuredMemory).toHaveBeenCalledWith(
        'user_123',
        'timeline_event',
        expect.stringContaining('Checkup'),
        { eventType: 'timeline_created' },
      );
    });

    it('should route SUMMARY_GENERATED to syncSummary', async () => {
      const data = { summary: { summary: 'Patient shows improvement', conditions: ['Diabetes'] } };
      const job = createJob('sync-memory', {
        userId: 'user_123',
        eventType: MemoryEventType.SUMMARY_GENERATED,
        data,
      });
      await processor.process(job);
      expect(memoryService.storeMemory).toHaveBeenCalledWith(
        'user_123',
        { summary: 'Patient shows improvement', conditions: ['Diabetes'] },
        'ai_summary',
      );
    });

    it('should route FHIR_IMPORTED to syncFhirImport', async () => {
      const data = { importData: { resourceType: 'Patient', id: 'pat_123' } };
      const job = createJob('sync-memory', {
        userId: 'user_123',
        eventType: MemoryEventType.FHIR_IMPORTED,
        data,
      });
      await processor.process(job);
      expect(memoryService.storeMemory).toHaveBeenCalledWith(
        'user_123',
        { resourceType: 'Patient', id: 'pat_123' },
        'fhir_import',
      );
    });

    it('should route MANUAL_CORRECTION to syncManualCorrection with correct category', async () => {
      const data = { entityType: 'medication', entityId: 'med_1', changes: { dosage: '1000mg' } };
      const job = createJob('sync-memory', {
        userId: 'user_123',
        eventType: MemoryEventType.MANUAL_CORRECTION,
        data,
      });
      await processor.process(job);
      // Category (2nd arg) should be 'manual_correction'
      expect(memoryService.addStructuredMemory).toHaveBeenCalledWith(
        'user_123',
        'manual_correction',
        expect.stringContaining('entityType'),
        { eventType: 'manual_correction' },
      );
    });

    it('should silently handle unhandled event types and return false', async () => {
      const job = createJob('sync-memory', {
        userId: 'user_123',
        eventType: 'UNKNOWN_EVENT_TYPE',
        data: {},
      });
      const result = await processor.process(job);
      expect(result).toBe(false);
    });

    it('should propagate errors for BullMQ retry (catch block now fires with await)', async () => {
      const errService = {
        storeMemory: jest.fn(),
        addStructuredMemory: jest.fn().mockRejectedValue(new Error('DB error')),
        deleteAllUserData: jest.fn(),
      };
      const errLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

      const errModule = await Test.createTestingModule({
        providers: [
          MemoryProcessor,
          { provide: MemoryService, useValue: errService },
          { provide: MemoryLogger, useValue: errLogger },
        ],
      }).compile();
      const errProcessor = errModule.get<MemoryProcessor>(MemoryProcessor);

      const job = createJob('sync-memory', {
        userId: 'user_123',
        eventType: MemoryEventType.DOCUMENT_UPLOADED,
        data: { documentId: 'doc_1', fileName: 'test.pdf' },
      });

      // Error is logged AND propagated to BullMQ for retry
      await expect(errProcessor.process(job)).rejects.toThrow('DB error');
      expect(errLogger.error).toHaveBeenCalledWith(
        'SYNC_PROCESSING_FAILED',
        expect.any(Error),
        { eventType: MemoryEventType.DOCUMENT_UPLOADED },
      );
    });
  });

  // ─── Data Mapping: syncExtraction ────────────────────────────

  describe('syncExtraction — data mapping', () => {
    beforeEach(async () => await buildModule());

    it('should map diseases to medicalConditions with confidence and metadata', async () => {
      const data = { extractedData: { diseases: ['Diabetes', 'Hypertension'] } };
      const job = createJob('sync-memory', {
        userId: 'user_123',
        eventType: MemoryEventType.EXTRACTION_COMPLETED,
        data,
      });
      await processor.process(job);

      const storedData = memoryService.storeMemory.mock.calls[0][1];
      expect(storedData.medicalConditions).toHaveLength(2);
      expect(storedData.medicalConditions[0]).toMatchObject({
        name: 'Diabetes',
        confidence: 0.7,
        source: 'document_extraction',
        lastUpdated: expect.any(String),
      });
      expect(storedData.medicalConditions[1]).toMatchObject({
        name: 'Hypertension',
        confidence: 0.7,
      });
    });

    it('should map medicines to currentMedicines as active', async () => {
      const data = { extractedData: { medicines: ['Metformin 500mg', 'Amlodipine 5mg'] } };
      const job = createJob('sync-memory', {
        userId: 'user_123',
        eventType: MemoryEventType.EXTRACTION_COMPLETED,
        data,
      });
      await processor.process(job);

      const storedData = memoryService.storeMemory.mock.calls[0][1];
      expect(storedData.currentMedicines).toHaveLength(2);
      expect(storedData.currentMedicines[0]).toMatchObject({
        name: 'Metformin 500mg',
        isActive: true,
        source: 'document_extraction',
      });
    });

    it('should map doctors as plain string array', async () => {
      const data = { extractedData: { doctors: ['Dr. Sharma', 'Dr. Singh'] } };
      await processor.process(createJob('sync-memory', {
        userId: 'user_123', eventType: MemoryEventType.EXTRACTION_COMPLETED, data,
      }));

      expect(memoryService.storeMemory.mock.calls[0][1].doctors).toEqual(['Dr. Sharma', 'Dr. Singh']);
    });

    it('should map hospitals as plain string array', async () => {
      const data = { extractedData: { hospitals: ['Apollo Hospital', 'AIIMS'] } };
      await processor.process(createJob('sync-memory', {
        userId: 'user_123', eventType: MemoryEventType.EXTRACTION_COMPLETED, data,
      }));

      expect(memoryService.storeMemory.mock.calls[0][1].hospitals).toEqual(['Apollo Hospital', 'AIIMS']);
    });

    it('should map labValues to labTrends with Extracted Lab Values label', async () => {
      const data = { extractedData: { labValues: ['Blood Sugar: 140', 'HbA1c: 7.2'] } };
      await processor.process(createJob('sync-memory', {
        userId: 'user_123', eventType: MemoryEventType.EXTRACTION_COMPLETED, data,
      }));

      const storedData = memoryService.storeMemory.mock.calls[0][1];
      expect(storedData.labTrends).toHaveLength(1);
      expect(storedData.labTrends[0].testName).toBe('Extracted Lab Values');
      expect(storedData.labTrends[0].values).toHaveLength(2);
      expect(storedData.labTrends[0].values[0]).toMatchObject({
        value: 'Blood Sugar: 140',
        isAbnormal: false,
        source: 'document_extraction',
        date: expect.any(String),
      });
    });

    it('should map procedures with name and source', async () => {
      const data = { extractedData: { procedures: ['Appendectomy', 'C-section'] } };
      await processor.process(createJob('sync-memory', {
        userId: 'user_123', eventType: MemoryEventType.EXTRACTION_COMPLETED, data,
      }));

      expect(memoryService.storeMemory.mock.calls[0][1].procedures).toHaveLength(2);
      expect(memoryService.storeMemory.mock.calls[0][1].procedures[0]).toMatchObject({
        name: 'Appendectomy',
        source: 'document_extraction',
      });
    });

    it('should combine all extracted data types into a single memory payload', async () => {
      const data = { extractedData: { diseases: ['Diabetes'], medicines: ['Metformin'], doctors: ['Dr. Sharma'], hospitals: ['AIIMS'], labValues: ['HbA1c: 7.2'], procedures: ['Checkup'] } };
      await processor.process(createJob('sync-memory', {
        userId: 'user_123', eventType: MemoryEventType.EXTRACTION_COMPLETED, data,
      }));

      const storedData = memoryService.storeMemory.mock.calls[0][1];
      expect(storedData).toHaveProperty('medicalConditions');
      expect(storedData).toHaveProperty('currentMedicines');
      expect(storedData).toHaveProperty('doctors');
      expect(storedData).toHaveProperty('hospitals');
      expect(storedData).toHaveProperty('labTrends');
      expect(storedData).toHaveProperty('procedures');
      expect(memoryService.storeMemory).toHaveBeenCalledWith('user_123', storedData, 'extraction');
    });

    it('should skip when all extraction arrays are empty', async () => {
      const data = { extractedData: { diseases: [], medicines: [], doctors: [], hospitals: [], labValues: [], procedures: [] } };
      await processor.process(createJob('sync-memory', {
        userId: 'user_123', eventType: MemoryEventType.EXTRACTION_COMPLETED, data,
      }));

      expect(memoryService.storeMemory).not.toHaveBeenCalled();
    });

    it('should handle missing extractedData gracefully', async () => {
      const data = { extractionId: 'ext_1' };
      await processor.process(createJob('sync-memory', {
        userId: 'user_123', eventType: MemoryEventType.EXTRACTION_COMPLETED, data,
      }));

      expect(memoryService.storeMemory).not.toHaveBeenCalled();
    });
  });

  // ─── Edge Cases: Missing Data ────────────────────────────────

  describe('sync handlers — missing data edge cases', () => {
    beforeEach(async () => await buildModule());

    it('syncMedication should return false when medication data is missing', async () => {
      const data = {};
      const job = createJob('sync-memory', {
        userId: 'user_123', eventType: MemoryEventType.MEDICATION_CREATED, data,
      });
      const result = await processor.process(job);
      expect(result).toBe(false);
      expect(memoryService.addStructuredMemory).not.toHaveBeenCalled();
    });

    it('syncLabResult should return false when labResult is missing', async () => {
      const data = {};
      const job = createJob('sync-memory', {
        userId: 'user_123', eventType: MemoryEventType.LAB_CREATED, data,
      });
      const result = await processor.process(job);
      expect(result).toBe(false);
      expect(memoryService.addStructuredMemory).not.toHaveBeenCalled();
    });

    it('syncTimelineEvent should return false when event is missing', async () => {
      const data = {};
      const job = createJob('sync-memory', {
        userId: 'user_123', eventType: MemoryEventType.TIMELINE_CREATED, data,
      });
      const result = await processor.process(job);
      expect(result).toBe(false);
      expect(memoryService.addStructuredMemory).not.toHaveBeenCalled();
    });

    it('syncSummary should return false when summary is missing', async () => {
      const data = {};
      const job = createJob('sync-memory', {
        userId: 'user_123', eventType: MemoryEventType.SUMMARY_GENERATED, data,
      });
      const result = await processor.process(job);
      expect(result).toBe(false);
      expect(memoryService.storeMemory).not.toHaveBeenCalled();
    });

    it('syncFhirImport should fall back to data when importData is missing', async () => {
      const data = { resourceType: 'Patient', id: 'pat_123' };
      const job = createJob('sync-memory', {
        userId: 'user_123', eventType: MemoryEventType.FHIR_IMPORTED, data,
      });
      await processor.process(job);
      expect(memoryService.storeMemory).toHaveBeenCalledWith(
        'user_123',
        { resourceType: 'Patient', id: 'pat_123' },
        'fhir_import',
      );
    });
  });

  // ─── Data Format Verification ─────────────────────────────────

  describe('sync handlers — data format verification', () => {
    beforeEach(async () => await buildModule());

    it('syncMedication should default isActive to true when not provided', async () => {
      const data = { medication: { name: 'New Med', dosage: '10mg' } }; // no isActive
      const job = createJob('sync-memory', {
        userId: 'user_123', eventType: MemoryEventType.MEDICATION_CREATED, data,
      });
      await processor.process(job);

      const jsonStr = memoryService.addStructuredMemory.mock.calls[0][2];
      const parsed = JSON.parse(jsonStr);
      expect(parsed.isActive).toBe(true);
      expect(parsed.action).toBe('created');
    });

    it('syncMedication should respect isActive=false', async () => {
      const data = { medication: { name: 'Old Med', isActive: false } };
      const job = createJob('sync-memory', {
        userId: 'user_123', eventType: MemoryEventType.MEDICATION_UPDATED, data,
      });
      await processor.process(job);

      const jsonStr = memoryService.addStructuredMemory.mock.calls[0][2];
      const parsed = JSON.parse(jsonStr);
      expect(parsed.isActive).toBe(false);
      expect(parsed.action).toBe('updated');
    });

    it('syncLabResult should include all lab fields', async () => {
      const data = { labResult: { testName: 'Hemoglobin', value: '13.5', unit: 'g/dL', isAbnormal: false, date: '2024-01-15' } };
      await processor.process(createJob('sync-memory', {
        userId: 'user_123', eventType: MemoryEventType.LAB_CREATED, data,
      }));

      const parsed = JSON.parse(memoryService.addStructuredMemory.mock.calls[0][2]);
      expect(parsed).toMatchObject({
        testName: 'Hemoglobin',
        value: '13.5',
        unit: 'g/dL',
        isAbnormal: false,
        date: '2024-01-15',
        action: 'created',
        timestamp: expect.any(String),
      });
    });

    it('syncTimelineEvent should include all event fields', async () => {
      const data = { event: { eventType: 'VISIT', title: 'Annual Checkup', description: 'Routine physical', eventDate: '2024-01-10', facility: 'City Hospital', doctorName: 'Dr. Smith' } };
      await processor.process(createJob('sync-memory', {
        userId: 'user_123', eventType: MemoryEventType.TIMELINE_CREATED, data,
      }));

      const parsed = JSON.parse(memoryService.addStructuredMemory.mock.calls[0][2]);
      expect(parsed).toMatchObject({
        eventType: 'VISIT',
        title: 'Annual Checkup',
        description: 'Routine physical',
        date: '2024-01-10',
        facility: 'City Hospital',
        doctorName: 'Dr. Smith',
        timestamp: expect.any(String),
      });
    });

    it('syncMedicationDeleted should set isActive to false', async () => {
      const data = { medicationId: 'med_1', medicationName: 'Metformin' };
      await processor.process(createJob('sync-memory', {
        userId: 'user_123', eventType: MemoryEventType.MEDICATION_DELETED, data,
      }));

      const parsed = JSON.parse(memoryService.addStructuredMemory.mock.calls[0][2]);
      expect(parsed).toMatchObject({
        medicationId: 'med_1',
        name: 'Metformin',
        isActive: false,
        action: 'deleted',
        timestamp: expect.any(String),
      });
    });

    it('syncManualCorrection should include all correction fields', async () => {
      const data = { entityType: 'medication', entityId: 'med_1', changes: { dosage: '1000mg' } };
      await processor.process(createJob('sync-memory', {
        userId: 'user_123', eventType: MemoryEventType.MANUAL_CORRECTION, data,
      }));

      const parsed = JSON.parse(memoryService.addStructuredMemory.mock.calls[0][2]);
      expect(parsed).toMatchObject({
        entityType: 'medication',
        entityId: 'med_1',
        changes: { dosage: '1000mg' },
        timestamp: expect.any(String),
      });
    });
  });

  // ─── Return Value Consistency ─────────────────────────────────

  describe('return value consistency', () => {
    beforeEach(async () => await buildModule());

    it('store-extraction should propagate MemoryService result', async () => {
      memoryService.storeMemory.mockResolvedValue(false);
      const job = createJob('store-extraction', {
        userId: 'user_123', extractionData: { diseases: ['Diabetes'] }, source: 'extraction',
      });
      const result = await processor.process(job);
      expect(result).toBe(false);
    });

    it('cleanup-memory should propagate MemoryService result', async () => {
      memoryService.deleteAllUserData.mockResolvedValue(false);
      const job = createJob('cleanup-memory', { userId: 'user_123' });
      const result = await processor.process(job);
      expect(result).toBe(false);
    });
  });
});
