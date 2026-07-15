import { Injectable } from '@nestjs/common';
import { Mem0Provider } from './mem0.provider';
import { MemoryCache } from './memory-cache.service';
import { MemorySanitizer } from './memory-sanitizer.service';
import { MemoryLogger } from './memory-logger.service';
import { MemorySearchResult, PatientMemory } from './interfaces/memory.interface';

@Injectable()
export class MemoryService {
  constructor(
    private readonly mem0Provider: Mem0Provider,
    private readonly cache: MemoryCache,
    private readonly sanitizer: MemorySanitizer,
    private readonly memoryLogger: MemoryLogger,
  ) {}

  async storeMemory(
    userId: string,
    memoryData: Record<string, any>,
    source: string,
  ): Promise<boolean> {
    if (!this.mem0Provider.isAvailable) {
      this.memoryLogger.warn('STORE_SKIPPED', { reason: 'Mem0 not available', source });
      return false;
    }

    try {
      const sanitizedData = this.sanitizer.sanitizeMemoryData(memoryData);
      const messages = [
        {
          role: 'user',
          content: `Patient medical data update from ${source}`,
        },
        {
          role: 'assistant',
          content: JSON.stringify(sanitizedData),
        },
      ];

      const result = await this.mem0Provider.addMemory(messages, userId, {
        source,
        timestamp: new Date().toISOString(),
      });

      // Invalidate cache for this user
      await this.cache.invalidateByUser(userId);

      return result !== null;
    } catch (error) {
      this.memoryLogger.error('STORE_MEMORY_FAILED', error as Error, { source });
      return false; // Never break the application
    }
  }

  async searchRelevantMemories(
    userId: string,
    query: string,
    limit: number = 15,
  ): Promise<MemorySearchResult[]> {
    const cacheKey = this.cache.buildKey(['search', userId, this.hashQuery(query), String(limit)]);

    // Try cache first
    const cached = await this.cache.get<MemorySearchResult[]>(cacheKey);
    if (cached) {
      return cached;
    }

    if (!this.mem0Provider.isAvailable) {
      return [];
    }

    try {
      const results = await this.mem0Provider.searchMemory(query, userId, limit);

      // Cache for 2 minutes (shorter TTL for search results)
      await this.cache.set(cacheKey, results, 120_000);

      return results;
    } catch (error) {
      this.memoryLogger.error('SEARCH_MEMORY_FAILED', error as Error, { queryLength: query.length });
      return [];
    }
  }

  async getPatientMemory(userId: string): Promise<PatientMemory> {
    const cacheKey = this.cache.buildKey(['memory', userId, 'patient']);
    const cached = await this.cache.get<PatientMemory>(cacheKey);
    if (cached) {
      return cached;
    }

    if (!this.mem0Provider.isAvailable) {
      return {};
    }

    try {
      const memories = await this.mem0Provider.getAllMemories(userId);
      const merged = this.mergeMemories(memories);
      const sanitized = this.sanitizer.sanitizePatientMemory(merged);

      // Cache for 5 minutes
      await this.cache.set(cacheKey, sanitized, 300_000);

      return sanitized;
    } catch (error) {
      this.memoryLogger.error('GET_MEMORY_FAILED', error as Error);
      return {};
    }
  }

  async addStructuredMemory(
    userId: string,
    category: string,
    content: string,
    metadata?: Record<string, any>,
  ): Promise<boolean> {
    if (!this.mem0Provider.isAvailable) return false;

    try {
      const messages = [
        {
          role: 'user',
          content: `Store patient ${category} information`,
        },
        {
          role: 'assistant',
          content,
        },
      ];

      const result = await this.mem0Provider.addMemory(messages, userId, {
        category,
        ...(metadata || {}),
      });

      const cacheKey = this.cache.buildKey(['memory', userId, 'patient']);
      await this.cache.delete(cacheKey);

      return result !== null;
    } catch (error) {
      this.memoryLogger.error('ADD_STRUCTURED_MEMORY_FAILED', error as Error, { category });
      return false;
    }
  }

  async deleteAllUserData(userId: string): Promise<boolean> {
    try {
      const result = await this.mem0Provider.deleteAllUserMemories(userId);
      await this.cache.invalidateByUser(userId);
      return result;
    } catch (error) {
      this.memoryLogger.error('DELETE_USER_DATA_FAILED', error as Error);
      return false;
    }
  }

  private mergeMemories(memories: any[]): PatientMemory {
    const merged: PatientMemory = {};

    for (const memory of memories) {
      try {
        const parsedMemory = typeof memory.memory === 'string'
          ? JSON.parse(memory.memory)
          : memory.memory;

        if (parsedMemory) {
          this.deepMerge(merged, parsedMemory);
        }
      } catch {
        // Skip unparseable memories
        continue;
      }
    }

    return merged;
  }

  private deepMerge(target: any, source: any): void {
    for (const key of Object.keys(source)) {
      if (source[key] === null || source[key] === undefined) continue;

      if (Array.isArray(source[key]) && Array.isArray(target[key])) {
        target[key] = [...target[key], ...source[key]];
      } else if (typeof source[key] === 'object' && !Array.isArray(source[key]) && typeof target[key] === 'object' && !Array.isArray(target[key])) {
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  private hashQuery(query: string): string {
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  async healthCheck(): Promise<{ available: boolean; memoryCount: number }> {
    return {
      available: this.mem0Provider.isAvailable,
      memoryCount: this.cache.getSize(),
    };
  }
}
