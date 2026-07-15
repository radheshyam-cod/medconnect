import { Injectable } from '@nestjs/common';
import { ContextBuilder, PatientAiContext } from './context-builder.service';
import { PromptBuilder } from './prompt-builder.service';
import { MemoryService } from '../memory/memory.service';
import { MemoryCache } from '../memory/memory-cache.service';
import { MemoryLogger } from '../memory/memory-logger.service';
import { MemorySearchResult } from '../memory/interfaces/memory.interface';

@Injectable()
export class AIContextService {
  constructor(
    private readonly contextBuilder: ContextBuilder,
    private readonly promptBuilder: PromptBuilder,
    private readonly memoryService: MemoryService,
    private readonly cache: MemoryCache,
    private readonly memoryLogger: MemoryLogger,
  ) {}

  /**
   * Build enriched context for an AI extraction call.
   */
  async buildExtractionContext(
    userId: string,
    rawText: string,
  ): Promise<{ enrichedPrompt: string; hasMemory: boolean }> {
    const [patientContext, memoryContext] = await Promise.all([
      this.getPatientContext(userId),
      this.getRelevantMemory(userId, 'medical conditions diseases medicines'),
    ]);

    const contextStr = this.contextBuilder.compressContext(patientContext);
    const memoryStr = this.promptBuilder.formatMemoriesForPrompt(memoryContext);

    const enrichedPrompt = this.promptBuilder.buildExtractionPrompt(
      rawText,
      memoryStr,
      contextStr,
    );

    this.memoryLogger.debug('EXTRACTION_CONTEXT_BUILT', {
      contextTokens: this.promptBuilder.estimateTokenCount(contextStr),
      memoryTokens: this.promptBuilder.estimateTokenCount(memoryStr),
      hasMemory: memoryContext.length > 0,
    });

    return {
      enrichedPrompt,
      hasMemory: memoryContext.length > 0,
    };
  }

  /**
   * Build enriched context for a timeline generation call.
   */
  async buildTimelineContext(
    userId: string,
    extractions: any[],
  ): Promise<{ enrichedPrompt: string; hasMemory: boolean }> {
    const [patientContext, memoryContext] = await Promise.all([
      this.getPatientContext(userId),
      this.getRelevantMemory(userId, 'health timeline events medical history'),
    ]);

    const contextStr = this.contextBuilder.compressContext(patientContext);
    const memoryStr = this.promptBuilder.formatMemoriesForPrompt(memoryContext);
    const compressedExtractions = this.promptBuilder.compressExtractions(extractions);

    const enrichedPrompt = this.promptBuilder.buildTimelinePrompt(
      compressedExtractions,
      memoryStr,
      contextStr,
    );

    return {
      enrichedPrompt,
      hasMemory: memoryContext.length > 0,
    };
  }

  /**
   * Build enriched context for a patient summary call.
   */
  async buildSummaryContext(
    userId: string,
    extractions: any[],
    type: 'PATIENT' | 'DOCTOR',
  ): Promise<{ enrichedPrompt: string; hasMemory: boolean }> {
    const [patientContext, memoryContext] = await Promise.all([
      this.getPatientContext(userId),
      this.getRelevantMemory(userId, 'patient summary medical history conditions medications allergies'),
    ]);

    const contextStr = this.contextBuilder.compressContext(patientContext);
    const memoryStr = this.promptBuilder.formatMemoriesForPrompt(memoryContext);
    const compressedExtractions = this.promptBuilder.compressExtractions(extractions);

    const enrichedPrompt = this.promptBuilder.buildSummaryPrompt(
      compressedExtractions,
      type,
      memoryStr,
      contextStr,
    );

    return {
      enrichedPrompt,
      hasMemory: memoryContext.length > 0,
    };
  }

  /**
   * Store extraction results into Mem0 from the AI pipeline.
   */
  async storeExtractionMemory(
    userId: string,
    extractedData: Record<string, any>,
  ): Promise<void> {
    await this.memoryService.storeMemory(userId, extractedData, 'ai_extraction');
  }

  /**
   * Get the patient context from the database (cached).
   */
  private async getPatientContext(userId: string): Promise<PatientAiContext> {
    const cacheKey = this.cache.buildKey(['patient-context', userId]);
    const cached = await this.cache.get<PatientAiContext>(cacheKey);
    if (cached) return cached;

    const context = await this.contextBuilder.buildPatientContext(userId);
    await this.cache.set(cacheKey, context, 120_000); // 2 minute cache for patient context
    return context;
  }

  /**
   * Get relevant memories from Mem0 for a specific query.
   */
  private async getRelevantMemory(
    userId: string,
    query: string,
  ): Promise<MemorySearchResult[]> {
    try {
      return await this.memoryService.searchRelevantMemories(userId, query, 15);
    } catch {
      // Non-blocking: if memory search fails, continue without memory
      return [];
    }
  }
}
