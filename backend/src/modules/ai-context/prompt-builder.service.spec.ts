import { Test, TestingModule } from '@nestjs/testing';
import { PromptBuilder } from './prompt-builder.service';

describe('PromptBuilder', () => {
  let builder: PromptBuilder;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PromptBuilder],
    }).compile();

    builder = module.get<PromptBuilder>(PromptBuilder);
  });

  it('should be defined', () => {
    expect(builder).toBeDefined();
  });

  describe('buildExtractionPrompt', () => {
    it('should include patient context and raw OCR text', () => {
      const prompt = builder.buildExtractionPrompt('Raw OCR text here', 'Memory context', 'Patient: 30 years Male');
      expect(prompt).toContain('PATIENT CONTEXT');
      expect(prompt).toContain('Patient: 30 years Male');
      expect(prompt).toContain('PATIENT MEMORY');
      expect(prompt).toContain('Memory context');
      expect(prompt).toContain('RAW OCR TEXT');
      expect(prompt).toContain('Raw OCR text here');
    });

    it('should exclude memory section when empty', () => {
      const prompt = builder.buildExtractionPrompt('Raw text', '', 'Context');
      expect(prompt).not.toContain('PATIENT MEMORY');
    });
  });

  describe('buildTimelinePrompt', () => {
    it('should include extractions and event type instructions', () => {
      const extractions = [{ id: 'ext_1', documentId: 'doc_1', diseases: ['Diabetes'] }];
      const prompt = builder.buildTimelinePrompt(extractions, 'Memory', 'Context');
      expect(prompt).toContain('VISIT|DIAGNOSIS|MEDICATION|LAB_TEST|PROCEDURE');
      expect(prompt).toContain(JSON.stringify(extractions));
      expect(prompt).toContain('PATIENT MEMORY');
    });
  });

  describe('buildSummaryPrompt', () => {
    it('should include role instruction for doctor summary', () => {
      const prompt = builder.buildSummaryPrompt([], 'DOCTOR', 'Memory', 'Context');
      expect(prompt).toContain('concise clinical summary for a physician');
      expect(prompt).toContain('ICD/CPT concepts');
    });

    it('should include role instruction for patient summary', () => {
      const prompt = builder.buildSummaryPrompt([], 'PATIENT', 'Memory', 'Context');
      expect(prompt).toContain('friendly, easy-to-understand health summary');
      expect(prompt).not.toContain('ICD/CPT');
    });
  });

  describe('formatMemoriesForPrompt', () => {
    it('should return empty string for empty memories', () => {
      expect(builder.formatMemoriesForPrompt([])).toBe('');
    });

    it('should format memories with category labels', () => {
      const memories = [
        { id: '1', score: 0.9, memory: 'Patient has diabetes', category: 'conditions', createdAt: '2024-01-01', metadata: {} },
        { id: '2', score: 0.8, memory: 'Patient takes Metformin', category: 'medications', createdAt: '2024-01-01', metadata: {} },
      ] as any;
      
      const result = builder.formatMemoriesForPrompt(memories);
      expect(result).toContain('[Conditions]');
      expect(result).toContain('[Medications]');
      expect(result).toContain('Patient has diabetes');
      expect(result).toContain('Patient takes Metformin');
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
