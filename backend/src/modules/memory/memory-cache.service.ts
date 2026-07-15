import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MemoryLogger } from './memory-logger.service';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

@Injectable()
export class MemoryCache {
  private readonly inMemoryCache: Map<string, CacheEntry<any>> = new Map();
  private readonly defaultTtl: number;
  private readonly maxSize: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly memoryLogger: MemoryLogger,
  ) {
    this.defaultTtl = this.configService.get<number>('MEM0_CACHE_TTL', 300) * 1000; // default 5 min
    this.maxSize = this.configService.get<number>('MEM0_CACHE_MAX_SIZE', 500);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.inMemoryCache.get(key);
    if (!entry) {
      this.memoryLogger.debug('CACHE_MISS', { key });
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.inMemoryCache.delete(key);
      this.memoryLogger.debug('CACHE_EXPIRED', { key });
      return null;
    }
    this.memoryLogger.debug('CACHE_HIT', { key });
    return entry.data as T;
  }

  async set<T>(key: string, data: T, ttlMs?: number): Promise<void> {
    // Evict oldest entry if at capacity
    if (this.inMemoryCache.size >= this.maxSize) {
      const oldestKey = this.inMemoryCache.keys().next().value;
      if (oldestKey) {
        this.inMemoryCache.delete(oldestKey);
      }
    }

    this.inMemoryCache.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtl),
    });
    this.memoryLogger.debug('CACHE_SET', { key, ttl: ttlMs ?? this.defaultTtl });
  }

  async delete(key: string): Promise<void> {
    this.inMemoryCache.delete(key);
    this.memoryLogger.debug('CACHE_DELETE', { key });
  }

  async invalidateByPrefix(prefix: string): Promise<void> {
    let count = 0;
    for (const key of this.inMemoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.inMemoryCache.delete(key);
        count++;
      }
    }
    if (count > 0) {
      this.memoryLogger.debug('CACHE_INVALIDATE_PREFIX', { prefix, count });
    }
  }

  async invalidateByUser(userId: string): Promise<void> {
    const prefix = `memory:${userId}:`;
    const resultsPrefix = `search:${userId}:`;
    await this.invalidateByPrefix(prefix);
    await this.invalidateByPrefix(resultsPrefix);
    this.memoryLogger.debug('CACHE_INVALIDATE_USER', { userId });
  }

  async clear(): Promise<void> {
    const size = this.inMemoryCache.size;
    this.inMemoryCache.clear();
    this.memoryLogger.debug('CACHE_CLEAR', { clearedEntries: size });
  }

  getSize(): number {
    return this.inMemoryCache.size;
  }

  buildKey(parts: string[]): string {
    return parts.join(':');
  }
}
