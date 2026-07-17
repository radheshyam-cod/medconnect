import { Test, TestingModule } from '@nestjs/testing';
import { MemoryService } from './memory.service';
import { Mem0Provider } from './mem0.provider';
import { MemoryCache } from './memory-cache.service';
import { MemorySanitizer } from './memory-sanitizer.service';
import { MemoryLogger } from './memory-logger.service';

describe('MemoryService', () => {
  let service: MemoryService;
  let mem0Provider: {
    isAvailable: boolean;
    addMemory: jest.Mock;
    searchMemory: jest.Mock;
    getAllMemories: jest.Mock;
    deleteAllUserMemories: jest.Mock;
  };
  let cache: {
    buildKey: jest.Mock;
    get: jest.Mock;
    set: jest.Mock;
    delete: jest.Mock;
    invalidateByUser: jest.Mock;
    getSize: jest.Mock;
  };
  let sanitizer: {
    sanitizeMemoryData: jest.Mock;
    sanitizePatientMemory: jest.Mock;
  };

  beforeEach(async () => {
    mem0Provider = {
      isAvailable: true,
      addMemory: jest.fn(),
      searchMemory: jest.fn(),
      getAllMemories: jest.fn(),
      deleteAllUserMemories: jest.fn(),
    };
    cache = {
      buildKey: jest.fn().mockImplementation((parts) => parts.join(':')),
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      invalidateByUser: jest.fn(),
      getSize: jest.fn().mockReturnValue(3),
    };
    sanitizer = {
      sanitizeMemoryData: jest.fn().mockImplementation((d) => d),
      sanitizePatientMemory: jest.fn().mockImplementation((d) => d),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoryService,
        { provide: Mem0Provider, useValue: mem0Provider },
        { provide: MemoryCache, useValue: cache },
        { provide: MemorySanitizer, useValue: sanitizer },
        {
          provide: MemoryLogger,
          useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<MemoryService>(MemoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('storeMemory', () => {
    it('should store memory via Mem0 when available', async () => {
      mem0Provider.addMemory.mockResolvedValue({ id: 'mem_123' });

      const result = await service.storeMemory('user_123', { diseases: ['Diabetes'] }, 'test');

      expect(result).toBe(true);
      expect(mem0Provider.addMemory).toHaveBeenCalled();
      expect(cache.invalidateByUser).toHaveBeenCalledWith('user_123');
    });

    it('should skip storage when Mem0 is not available', async () => {
      mem0Provider.isAvailable = false;

      const result = await service.storeMemory('user_123', { data: 'test' }, 'test');

      expect(result).toBe(false);
      expect(mem0Provider.addMemory).not.toHaveBeenCalled();
    });

    it('should sanitize data before storing', async () => {
      mem0Provider.addMemory.mockResolvedValue({ id: 'mem_123' });

      await service.storeMemory('user_123', { raw: 'data' }, 'test');
      expect(sanitizer.sanitizeMemoryData).toHaveBeenCalledWith({ raw: 'data' });
    });

    it('should handle storage failure gracefully', async () => {
      mem0Provider.addMemory.mockRejectedValue(new Error('API error'));

      const result = await service.storeMemory('user_123', { data: 'test' }, 'test');
      expect(result).toBe(false);
    });
  });

  describe('searchRelevantMemories', () => {
    it('should return cached results when available', async () => {
      const cachedResults = [{ id: 'mem_1', score: 0.9, memory: 'Test' }];
      cache.get.mockResolvedValue(cachedResults);
      cache.buildKey.mockReturnValue('search:user_123:abc123:15');

      const result = await service.searchRelevantMemories('user_123', 'diabetes');
      expect(result).toEqual(cachedResults);
      expect(mem0Provider.searchMemory).not.toHaveBeenCalled();
    });

    it('should search Mem0 when no cache hit', async () => {
      cache.get.mockResolvedValue(null);
      mem0Provider.searchMemory.mockResolvedValue([
        { id: 'mem_1', score: 0.9, memory: 'Diabetes', category: 'conditions', createdAt: '2024-01-01', metadata: {} },
      ]);

      const result = await service.searchRelevantMemories('user_123', 'diabetes', 10);
      expect(result).toHaveLength(1);
      expect(mem0Provider.searchMemory).toHaveBeenCalledWith('diabetes', 'user_123', 10);
      expect(cache.set).toHaveBeenCalled();
    });

    it('should return empty array when Mem0 is not available', async () => {
      mem0Provider.isAvailable = false;

      const result = await service.searchRelevantMemories('user_123', 'test');
      expect(result).toEqual([]);
    });
  });

  describe('getPatientMemory', () => {
    it('should return cached memory when available', async () => {
      const cachedMemory = { medicalConditions: [{ name: 'Diabetes' }] };
      cache.get.mockResolvedValue(cachedMemory);

      const result = await service.getPatientMemory('user_123');
      expect(result).toEqual(cachedMemory);
      expect(mem0Provider.getAllMemories).not.toHaveBeenCalled();
    });

    it('should fetch and merge memories from Mem0', async () => {
      cache.get.mockResolvedValue(null);
      mem0Provider.getAllMemories.mockResolvedValue([
        { memory: JSON.stringify({ medicalConditions: [{ name: 'Diabetes' }] }) },
        { memory: JSON.stringify({ currentMedicines: [{ name: 'Metformin' }] }) },
      ]);

      const result = await service.getPatientMemory('user_123');
      expect(result).toHaveProperty('medicalConditions');
      expect(result).toHaveProperty('currentMedicines');
      expect(cache.set).toHaveBeenCalled();
    });

    it('should return empty object when Mem0 is not available', async () => {
      mem0Provider.isAvailable = false;

      const result = await service.getPatientMemory('user_123');
      expect(result).toEqual({});
    });

    it('should sanitize merged memory', async () => {
      cache.get.mockResolvedValue(null);
      mem0Provider.getAllMemories.mockResolvedValue([
        { memory: JSON.stringify({ medicalConditions: [] }) },
      ]);

      await service.getPatientMemory('user_123');
      expect(sanitizer.sanitizePatientMemory).toHaveBeenCalled();
    });
  });

  describe('addStructuredMemory', () => {
    it('should add structured memory with category and metadata', async () => {
      mem0Provider.addMemory.mockResolvedValue({ id: 'mem_123' });

      const result = await service.addStructuredMemory('user_123', 'medication', 'Metformin 500mg', { eventType: 'created' });

      expect(result).toBe(true);
      expect(mem0Provider.addMemory).toHaveBeenCalled();
      expect(cache.delete).toHaveBeenCalled();
    });

    it('should skip when Mem0 is not available', async () => {
      mem0Provider.isAvailable = false;

      const result = await service.addStructuredMemory('user_123', 'test', 'content');
      expect(result).toBe(false);
    });
  });

  describe('deleteAllUserData', () => {
    it('should delete all user memories and invalidate cache', async () => {
      mem0Provider.deleteAllUserMemories.mockResolvedValue(true);

      const result = await service.deleteAllUserData('user_123');
      expect(result).toBe(true);
      expect(mem0Provider.deleteAllUserMemories).toHaveBeenCalledWith('user_123');
      expect(cache.invalidateByUser).toHaveBeenCalledWith('user_123');
    });

    it('should handle deletion failure', async () => {
      mem0Provider.deleteAllUserMemories.mockRejectedValue(new Error('API error'));

      const result = await service.deleteAllUserData('user_123');
      expect(result).toBe(false);
    });
  });

  describe('healthCheck', () => {
    it('should return availability and cache size', async () => {
      const result = await service.healthCheck();
      expect(result).toHaveProperty('available');
      expect(result).toHaveProperty('memoryCount');
    });
  });
});
