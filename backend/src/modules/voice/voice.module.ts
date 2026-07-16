import { Module } from '@nestjs/common';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';
import { GnaniProviderFactory } from './providers/gnani.provider';

@Module({
  controllers: [VoiceController],
  providers: [
    GnaniProviderFactory,
    VoiceService,
  ],
  exports: [VoiceService],
})
export class VoiceModule {}
