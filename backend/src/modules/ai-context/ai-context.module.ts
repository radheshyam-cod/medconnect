import { Global, Module } from '@nestjs/common';
import { AIContextService } from './ai-context.service';
import { ContextBuilder } from './context-builder.service';
import { PromptBuilder } from './prompt-builder.service';

@Global()
@Module({
  providers: [AIContextService, ContextBuilder, PromptBuilder],
  exports: [AIContextService, ContextBuilder, PromptBuilder],
})
export class AIContextModule {}
