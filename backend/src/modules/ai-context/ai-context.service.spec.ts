import { Test, TestingModule } from '@nestjs/testing';
import { AIContextService } from './ai-context.service';
import { ContextAggregator } from './context-aggregator.service';
import { PromptBuilder } from './prompt-builder.service';
import { MemoryLogger } from '../memory/memory-logger.service';
import { ContextBuilder } from './context-builder.service'; // still imported, but barely used

describe('AIContextService', () => {
  let service: AIContextService;
  let contextAggregator: Record<string, jest.Mock>;
  let promptBuilder: Record<string, jest.Mock>;

  beforeEach(async () => {
    contextAggregator = {
      aggregateContext: jest.fn().mockResolvedValue({ patient: null, conditions: [] }),
    };
    promptBuilder = {
      buildExtractionPrompt: jest.fn().mockReturnValue('Enriched extraction prompt'),
      buildTimelinePrompt: jest.fn().mockReturnValue('Enriched timeline prompt'),
      buildSummaryPrompt: jest.fn().mockReturnValue('Enriched summary prompt'),
      estimateTokenCount: jest.fn().mockReturnValue(100),
      compressExtractions: jest.fn().mockImplementation((e) => e),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIContextService,
        { provide: ContextAggregator, useValue: contextAggregator },
        { provide: PromptBuilder, useValue: promptBuilder },
        { provide: ContextBuilder, useValue: {} },
        {
          provide: MemoryLogger,
          useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AIContextService>(AIContextService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildExtractionContext', () => {
    it('should return enriched prompt with medical context', async () => {
      const result = await service.buildExtractionContext('user_123', 'Raw OCR text');

      expect(result).toHaveProperty('enrichedPrompt');
      expect(result).toHaveProperty('hasMemory');
      expect(result.hasMemory).toBe(true);
      expect(promptBuilder.buildExtractionPrompt).toHaveBeenCalled();
      expect(contextAggregator.aggregateContext).toHaveBeenCalled();
    });
  });

  describe('buildTimelineContext', () => {
    it('should return enriched prompt with extractions and context', async () => {
      const extractions = [{ id: 'ext_1', documentId: 'doc_1', diseases: ['Diabetes'] }];
      const result = await service.buildTimelineContext('user_123', extractions);

      expect(result).toHaveProperty('enrichedPrompt');
      expect(promptBuilder.buildTimelinePrompt).toHaveBeenCalled();
      expect(promptBuilder.compressExtractions).toHaveBeenCalledWith(extractions);
    });
  });

  describe('buildSummaryContext', () => {
    it('should return enriched prompt for doctor summary type', async () => {
      const result = await service.buildSummaryContext('user_123', [], 'DOCTOR');

      expect(result).toHaveProperty('enrichedPrompt');
      expect(promptBuilder.buildSummaryPrompt).toHaveBeenCalledWith(
        expect.any(Array),
        'DOCTOR',
        expect.any(Object),
      );
    });
  });

  describe('storeExtractionMemory', () => {
    it('should not throw (skipped implementation)', async () => {
      await expect(service.storeExtractionMemory()).resolves.not.toThrow();
    });
  });
});

