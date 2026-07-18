import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ProviderRegistry } from './providers/provider-registry.service';
import { MemoryLogger } from '../memory/memory-logger.service';

@Processor('ai-context')
@Injectable()
export class ContextProcessor extends WorkerHost {
  private readonly logger = new Logger(ContextProcessor.name);

  constructor(
    private readonly providerRegistry: ProviderRegistry,
    private readonly memoryLogger: MemoryLogger,
  ) {
    super();
  }

  async process(job: Job<Record<string, unknown>, unknown, string>): Promise<unknown> {
    this.logger.log(`Processing ai-context job ${job.id} type: ${job.name}`);

    if (job.name === 'sync-context') {
      return this.handleSyncContext(job);
    }

    this.logger.warn(`Unknown job type: ${job.name}`);
  }

  private async handleSyncContext(job: Job): Promise<boolean> {
    const { userId, eventType, data, timestamp } = job.data;

    this.memoryLogger.log('CONTEXT_SYNC_PROCESSING', {
      eventType,
      timestamp,
    });

    try {
      // Loop over all registered context providers and push the new validated data to them.
      const providers = this.providerRegistry.getProviders();
      
      const updatePromises = providers.map((provider: any) =>
        provider.updateContext(userId, data).catch((err: Error) => {
          this.logger.error(`Failed to update context in provider ${provider.name}: ${err.message}`);
          // Don't throw here, try to update others
        })
      );

      await Promise.all(updatePromises);
      return true;
    } catch (error) {
      this.memoryLogger.error('CONTEXT_SYNC_PROCESSING_FAILED', error as Error, { eventType });
      throw error; // Let BullMQ handle retries
    }
  }
}
