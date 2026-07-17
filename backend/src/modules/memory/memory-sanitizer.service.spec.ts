import { Test, TestingModule } from '@nestjs/testing';
import { MemorySanitizer } from './memory-sanitizer.service';
import { MemoryLogger } from './memory-logger.service';
import { PatientMemory } from './interfaces/memory.interface';

describe('MemorySanitizer', () => {
  let sanitizer: MemorySanitizer;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemorySanitizer,
        {
          provide: MemoryLogger,
          useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
        },
      ],
    }).compile();

    sanitizer = module.get<MemorySanitizer>(MemorySanitizer);
  });

  it('should be defined', () => {
    expect(sanitizer).toBeDefined();
  });

  describe('sanitizeMemoryData', () => {
    it('should remove null values', () => {
      const result = sanitizer.sanitizeMemoryData({
        name: 'Test',
        age: null,
        address: undefined,
        notes: '',
        emptyArr: [],
      });
      expect(result).not.toHaveProperty('age');
      expect(result).not.toHaveProperty('address');
      expect(result).not.toHaveProperty('notes');
      expect(result).not.toHaveProperty('emptyArr');
      expect(result.name).toBe('Test');
    });

    it('should normalize whitespace in string values', () => {
      const result = sanitizer.sanitizeMemoryData({
        name: '  Dr.  Sharma  ',
        notes: 'multiple   spaces    here',
      });
      expect(result.name).toBe('Dr. Sharma');
      expect(result.notes).toBe('multiple spaces here');
    });
  });

  describe('sanitizePatientMemory', () => {
    const sampleMemory = {
      medicalConditions: [
        { name: '  Diabetes  ', confidence: 0.8, source: 'test', lastUpdated: '2024-01-01' },
        { name: '  Hypertension  ', confidence: 0.9, source: 'test', lastUpdated: '2024-01-01' },
        { name: '', confidence: 0.5, source: 'test', lastUpdated: '2024-01-01' },
      ],
      currentMedicines: [
        { name: '  Metformin 500mg  ', dosage: '1-0-1', isActive: true, source: 'test', lastUpdated: '2024-01-01' },
        { name: '  Amlodipine 5mg  ', dosage: '0-0-1', isActive: true, source: 'test', lastUpdated: '2024-01-01' },
      ],
      allergies: ['  Penicillin  ', '  ', '  Sulfa  ', 'Penicillin'],
      diagnoses: ['  Diabetes Type 2  ', '  Hypertension  '],
      doctors: ['  Dr. Sharma  ', '  Dr. Singh  ', 'Dr. Sharma'],
      hospitals: ['  Apollo Hospital  '],
      labTrends: [
        {
          testName: '  Blood Sugar  ',
          values: [
            { value: '140', date: '2024-01-01', isAbnormal: true, source: 'lab' },
            { value: '', date: '2024-01-02', isAbnormal: false, source: 'lab' },
          ],
        },
      ],
      vaccinations: ['  COVID-19  '],
      importantClinicalFacts: [
        'Patient has a history of allergic reactions to penicillin.',
        'Short',
      ],
    };

    it('should filter out empty medical conditions', () => {
      const result = sanitizer.sanitizePatientMemory(sampleMemory);
      expect(result.medicalConditions).toHaveLength(2);
      expect(result.medicalConditions![0].name).toBe('Diabetes');
    });

    it('should clamp confidence values between 0 and 1', () => {
      const result = sanitizer.sanitizePatientMemory({
        medicalConditions: [
          { name: 'Test', confidence: 1.5, source: 'test', lastUpdated: '2024-01-01' },
          { name: 'Test2', confidence: -0.5, source: 'test', lastUpdated: '2024-01-01' },
        ],
      } as unknown as PatientMemory);
      expect(result.medicalConditions![0].confidence).toBe(1);
      expect(result.medicalConditions![1].confidence).toBe(0);
    });

    it('should deduplicate allergies', () => {
      const result = sanitizer.sanitizePatientMemory(sampleMemory);
      // Penicillin and Sulfa remain, blank and duplicate removed
      expect(result.allergies!.length).toBeGreaterThanOrEqual(2);
      expect(result.allergies).toContain('Penicillin');
      expect(result.allergies).toContain('Sulfa');
    });

    it('should deduplicate doctors (strips Dr. prefix)', () => {
      const result = sanitizer.sanitizePatientMemory(sampleMemory);
      expect(result.doctors).toHaveLength(2);
      // normalizeName strips 'Dr. ' prefix
      expect(result.doctors).toContain('Sharma');
    });

    it('should filter out short clinical facts', () => {
      const result = sanitizer.sanitizePatientMemory(sampleMemory);
      expect(result.importantClinicalFacts).toHaveLength(1);
    });

    it('should filter empty lab values', () => {
      const result = sanitizer.sanitizePatientMemory(sampleMemory);
      expect(result.labTrends![0].values).toHaveLength(1);
    });
  });

  describe('extractConfidence', () => {
    it('should return higher confidence for longer text', () => {
      expect(sanitizer.extractConfidence('Short')).toBe(0.3);
      expect(sanitizer.extractConfidence('A bit longer text here for testing')).toBe(0.5);
      expect(sanitizer.extractConfidence('a'.repeat(250))).toBe(0.9);
    });
  });

  describe('normalizeDate', () => {
    it('should convert dates to ISO format', () => {
      const result = sanitizer.normalizeDate('2024-01-15T10:30:00Z');
      expect(result).toBe('2024-01-15');
    });

    it('should return original string for invalid dates', () => {
      const result = sanitizer.normalizeDate('not-a-date');
      expect(result).toBe('not-a-date');
    });
  });

  describe('normalizeUnit', () => {
    it('should normalize common lab units', () => {
      expect(sanitizer.normalizeUnit('mg/dl')).toBe('mg/dL');
      expect(sanitizer.normalizeUnit('mg%')).toBe('mg/dL');
      expect(sanitizer.normalizeUnit('gm%')).toBe('g/dL');
    });

    it('should return unknown units unchanged', () => {
      expect(sanitizer.normalizeUnit('custom_unit')).toBe('custom_unit');
    });
  });
});
