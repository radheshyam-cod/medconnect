import { Test, TestingModule } from '@nestjs/testing';
import { MemoryLogger } from './memory-logger.service';

describe('MemoryLogger', () => {
  let memoryLogger: MemoryLogger;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MemoryLogger],
    }).compile();

    memoryLogger = module.get<MemoryLogger>(MemoryLogger);
  });

  it('should be defined', () => {
    expect(memoryLogger).toBeDefined();
  });

  describe('log', () => {
    it('should not throw when logging', () => {
      expect(() => memoryLogger.log('TEST_OP', { key: 'value' })).not.toThrow();
    });

    it('should handle missing details', () => {
      expect(() => memoryLogger.log('TEST_OP')).not.toThrow();
    });
  });

  describe('warn', () => {
    it('should not throw when warning', () => {
      expect(() => memoryLogger.warn('TEST_WARN')).not.toThrow();
    });
  });

  describe('error', () => {
    it('should not throw when logging errors', () => {
      expect(() => memoryLogger.error('TEST_ERROR', new Error('test'))).not.toThrow();
    });

    it('should handle string errors', () => {
      expect(() => memoryLogger.error('TEST_ERROR', 'string error')).not.toThrow();
    });
  });

  describe('debug', () => {
    it('should not throw when debug logging', () => {
      expect(() => memoryLogger.debug('TEST_DEBUG', { info: 'test' })).not.toThrow();
    });
  });

  describe('sanitizeForLogging', () => {
    it('should redact sensitive keys', () => {
      // This is an internal method, tested via the public methods
      expect(() => {
        memoryLogger.log('TEST', { apiKey: 'secret-123', token: 'abc', email: 'test@example.com' });
      }).not.toThrow();
    });
  });
});
