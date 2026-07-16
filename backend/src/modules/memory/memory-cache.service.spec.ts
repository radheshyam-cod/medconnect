import { Test, TestingModule } from '@nestjs/testing';
import { MemoryCache } from './memory-cache.service';
import { ConfigService } from '@nestjs/config';
import { MemoryLogger } from './memory-logger.service';

describe('MemoryCache', () => {
  let cache: MemoryCache;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoryCache,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
              if (key === 'MEM0_CACHE_TTL') return 300;
              if (key === 'MEM0_CACHE_MAX_SIZE') return 500;
              return defaultValue;
            }),
          },
        },
        {
          provide: MemoryLogger,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    cache = module.get<MemoryCache>(MemoryCache);
  });

  it('should be defined', () => {
    expect(cache).toBeDefined();
  });

  describe('buildKey', () => {
    it('should join parts with colon', () => {
      expect(cache.buildKey(['memory', 'user_123', 'patient'])).toBe('memory:user_123:patient');
    });
  });

  describe('get and set', () => {
    it('should store and retrieve values', async () => {
      const data = { test: 'value', number: 42 };
      await cache.set('test-key', data);
      const retrieved = await cache.get<typeof data>('test-key');
      expect(retrieved).toEqual(data);
    });

    it('should return null for missing keys', async () => {
      const retrieved = await cache.get('nonexistent');
      expect(retrieved).toBeNull();
    });

    it('should respect custom TTL', async () => {
      const data = { ephemeral: true };
      await cache.set('short-lived', data, -1); // expired immediately
      const retrieved = await cache.get('short-lived');
      expect(retrieved).toBeNull();
    });
  });

  describe('delete', () => {
    it('should remove a key from cache', async () => {
      await cache.set('delete-me', 'value');
      await cache.delete('delete-me');
      const retrieved = await cache.get('delete-me');
      expect(retrieved).toBeNull();
    });
  });

  describe('invalidateByPrefix', () => {
    it('should remove all keys with the given prefix', async () => {
      await cache.set('memory:user1:patient', {});
      await cache.set('memory:user1:search', {});
      await cache.set('memory:user2:patient', {});
      await cache.invalidateByPrefix('memory:user1:');
      expect(await cache.get('memory:user1:patient')).toBeNull();
      expect(await cache.get('memory:user1:search')).toBeNull();
      expect(await cache.get('memory:user2:patient')).toBeDefined();
    });
  });

  describe('invalidateByUser', () => {
    it('should clear memory and search keys for the user', async () => {
      await cache.set('memory:user_123:patient', {});
      await cache.set('search:user_123:abc123', {});
      await cache.set('memory:other_user:patient', {});
      await cache.invalidateByUser('user_123');
      expect(await cache.get('memory:user_123:patient')).toBeNull();
      expect(await cache.get('search:user_123:abc123')).toBeNull();
      expect(await cache.get('memory:other_user:patient')).toBeDefined();
    });
  });

  describe('clear', () => {
    it('should remove all entries', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.clear();
      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
      expect(cache.getSize()).toBe(0);
    });
  });

  describe('getSize', () => {
    it('should return the number of cached entries', async () => {
      await cache.set('a', 1);
      await cache.set('b', 2);
      expect(cache.getSize()).toBe(2);
    });
  });

  describe('eviction', () => {
    it('should evict oldest entry when at capacity', async () => {
      // Override to small max size for this test
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MemoryCache,
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue(2) }, // max 2 entries
          },
          {
            provide: MemoryLogger,
            useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
          },
        ],
      }).compile();

      const smallCache = module.get<MemoryCache>(MemoryCache);
      await smallCache.set('first', 1);
      await smallCache.set('second', 2);
      await smallCache.set('third', 3); // should evict 'first'
      
      expect(await smallCache.get('first')).toBeNull();
      expect(await smallCache.get('second')).toBeDefined();
      expect(await smallCache.get('third')).toBeDefined();
    });
  });
});
