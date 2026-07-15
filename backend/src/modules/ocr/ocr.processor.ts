import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { OcrService } from './ocr.service';

@Processor('ocr')
export class OcrProcessor extends WorkerHost {
  private readonly logger = new Logger(OcrProcessor.name);

  constructor(private readonly ocrService: OcrService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);

    if (job.name === 'process-document') {
      const { documentId } = job.data;
      if (!documentId) {
        throw new Error('documentId is required in job data');
      }
      
      try {
        await this.ocrService.processDocument(documentId);
      } catch (error) {
        this.logger.error(`Error processing document ${documentId}`, error);
        throw error; // Let BullMQ handle retries
      }
    }
  }
}
