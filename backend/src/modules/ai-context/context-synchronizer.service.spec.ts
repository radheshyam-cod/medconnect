import { Test, TestingModule } from '@nestjs/testing';
import { ContextSynchronizer, ContextSyncEventType } from './context-synchronizer.service';
import { MemoryLogger } from '../memory/memory-logger.service';

describe('ContextSynchronizer', () => {
  let synchronizer: ContextSynchronizer;
  let queueMock: Record<string, jest.Mock>;
  let loggerMock: Record<string, jest.Mock>;

  beforeEach(async () => {
    queueMock = {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    };

    loggerMock = {
      debug: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextSynchronizer,
        {
          provide: 'BullQueue_ai-context',
          useValue: queueMock,
        },
        {
          provide: MemoryLogger,
          useValue: loggerMock,
        },
      ],
    }).compile();

    synchronizer = module.get<ContextSynchronizer>(ContextSynchronizer);
  });

  it('should be defined', () => {
    expect(synchronizer).toBeDefined();
  });

  // ── validateForSync tests ──────────────────────────────────────

  describe('validateForSync', () => {
    // Helper: creates a minimal condition entity with the given meta overrides.
    const makeEntity = (metaOverrides?: Record<string, unknown>) => ({
      id: 'test-id',
      name: 'Test Condition',
      status: 'ACTIVE' as const,
      meta: {
        version: '1.0.0',
        source: 'PostgreSQL',
        timestamp: new Date().toISOString(),
        confidence: 0.95,
        hash: 'abc123',
        ...(metaOverrides || {}),
      },
    });

    it('should pass entities with high confidence and valid source', () => {
      const result = synchronizer.validateForSync({
        conditions: [makeEntity()],
      });
      expect(result.hasData).toBe(true);
      expect(result.filtered).toBe(0);
      expect(result.passed.conditions).toHaveLength(1);
    });

    it('should filter entities with low confidence', () => {
      const result = synchronizer.validateForSync({
        conditions: [makeEntity({ confidence: 0.5 })],
      });
      expect(result.hasData).toBe(false);
      expect(result.filtered).toBe(1);
      expect(result.passed.conditions).toBeUndefined();
      expect(result.reasons.some((r) => r.includes('confidence'))).toBe(true);
    });

    it('should filter entities with blocked source', () => {
      const result = synchronizer.validateForSync({
        conditions: [makeEntity({ source: 'ocr_raw' })],
      });
      expect(result.filtered).toBe(1);
      expect(result.reasons.some((r) => r.includes('blocked source'))).toBe(true);
    });

    it('should filter entities missing meta', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = synchronizer.validateForSync({
        conditions: [{ id: 'no-meta', name: 'Bad', status: 'ACTIVE' as const }] as any,
      });
      expect(result.filtered).toBe(1);
      expect(result.reasons.some((r) => r.includes('missing meta'))).toBe(true);
    });

    it('should filter entities with incomplete extraction status', () => {
      const entity = makeEntity();
      (entity as Record<string, unknown>).extractionStatus = 'PENDING';
      const result = synchronizer.validateForSync({
        conditions: [entity],
      });
      expect(result.filtered).toBe(1);
      expect(result.reasons.some((r) => r.includes('extraction status'))).toBe(true);
    });

    it('should pass entities with completed extraction status', () => {
      const entity = makeEntity();
      (entity as Record<string, unknown>).extractionStatus = 'COMPLETED';
      const result = synchronizer.validateForSync({
        conditions: [entity],
      });
      expect(result.hasData).toBe(true);
      expect(result.filtered).toBe(0);
      expect(result.passed.conditions).toHaveLength(1);
    });

    it('should pass patient profile without filtering', () => {
      const result = synchronizer.validateForSync({
        patient: {
          id: 'profile-1',
          age: 30,
          gender: 'Male',
          bloodGroup: 'O+',
          allergies: [],
          meta: { version: '1', source: 'PostgreSQL', timestamp: '', confidence: 0.95, hash: 'hash1' },
        },
      });
      expect(result.hasData).toBe(true);
      expect(result.filtered).toBe(0);
      expect(result.passed.patient).toBeDefined();
    });

    it('should filter all types (conditions, medications, labs, timeline, events)', () => {
      const result = synchronizer.validateForSync({
        conditions: [makeEntity({ confidence: 0.5 })],
        medications: [{ id: 'm1', name: 'Med', dosage: '10mg', frequency: 'daily', isActive: true, meta: { version: '1', source: 'ocr_raw', timestamp: '', confidence: 0.9, hash: 'h1' } }],
        labs: [{ id: 'l1', testName: 'Test', value: '10', isAbnormal: false, date: '2024-01-01', meta: { version: '1', source: 'Mem0', timestamp: '', confidence: 0.5, hash: 'h2' } }],
      });
      expect(result.filtered).toBe(3);
      expect(result.passed.conditions).toBeUndefined();
      expect(result.passed.medications).toBeUndefined();
      expect(result.passed.labs).toBeUndefined();
    });
  });

  // ── onFactValidated tests ──────────────────────────────────────

  describe('onFactValidated', () => {
    it('should trigger sync when data passes the gate', () => {
      const result = synchronizer.onFactValidated('user_123', {
        conditions: [{
          id: 'c1',
          name: 'Diabetes',
          status: 'ACTIVE' as const,
          meta: { version: '1', source: 'PostgreSQL', timestamp: '', confidence: 0.95, hash: 'h1' },
        }],
      });

      expect(result.hasData).toBe(true);
      expect(result.filtered).toBe(0);
      // Should have queued the sync job
      expect(queueMock.add).toHaveBeenCalledWith(
        'sync-context',
        expect.objectContaining({
          userId: 'user_123',
          eventType: ContextSyncEventType.FACT_VALIDATED,
        }),
        expect.any(Object),
      );
    });

    it('should NOT trigger sync when all data is filtered', () => {
      const result = synchronizer.onFactValidated('user_123', {
        conditions: [{
          id: 'c1',
          name: 'Diabetes',
          status: 'ACTIVE' as const,
          meta: { version: '1', source: 'PostgreSQL', timestamp: '', confidence: 0.3, hash: 'h1' },
        }],
      });

      expect(result.hasData).toBe(false);
      expect(result.filtered).toBe(1);
      // Should NOT have queued the sync job
      expect(queueMock.add).not.toHaveBeenCalled();
    });
  });

  // ── onMedicalRecordConfirmed tests ──────────────────────────────

  describe('onMedicalRecordConfirmed', () => {
    it('should trigger sync when data passes the gate', () => {
      synchronizer.onMedicalRecordConfirmed('user_123', {
        labs: [{
          id: 'l1',
          testName: 'HbA1c',
          value: '6.5',
          isAbnormal: true,
          date: '2024-01-01',
          meta: { version: '1', source: 'PostgreSQL', timestamp: '', confidence: 0.95, hash: 'h1' },
        }],
      });

      expect(queueMock.add).toHaveBeenCalledWith(
        'sync-context',
        expect.objectContaining({
          userId: 'user_123',
          eventType: ContextSyncEventType.MEDICAL_RECORD_CONFIRMED,
        }),
        expect.any(Object),
      );
    });
  });
});
