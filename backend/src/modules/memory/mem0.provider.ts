import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MemoryLogger } from './memory-logger.service';
import { MemoryConfig, MemorySearchResult } from './interfaces/memory.interface';

// Dynamic import type for mem0ai
interface Mem0Client {
  add(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>, config?: Record<string, any>): Promise<any>;
  search(query: string, options?: Record<string, any>): Promise<any[]>;
  getAll(options?: Record<string, any>): Promise<any[]>;
  delete(memoryId: string): Promise<void>;
}

@Injectable()
export class Mem0Provider implements OnModuleInit {
  private readonly logger = new Logger(Mem0Provider.name);
  private client: Mem0Client | null = null;
  private config: MemoryConfig;
  private isEnabled = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly memoryLogger: MemoryLogger,
  ) {
    this.config = {
      apiKey: this.configService.get<string>('MEM0_API_KEY', ''),
      projectId: this.configService.get<string>('MEM0_PROJECT_ID', ''),
      orgId: this.configService.get<string>('MEM0_ORG_ID', ''),
      baseUrl: this.configService.get<string>('MEM0_BASE_URL', ''),
      timeout: this.configService.get<number>('MEM0_TIMEOUT', 10000),
      retries: this.configService.get<number>('MEM0_RETRIES', 3),
      cacheTtl: this.configService.get<number>('MEM0_CACHE_TTL', 300),
      batchSize: this.configService.get<number>('MEM0_BATCH_SIZE', 10),
    };
  }

  async onModuleInit() {
    if (this.config.apiKey) {
      try {
        const { default: MemoryClient } = await import('mem0ai');
        const clientConfig: Record<string, any> = {
          apiKey: this.config.apiKey,
        };
        if (this.config.projectId) clientConfig.projectId = this.config.projectId;
        if (this.config.orgId) clientConfig.orgId = this.config.orgId;
        if (this.config.baseUrl) clientConfig.baseUrl = this.config.baseUrl;

        this.client = new (MemoryClient as any)(clientConfig) as Mem0Client;
        this.isEnabled = true;
        this.logger.log('Mem0 client initialized successfully');
      } catch (error) {
        this.logger.error('Failed to initialize Mem0 client', error);
        this.isEnabled = false;
      }
    } else {
      this.logger.warn('MEM0_API_KEY not configured. Mem0 memory features disabled.');
      this.isEnabled = false;
    }
  }

  get isAvailable(): boolean {
    return this.isEnabled && this.client !== null;
  }

  async addMemory(
    messages: Array<{ role: string; content: string }>,
    userId: string,
    metadata?: Record<string, any>,
  ): Promise<any> {
    if (!this.isAvailable) {
      this.memoryLogger.warn('MEMORY_ADD_SKIPPED', { reason: 'Mem0 not configured', userId: this.maskId(userId) });
      return null;
    }

    try {
      const config: Record<string, any> = {
        user_id: `patient:${userId}`,
        metadata: {
          ...(metadata || {}),
          timestamp: new Date().toISOString(),
        },
      };

      const typedMessages = messages.map((m) => ({
        role: (m.role === 'user' || m.role === 'assistant' || m.role === 'system' ? m.role : 'user') as 'user' | 'assistant' | 'system',
        content: m.content,
      }));

      const result = await this.client!.add(typedMessages, config);
      this.memoryLogger.debug('MEMORY_ADDED', { userId: this.maskId(userId) });
      return result;
    } catch (error) {
      this.memoryLogger.error('MEMORY_ADD_FAILED', error as Error, { userId: this.maskId(userId) });
      return null;
    }
  }

  async searchMemory(
    query: string,
    userId: string,
    limit: number = 10,
  ): Promise<MemorySearchResult[]> {
    if (!this.isAvailable) {
      this.memoryLogger.warn('MEMORY_SEARCH_SKIPPED', { reason: 'Mem0 not configured' });
      return [];
    }

    try {
      const results = await this.client!.search(query, {
        user_id: `patient:${userId}`,
        limit,
      });

      this.memoryLogger.debug('MEMORY_SEARCHED', {
        userId: this.maskId(userId),
        queryLength: query.length,
        resultsCount: results?.length || 0,
      });

      return (results || []).map((r: any) => ({
        id: r.id || '',
        score: r.score || 0,
        memory: r.memory || '',
        category: r.category || (r.metadata?.category || null),
        metadata: r.metadata || {},
        createdAt: r.created_at || r.createdAt || new Date().toISOString(),
      }));
    } catch (error) {
      this.memoryLogger.error('MEMORY_SEARCH_FAILED', error as Error, { userId: this.maskId(userId) });
      return [];
    }
  }

  async getAllMemories(userId: string): Promise<any[]> {
    if (!this.isAvailable) return [];

    try {
      const memories = await this.client!.getAll({
        user_id: `patient:${userId}`,
      });
      return memories || [];
    } catch (error) {
      this.memoryLogger.error('MEMORY_GET_ALL_FAILED', error as Error, { userId: this.maskId(userId) });
      return [];
    }
  }

  async deleteMemory(memoryId: string): Promise<boolean> {
    if (!this.isAvailable) return false;

    try {
      await this.client!.delete(memoryId);
      this.memoryLogger.debug('MEMORY_DELETED', { memoryId: this.maskId(memoryId) });
      return true;
    } catch (error) {
      this.memoryLogger.error('MEMORY_DELETE_FAILED', error as Error, { memoryId: this.maskId(memoryId) });
      return false;
    }
  }

  async deleteAllUserMemories(userId: string): Promise<boolean> {
    if (!this.isAvailable) return false;

    try {
      const memories = await this.getAllMemories(userId);
      if (memories && memories.length > 0) {
        for (const memory of memories) {
          if (memory.id) {
            await this.deleteMemory(memory.id);
          }
        }
      }
      this.memoryLogger.debug('ALL_USER_MEMORIES_DELETED', { userId: this.maskId(userId) });
      return true;
    } catch (error) {
      this.memoryLogger.error('DELETE_ALL_MEMORIES_FAILED', error as Error, { userId: this.maskId(userId) });
      return false;
    }
  }

  private maskId(id: string): string {
    if (!id || id.length < 8) return '***';
    return `${id.substring(0, 4)}...${id.substring(id.length - 4)}`;
  }
}
