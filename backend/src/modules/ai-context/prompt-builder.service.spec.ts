import { Test, TestingModule } from '@nestjs/testing';
import { PromptBuilder } from './prompt-builder.service';
import { MedicalContext } from './dto/medical-context.dto';

describe('PromptBuilder', () => {
  let builder: PromptBuilder;
  let mockContext: MedicalContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PromptBuilder],
    }).compile();

    builder = module.get<PromptBuilder>(PromptBuilder);

    mockContext = {
      patient: { id: '1', age: 30, gender: 'Male', allergies: [], meta: { version: '1.0', source: 'test', timestamp: '', confidence: 1.0, hash: '' } },
      conditions: [],
      medications: [],
      labs: [],
      timeline: [],
      riskFactors: [],
      importantEvents: [{ id: '1', description: 'Memory context event', meta: { version: '1.0', source: 'test', timestamp: '', confidence: 1.0, hash: '' } }],
    };
  });

  it('should be defined', () => {
    expect(builder).toBeDefined();
  });

  describe('buildExtractionPrompt', () => {
    it('should include medical context and raw OCR text', () => {
      const prompt = builder.buildExtractionPrompt('Raw OCR text here', mockContext);
      expect(prompt).toContain('MEDICAL CONTEXT');
      expect(prompt).toContain('Memory context event');
      expect(prompt).toContain('RAW OCR TEXT');
      expect(prompt).toContain('Raw OCR text here');
    });

    it('should handle null medical context gracefully', () => {
      const prompt = builder.buildExtractionPrompt('Raw text', null as any);
      expect(prompt).not.toContain('MEDICAL CONTEXT');
    });
  });

  describe('buildTimelinePrompt', () => {
    it('should include extractions and event type instructions', () => {
      const extractions = [{ id: 'ext_1', documentId: 'doc_1', diseases: ['Diabetes'] }];
      const prompt = builder.buildTimelinePrompt(extractions, mockContext);
      expect(prompt).toContain('VISIT|DIAGNOSIS|MEDICATION|LAB_TEST|PROCEDURE');
      expect(prompt).toContain(JSON.stringify(extractions));
      expect(prompt).toContain('MEDICAL CONTEXT');
    });
  });

  describe('buildSummaryPrompt', () => {
    it('should include role instruction for doctor summary', () => {
      const prompt = builder.buildSummaryPrompt([], 'DOCTOR', mockContext);
      expect(prompt).toContain('concise clinical summary for a physician');
      expect(prompt).toContain('ICD/CPT concepts');
    });

    it('should include role instruction for patient summary', () => {
      const prompt = builder.buildSummaryPrompt([], 'PATIENT', mockContext);
      expect(prompt).toContain('friendly, easy-to-understand health summary');
      expect(prompt).not.toContain('ICD/CPT');
    });
  });

  describe('estimateTokenCount', () => {
    it('should estimate tokens roughly as characters/4', () => {
      const text = 'This is a test sentence with twenty chars';
      const estimated = builder.estimateTokenCount(text);
      expect(estimated).toBeGreaterThanOrEqual(10);
      expect(estimated).toBeLessThanOrEqual(15);
    });
  });

  describe('compressExtractions', () => {
    it('should return all extractions if under token limit', () => {
      const extractions = [{ id: '1', data: 'small' }];
      const result = builder.compressExtractions(extractions, 30000);
      expect(result).toHaveLength(1);
    });
  });
});

