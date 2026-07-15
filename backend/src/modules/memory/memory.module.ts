import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { MemoryService } from './memory.service';
import { Mem0Provider } from './mem0.provider';
import { MemoryCache } from './memory-cache.service';
import { MemorySanitizer } from './memory-sanitizer.service';
import { MemorySynchronizer } from './memory-synchronizer.service';
import { MemoryLogger } from './memory-logger.service';
import { MemoryProcessor } from './memory.processor';

@Global()
@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: 'memory',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    }),
  ],
  providers: [
    Mem0Provider,
    MemoryService,
    MemoryCache,
    MemorySanitizer,
    MemorySynchronizer,
    MemoryLogger,
    MemoryProcessor,
  ],
  exports: [
    Mem0Provider,
    MemoryService,
    MemoryCache,
    MemorySanitizer,
    MemorySynchronizer,
    MemoryLogger,
  ],
})
export class MemoryModule {}
