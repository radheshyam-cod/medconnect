import { Injectable, Logger } from '@nestjs/common';
import { IContextProvider, ContextQuery } from './context-provider.interface';
import { MedicalContext } from '../dto/medical-context.dto';
import { MemoryService } from '../../memory/memory.service';
import crypto from 'crypto';

@Injectable()
export class Mem0ContextProvider implements IContextProvider {
  name = 'Mem0';
  private readonly logger = new Logger(Mem0ContextProvider.name);

  constructor(private readonly memoryService: MemoryService) {}

  get isAvailable(): boolean {
    return true; // MemoryService internal logic handles actual availability
  }

  async retrieveContext(query: ContextQuery): Promise<Partial<MedicalContext>> {
    try {
      const results = await this.memoryService.searchRelevantMemories(query.userId, query.query, query.limit || 15);
      
      const importantEvents = results.map(r => ({
        id: r.id,
        description: r.memory,
        date: r.createdAt,
        meta: {
          version: '1.0',
          source: 'Mem0',
          timestamp: new Date().toISOString(),
          confidence: 0.95, // Mem0 confidence base score
          hash: crypto.createHash('md5').update(r.memory).digest('hex'),
        }
      }));

      return {
        importantEvents,
        // Map other fields from Mem0 if they are structured properly in metadata
      };
    } catch (error) {
      this.logger.error(`Failed to retrieve Mem0 context: ${(error as Error).message}`);
      return {};
    }
  }

  async updateContext(userId: string, data: Partial<MedicalContext>): Promise<void> {
    // Implement Mem0 specific update logic here mapping MedicalContext to Mem0 storage format
    // For now, this is a placeholder for the actual sync logic
    this.logger.debug(`Updating Mem0 context for user ${userId}`);
  }
}
