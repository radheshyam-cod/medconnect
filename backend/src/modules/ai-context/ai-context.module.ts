import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AIContextService } from './ai-context.service';
import { ContextBuilder } from './context-builder.service';
import { PromptBuilder } from './prompt-builder.service';
import { ProviderRegistry } from './providers/provider-registry.service';
import { ContextHealthService } from './providers/context-health.service';
import { Mem0ContextProvider } from './providers/mem0-context.provider';
import { AlchemystContextProvider } from './providers/alchemyst-context.provider';
import { ContextAggregator } from './context-aggregator.service';
import { ContextSynchronizer } from './context-synchronizer.service';
import { ContextProcessor } from './context-processor.service';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'ai-context',
    }),
  ],
  providers: [
    AIContextService, 
    ContextBuilder, 
    PromptBuilder,
    ProviderRegistry,
    ContextHealthService,
    Mem0ContextProvider,
    AlchemystContextProvider,
    ContextAggregator,
    ContextSynchronizer,
    ContextProcessor
  ],
  exports: [AIContextService, ContextBuilder, PromptBuilder, ContextAggregator, ContextSynchronizer],
})
export class AIContextModule {}
