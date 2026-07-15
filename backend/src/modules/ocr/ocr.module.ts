import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OcrService } from './ocr.service';
import { OcrProcessor } from './ocr.processor';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'ocr',
    }),
    StorageModule,
  ],
  providers: [OcrService, OcrProcessor],
  exports: [OcrService],
})
export class OcrModule {}

