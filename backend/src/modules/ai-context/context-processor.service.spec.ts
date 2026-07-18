import { Test, TestingModule } from '@nestjs/testing';
import { ContextProcessor } from './context-processor.service';
import { ProviderRegistry } from './providers/provider-registry.service';
import { MemoryLogger } from '../memory/memory-logger.service';
import { Job } from 'bullmq';

describe('ContextProcessor', () => {
  let processor: ContextProcessor;
  let providerRegistry: Record<string, jest.Mock>;
  let loggerMock: Record<string, jest.Mock>;

  beforeEach(async () => {
    providerRegistry = {
      getProviders: jest.fn(),
    };

    loggerMock = {
      debug: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextProcessor,
        {
          provide: ProviderRegistry,
          useValue: providerRegistry,
        },
        {
          provide: MemoryLogger,
          useValue: loggerMock,
        },
      ],
    }).compile();

    processor = module.get<ContextProcessor>(ContextProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    it('should handle sync-context job and call all providers', async () => {
      const mockProvider1 = { name: 'mem0', updateContext: jest.fn().mockResolvedValue(true) };
      const mockProvider2 = { name: 'alchemyst', updateContext: jest.fn().mockResolvedValue(true) };
      providerRegistry.getProviders.mockReturnValue([mockProvider1, mockProvider2]);

      const mockJob = {
        name: 'sync-context',
        id: '1',
        data: {
          userId: 'user_1',
          eventType: 'fact_validated',
          data: { conditions: [] },
          timestamp: '2024-01-01',
        },
      } as unknown as Job;

      await processor.process(mockJob);

      expect(mockProvider1.updateContext).toHaveBeenCalledWith('user_1', { conditions: [] });
      expect(mockProvider2.updateContext).toHaveBeenCalledWith('user_1', { conditions: [] });
    });

    it('should ignore failures from individual providers and not throw', async () => {
      const mockProvider1 = { name: 'mem0', updateContext: jest.fn().mockRejectedValue(new Error('Fail 1')) };
      const mockProvider2 = { name: 'alchemyst', updateContext: jest.fn().mockResolvedValue(true) };
      providerRegistry.getProviders.mockReturnValue([mockProvider1, mockProvider2]);

      const mockJob = {
        name: 'sync-context',
        id: '2',
        data: { userId: 'user_1', data: {} },
      } as unknown as Job;

      // Should not throw, it logs and continues
      await expect(processor.process(mockJob)).resolves.toBe(true);
      
      expect(mockProvider1.updateContext).toHaveBeenCalled();
      expect(mockProvider2.updateContext).toHaveBeenCalled();
    });
  });
});
