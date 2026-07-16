import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Mem0Provider } from './mem0.provider';
import { MemoryLogger } from './memory-logger.service';

// ─── Mock Mem0 Client ───────────────────────────────────────────
const mockAdd = jest.fn();
const mockSearch = jest.fn();
const mockGetAll = jest.fn();
const mockDelete = jest.fn();

class MockMemoryClient {
  add = mockAdd;
  search = mockSearch;
  getAll = mockGetAll;
  delete = mockDelete;
}

jest.mock('mem0ai', () => ({
  __esModule: true,
  default: MockMemoryClient,
}), { virtual: true });

// ─── Helpers ────────────────────────────────────────────────────
function createConfigMock(overrides: Record<string, any> = {}) {
  const defaults: Record<string, any> = {
    MEM0_API_KEY: 'm0_key_test_api_key_123',
    MEM0_PROJECT_ID: 'proj_test',
    MEM0_ORG_ID: 'org_test',
    MEM0_BASE_URL: 'https://api.mem0.ai/v1',
    MEM0_TIMEOUT: 10000,
    MEM0_RETRIES: 3,
    MEM0_CACHE_TTL: 300,
    MEM0_BATCH_SIZE: 10,
  };
  const config = { ...defaults, ...overrides };
  return {
    get: jest.fn((key: string, defaultValue?: any) => config[key] ?? defaultValue),
  };
}

