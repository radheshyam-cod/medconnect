import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AIContextService } from './ai-context.service';
import { ContextBuilder } from './context-builder.service';
import { PromptBuilder } from './prompt-builder.service';
import {
  CONTEXT_PROVIDER_TOKEN,
} from './providers/context-provider.interface';
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
    ContextProcessor,
    // ── Multi-provider registration ──
    // Each context provider registers under the same injection token.
    // ProviderRegistry uses @Inject(CONTEXT_PROVIDER_TOKEN) to receive
    // them all without importing concrete classes.
    // `multi: true` is supported by NestJS at runtime but not in the
    // Provider type union — the cast is intentional and safe.
    {
      provide: CONTEXT_PROVIDER_TOKEN,
      useExisting: Mem0ContextProvider,
      multi: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    {
      provide: CONTEXT_PROVIDER_TOKEN,
      useExisting: AlchemystContextProvider,
      multi: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  ],
  exports: [
    AIContextService,
    ContextBuilder,
    PromptBuilder,
    ContextAggregator,
    ContextSynchronizer,
  ],
})
export class AIContextModule {}
