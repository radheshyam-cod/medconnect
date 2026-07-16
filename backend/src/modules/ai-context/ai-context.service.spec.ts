import { Test, TestingModule } from '@nestjs/testing';
import { AIContextService } from './ai-context.service';
import { ContextBuilder } from './context-builder.service';
import { PromptBuilder } from './prompt-builder.service';
import { MemoryService } from '../memory/memory.service';
import { MemoryCache } from '../memory/memory-cache.service';
import { MemoryLogger } from '../memory/memory-logger.service';

describe('AIContextService', () => {
  let service: AIContextService;
  let contextBuilder: Record<string, jest.Mock>;
  let promptBuilder: Record<string, jest.Mock>;
  let memoryService: Record<string, jest.Mock>;
  let cache: Record<string, jest.Mock>;

  beforeEach(async () => {
    contextBuilder = {
      buildPatientContext: jest.fn(),
      compressContext: jest.fn().mockReturnValue('Compressed patient context'),
    };
    promptBuilder = {
      buildExtractionPrompt: jest.fn().mockReturnValue('Enriched extraction prompt'),
      buildTimelinePrompt: jest.fn().mockReturnValue('Enriched timeline prompt'),
      buildSummaryPrompt: jest.fn().mockReturnValue('Enriched summary prompt'),
      formatMemoriesForPrompt: jest.fn().mockReturnValue('Formatted memories'),
      estimateTokenCount: jest.fn().mockReturnValue(100),
      compressExtractions: jest.fn().mockImplementation((e) => e),
    };
    memoryService = {
      searchRelevantMemories: jest.fn(),
      storeMemory: jest.fn().mockResolvedValue(true),
    };
    cache = {
      buildKey: jest.fn().mockReturnValue('cache-key'),
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIContextService,
        { provide: ContextBuilder, useValue: contextBuilder },
        { provide: PromptBuilder, useValue: promptBuilder },
        { provide: MemoryService, useValue: memoryService },
        { provide: MemoryCache, useValue: cache },
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
    it('should return enriched prompt with patient context and memory', async () => {
      contextBuilder.buildPatientContext.mockResolvedValue({ patientProfile: { age: 30 } });
      memoryService.searchRelevantMemories.mockResolvedValue([
        { id: 'mem_1', score: 0.9, memory: 'Patient has diabetes', createdAt: '2024-01-01' },
      ]);

      const result = await service.buildExtractionContext('user_123', 'Raw OCR text');

      expect(result).toHaveProperty('enrichedPrompt');
      expect(result).toHaveProperty('hasMemory');
      expect(result.hasMemory).toBe(true);
      expect(promptBuilder.buildExtractionPrompt).toHaveBeenCalled();
      expect(contextBuilder.compressContext).toHaveBeenCalled();
      expect(memoryService.searchRelevantMemories).toHaveBeenCalled();
    });

    it('should handle empty memory gracefully', async () => {
      contextBuilder.buildPatientContext.mockResolvedValue({ patientProfile: null });
      memoryService.searchRelevantMemories.mockResolvedValue([]);

      const result = await service.buildExtractionContext('user_123', 'Raw text');

      expect(result.hasMemory).toBe(false);
      expect(result.enrichedPrompt).toBeDefined();
    });

    it('should use cached patient context when available', async () => {
      cache.get.mockResolvedValue({ patientProfile: { age: 30 } });
      memoryService.searchRelevantMemories.mockResolvedValue([]);

      await service.buildExtractionContext('user_123', 'Raw text');

      expect(contextBuilder.buildPatientContext).not.toHaveBeenCalled();
    });
  });

  describe('buildTimelineContext', () => {
    it('should return enriched prompt with extractions and context', async () => {
      contextBuilder.buildPatientContext.mockResolvedValue({ recentTimeline: [] });
      memoryService.searchRelevantMemories.mockResolvedValue([]);

      const extractions = [{ id: 'ext_1', documentId: 'doc_1', diseases: ['Diabetes'] }];
      const result = await service.buildTimelineContext('user_123', extractions);

      expect(result).toHaveProperty('enrichedPrompt');
      expect(promptBuilder.buildTimelinePrompt).toHaveBeenCalled();
      expect(promptBuilder.compressExtractions).toHaveBeenCalledWith(extractions);
    });
  });

  describe('buildSummaryContext', () => {
    it('should return enriched prompt for doctor summary type', async () => {
      contextBuilder.buildPatientContext.mockResolvedValue({ patientProfile: { age: 30 } });
      memoryService.searchRelevantMemories.mockResolvedValue([]);

      const result = await service.buildSummaryContext('user_123', [], 'DOCTOR');

      expect(result).toHaveProperty('enrichedPrompt');
      expect(promptBuilder.buildSummaryPrompt).toHaveBeenCalledWith(
        expect.any(Array),
        'DOCTOR',
        expect.any(String),
        expect.any(String),
      );
    });

    it('should return enriched prompt for patient summary type', async () => {
      contextBuilder.buildPatientContext.mockResolvedValue({ patientProfile: { age: 30 } });
      memoryService.searchRelevantMemories.mockResolvedValue([]);

      await service.buildSummaryContext('user_123', [], 'PATIENT');

      expect(promptBuilder.buildSummaryPrompt).toHaveBeenCalledWith(
        expect.any(Array),
        'PATIENT',
        expect.any(String),
        expect.any(String),
      );
    });
  });

  describe('storeExtractionMemory', () => {
    it('should store extraction data via MemoryService', async () => {
      await service.storeExtractionMemory('user_123', { diseases: ['Diabetes'] });
      expect(memoryService.storeMemory).toHaveBeenCalledWith(
        'user_123',
        { diseases: ['Diabetes'] },
        'ai_extraction',
      );
    });

    it('should propagate storage failure (caller handles it)', async () => {
      memoryService.storeMemory.mockRejectedValue(new Error('Storage failed'));
      await expect(
        service.storeExtractionMemory('user_123', { diseases: ['Diabetes'] }),
      ).rejects.toThrow('Storage failed');
    });
  });
});
