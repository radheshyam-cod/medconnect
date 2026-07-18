import { Injectable } from '@nestjs/common';
import { PromptBuilder } from './prompt-builder.service';
import { ContextAggregator } from './context-aggregator.service';
import { MemoryLogger } from '../memory/memory-logger.service';

@Injectable()
export class AIContextService {
  constructor(
    private readonly contextAggregator: ContextAggregator,
    private readonly promptBuilder: PromptBuilder,
    private readonly memoryLogger: MemoryLogger,
  ) {}

  /**
   * Build enriched context for an AI extraction call.
   */
  async buildExtractionContext(
    userId: string,
    rawText: string,
  ): Promise<{ enrichedPrompt: string; hasMemory: boolean }> {
    const medicalContext = await this.contextAggregator.aggregateContext(
      userId,
      'medical conditions diseases medicines',
    );

    const enrichedPrompt = this.promptBuilder.buildExtractionPrompt(
      rawText,
      medicalContext,
    );

    this.memoryLogger.debug('EXTRACTION_CONTEXT_BUILT', {
      hasMemory: true, // simplified
    });

    return {
      enrichedPrompt,
      hasMemory: true,
    };
  }

  /**
   * Build enriched context for a timeline generation call.
   */
  async buildTimelineContext(
    userId: string,
    extractions: Record<string, unknown>[],
  ): Promise<{ enrichedPrompt: string; hasMemory: boolean }> {
    const medicalContext = await this.contextAggregator.aggregateContext(
      userId,
      'health timeline events medical history',
    );

    const compressedExtractions = this.promptBuilder.compressExtractions(extractions);

    const enrichedPrompt = this.promptBuilder.buildTimelinePrompt(
      compressedExtractions,
      medicalContext,
    );

    return {
      enrichedPrompt,
      hasMemory: true,
    };
  }

  /**
   * Build enriched context for a patient summary call.
   */
  async buildSummaryContext(
    userId: string,
    extractions: Record<string, unknown>[],
    type: 'PATIENT' | 'DOCTOR',
  ): Promise<{ enrichedPrompt: string; hasMemory: boolean }> {
    const medicalContext = await this.contextAggregator.aggregateContext(
      userId,
      'patient summary medical history conditions medications allergies',
    );

    const compressedExtractions = this.promptBuilder.compressExtractions(extractions);

    const enrichedPrompt = this.promptBuilder.buildSummaryPrompt(
      compressedExtractions,
      type,
      medicalContext,
    );

    return {
      enrichedPrompt,
      hasMemory: true,
    };
  }

  /**
   * Store extraction results into providers from the AI pipeline.
   * This is where ContextSynchronizer would take over via BullMQ.
   */
  async storeExtractionMemory(): Promise<void> {
    // We do NOT sync temporary extractions based on the new rules.
    // Only validated facts go into context. 
    this.memoryLogger.debug('storeExtractionMemory SKIPPED (Awaiting validated sync)');
  }
}