async function createTestModule(configMock: Record<string, any>): Promise<TestingModule> {
  return Test.createTestingModule({
    providers: [
      Mem0Provider,
      { provide: ConfigService, useValue: configMock },
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
}

describe('Mem0Provider', () => {
  let provider: Mem0Provider;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Constructor ──────────────────────────────────────────────

  describe('constructor', () => {
    it('should read config from ConfigService', async () => {
      const configMock = createConfigMock();
      const module = await createTestModule(configMock);
      const p = module.get<Mem0Provider>(Mem0Provider);

      expect(configMock.get).toHaveBeenCalledWith('MEM0_API_KEY', '');
      expect(configMock.get).toHaveBeenCalledWith('MEM0_PROJECT_ID', '');
      expect(configMock.get).toHaveBeenCalledWith('MEM0_BASE_URL', '');
      expect(configMock.get).toHaveBeenCalledWith('MEM0_TIMEOUT', 10000);
    });

    it('should have isAvailable=false before init', async () => {
      const module = await createTestModule(createConfigMock());
      const p = module.get<Mem0Provider>(Mem0Provider);
      expect(p.isAvailable).toBe(false);
    });
  });

  // ─── onModuleInit ─────────────────────────────────────────────

  describe('onModuleInit', () => {
    it('should initialize client when API key is provided', async () => {
      const module = await createTestModule(createConfigMock());
      provider = module.get<Mem0Provider>(Mem0Provider);
      await provider.onModuleInit();
      expect(provider.isAvailable).toBe(true);
    });

    it('should NOT initialize when API key is empty', async () => {
      const module = await createTestModule(createConfigMock({ MEM0_API_KEY: '' }));
      provider = module.get<Mem0Provider>(Mem0Provider);
      await provider.onModuleInit();
      expect(provider.isAvailable).toBe(false);
    });

    it('should NOT initialize when API key is missing', async () => {
      const configMock = { get: jest.fn((_key: string, defaultValue?: any) => defaultValue) };
      const module = await createTestModule(configMock);
      provider = module.get<Mem0Provider>(Mem0Provider);
      await provider.onModuleInit();
      expect(provider.isAvailable).toBe(false);
    });
  });

  // ─── addMemory ────────────────────────────────────────────────

  describe('addMemory', () => {
    beforeEach(async () => {
      const module = await createTestModule(createConfigMock());
      provider = module.get<Mem0Provider>(Mem0Provider);
      await provider.onModuleInit();
    });

    it('should add memory with user_id and metadata', async () => {
      mockAdd.mockResolvedValue({ id: 'mem_123', messages: [] });
      const messages = [
        { role: 'user' as const, content: 'Patient data' },
        { role: 'assistant' as const, content: JSON.stringify({ diseases: ['Diabetes'] }) },
      ];

      const result = await provider.addMemory(messages, 'user_123', { source: 'test' });

      expect(result).toEqual({ id: 'mem_123', messages: [] });
      expect(mockAdd).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'Patient data' }),
        ]),
        expect.objectContaining({
          user_id: 'patient:user_123',
          metadata: expect.objectContaining({
            source: 'test',
            timestamp: expect.any(String),
          }),
        }),
      );
    });

    it('should return null when Mem0 is not available', async () => {
      const unavailModule = await createTestModule(createConfigMock({ MEM0_API_KEY: '' }));
      const unavail = unavailModule.get<Mem0Provider>(Mem0Provider);
      // Don't call onModuleInit — stays unavailable

      const result = await unavail.addMemory(
        [{ role: 'user', content: 'test' }],
        'user_123',
      );
      expect(result).toBeNull();
      expect(mockAdd).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockAdd.mockRejectedValue(new Error('API rate limit exceeded'));

      const result = await provider.addMemory(
        [{ role: 'user', content: 'test' }],
        'user_123',
      );
      expect(result).toBeNull();
    });

    it('should normalize invalid message roles to "user"', async () => {
      mockAdd.mockResolvedValue({ id: 'mem_456' });

      await provider.addMemory(
        [
          { role: 'user', content: 'User message' },
          { role: 'assistant', content: 'Assistant message' },
          { role: 'system', content: 'System message' },
          { role: 'invalid_role', content: 'Should become user' },
        ],
        'user_123',
      );

      expect(mockAdd).toHaveBeenCalledWith(
        [
          { role: 'user', content: 'User message' },
          { role: 'assistant', content: 'Assistant message' },
          { role: 'system', content: 'System message' },
          { role: 'user', content: 'Should become user' }, // invalid → user
        ],
        expect.any(Object),
      );
    });
  });

  // ─── searchMemory ─────────────────────────────────────────────

  describe('searchMemory', () => {
    beforeEach(async () => {
      const module = await createTestModule(createConfigMock());
      provider = module.get<Mem0Provider>(Mem0Provider);
      await provider.onModuleInit();
    });

    it('should return mapped search results', async () => {
      mockSearch.mockResolvedValue([
        {
          id: 'mem_1',
          score: 0.95,
          memory: 'Patient has diabetes',
          category: 'conditions',
          metadata: { source: 'extraction' },
          created_at: '2024-01-15T00:00:00Z',
        },
        {
          id: 'mem_2',
          score: 0.88,
          memory: 'Patient takes Metformin',
          metadata: { category: 'medications' },
          created_at: '2024-01-10T00:00:00Z',
        },
      ]);

      const results = await provider.searchMemory('diabetes medications', 'user_123', 10);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        id: 'mem_1',
        score: 0.95,
        memory: 'Patient has diabetes',
        category: 'conditions',
        metadata: { source: 'extraction' },
        createdAt: '2024-01-15T00:00:00Z',
      });
      // category falls back to metadata.category when not top-level
      expect(results[1].category).toBe('medications');
      expect(mockSearch).toHaveBeenCalledWith('diabetes medications', {
        user_id: 'patient:user_123',
        limit: 10,
      });
    });

    it('should return empty array when Mem0 is not available', async () => {
      const unavailModule = await createTestModule(createConfigMock({ MEM0_API_KEY: '' }));
      const unavail = unavailModule.get<Mem0Provider>(Mem0Provider);

      const results = await unavail.searchMemory('test', 'user_123');
      expect(results).toEqual([]);
      expect(mockSearch).not.toHaveBeenCalled();
    });

    it('should handle empty results', async () => {
      mockSearch.mockResolvedValue([]);
      const results = await provider.searchMemory('nothing', 'user_123');
      expect(results).toEqual([]);
    });

    it('should handle null results', async () => {
      mockSearch.mockResolvedValue(null);
      const results = await provider.searchMemory('test', 'user_123');
      expect(results).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      mockSearch.mockRejectedValue(new Error('Search unavailable'));
      const results = await provider.searchMemory('test', 'user_123');
      expect(results).toEqual([]);
    });

    it('should use default limit of 10', async () => {
      mockSearch.mockResolvedValue([]);
      await provider.searchMemory('test', 'user_123');
      expect(mockSearch).toHaveBeenCalledWith('test', {
        user_id: 'patient:user_123',
        limit: 10,
      });
    });
  });

  // ─── getAllMemories ───────────────────────────────────────────

  describe('getAllMemories', () => {
    beforeEach(async () => {
      const module = await createTestModule(createConfigMock());
      provider = module.get<Mem0Provider>(Mem0Provider);
      await provider.onModuleInit();
    });

    it('should return all memories for a user', async () => {
      mockGetAll.mockResolvedValue([
        { id: 'mem_1', memory: 'Memory 1' },
        { id: 'mem_2', memory: 'Memory 2' },
      ]);

      const memories = await provider.getAllMemories('user_123');
      expect(memories).toHaveLength(2);
      expect(mockGetAll).toHaveBeenCalledWith({
        user_id: 'patient:user_123',
      });
    });

    it('should return empty array when not available', async () => {
      const unavailModule = await createTestModule(createConfigMock({ MEM0_API_KEY: '' }));
      const unavail = unavailModule.get<Mem0Provider>(Mem0Provider);

      const result = await unavail.getAllMemories('user_123');
      expect(result).toEqual([]);
      expect(mockGetAll).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockGetAll.mockRejectedValue(new Error('GetAll failed'));
      const result = await provider.getAllMemories('user_123');
      expect(result).toEqual([]);
    });
  });

  // ─── deleteMemory ─────────────────────────────────────────────

  describe('deleteMemory', () => {
    beforeEach(async () => {
      const module = await createTestModule(createConfigMock());
      provider = module.get<Mem0Provider>(Mem0Provider);
      await provider.onModuleInit();
    });

    it('should delete a memory by ID and return true', async () => {
      mockDelete.mockResolvedValue(undefined);
      const result = await provider.deleteMemory('mem_123');
      expect(result).toBe(true);
      expect(mockDelete).toHaveBeenCalledWith('mem_123');
    });

    it('should return false when not available', async () => {
      const unavailModule = await createTestModule(createConfigMock({ MEM0_API_KEY: '' }));
      const unavail = unavailModule.get<Mem0Provider>(Mem0Provider);

      const result = await unavail.deleteMemory('mem_123');
      expect(result).toBe(false);
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockDelete.mockRejectedValue(new Error('Delete failed'));
      const result = await provider.deleteMemory('mem_123');
      expect(result).toBe(false);
    });
  });

  // ─── deleteAllUserMemories ────────────────────────────────────

  describe('deleteAllUserMemories', () => {
    beforeEach(async () => {
      const module = await createTestModule(createConfigMock());
      provider = module.get<Mem0Provider>(Mem0Provider);
      await provider.onModuleInit();
    });

    it('should delete all memories for a user', async () => {
      mockGetAll.mockResolvedValue([
        { id: 'mem_1' },
        { id: 'mem_2' },
        { id: 'mem_3' },
      ]);
      mockDelete.mockResolvedValue(undefined);

      const result = await provider.deleteAllUserMemories('user_123');

      expect(result).toBe(true);
      expect(mockDelete).toHaveBeenCalledTimes(3);
      expect(mockDelete).toHaveBeenCalledWith('mem_1');
      expect(mockDelete).toHaveBeenCalledWith('mem_2');
      expect(mockDelete).toHaveBeenCalledWith('mem_3');
    });

    it('should handle no memories gracefully', async () => {
      mockGetAll.mockResolvedValue([]);
      const result = await provider.deleteAllUserMemories('user_123');
      expect(result).toBe(true);
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('should return false when not available', async () => {
      const unavailModule = await createTestModule(createConfigMock({ MEM0_API_KEY: '' }));
      const unavail = unavailModule.get<Mem0Provider>(Mem0Provider);

      const result = await unavail.deleteAllUserMemories('user_123');
      expect(result).toBe(false);
    });

    it('should handle API errors from getAllMemories (errors are swallowed internally)', async () => {
      mockGetAll.mockRejectedValue(new Error('Cannot list memories'));
      // getAllMemories has its own try-catch that returns [] on error
      // so deleteAllUserMemories sees no memories and returns true
      const result = await provider.deleteAllUserMemories('user_123');
      expect(result).toBe(true);
    });

    it('should handle API errors from deleteMemory (errors are swallowed internally)', async () => {
      mockGetAll.mockResolvedValue([{ id: 'mem_1' }]);
      mockDelete.mockRejectedValue(new Error('Delete failed'));
      // deleteMemory has its own try-catch that returns false on error
      // deleteAllUserMemories doesn't check the return value, so it returns true
      const result = await provider.deleteAllUserMemories('user_123');
      expect(result).toBe(true);
    });
  });

  // ─── maskId (private, tested through side effects on logs) ───

  describe('maskId (tested via log calls)', () => {
    it('should mask long IDs in memory operation logs', async () => {
      const memoryLogger = {
        log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
      };
      const configMock = createConfigMock({ MEM0_API_KEY: '' });
      const module = await Test.createTestingModule({
        providers: [
          Mem0Provider,
          { provide: ConfigService, useValue: configMock },
          { provide: MemoryLogger, useValue: memoryLogger },
        ],
      }).compile();
      provider = module.get<Mem0Provider>(Mem0Provider);

      await provider.addMemory(
        [{ role: 'user', content: 'test' }],
        'user_long_id_12345',
      );

      expect(memoryLogger.warn).toHaveBeenCalledWith(
        'MEMORY_ADD_SKIPPED',
        expect.objectContaining({
          userId: expect.stringMatching(/^user\.\.\.2345$/),
        }),
      );
    });

    it('should handle short IDs (< 8 chars)', async () => {
      const memoryLogger = {
        log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
      };
      const configMock = createConfigMock({ MEM0_API_KEY: '' });
      const module = await Test.createTestingModule({
        providers: [
          Mem0Provider,
          { provide: ConfigService, useValue: configMock },
          { provide: MemoryLogger, useValue: memoryLogger },
        ],
      }).compile();
      provider = module.get<Mem0Provider>(Mem0Provider);

      await provider.addMemory(
        [{ role: 'user', content: 'test' }],
        'short',
      );

      expect(memoryLogger.warn).toHaveBeenCalledWith(
        'MEMORY_ADD_SKIPPED',
        expect.objectContaining({
          userId: '***',
        }),
      );
    });
  });
});
