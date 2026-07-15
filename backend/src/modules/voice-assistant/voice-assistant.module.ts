import { Module } from '@nestjs/common';
import { VoiceAssistantController } from './voice-assistant.controller';
import { VoiceAssistantService } from './voice-assistant.service';
import { AIContextModule } from '../ai-context/ai-context.module';

@Module({
  imports: [AIContextModule],
  controllers: [VoiceAssistantController],
  providers: [VoiceAssistantService],
  exports: [VoiceAssistantService],
})
export class VoiceAssistantModule {}
