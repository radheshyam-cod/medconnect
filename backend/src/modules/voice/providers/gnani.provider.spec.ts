import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GnaniApiProvider } from './gnani.provider';

describe('GnaniApiProvider', () => {
  let provider: GnaniApiProvider;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    configService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          GNANI_API_KEY: 'test-api-key',
          GNANI_BASE_URL: 'https://api.vachana.ai',
          GNANI_LANGUAGE: 'en-IN',
          GNANI_TIMEOUT: 15000,
          GNANI_TTS_VOICE: 'Pranav',
          GNANI_TTS_MODEL: 'vachana-voice-v3',
          GNANI_MAX_AUDIO_SIZE_MB: 10,
          GNANI_MAX_AUDIO_DURATION_SEC: 60,
          GNANI_RETRY_COUNT: 1,
          GNANI_RETRY_DELAY_MS: 100,
        };
        return config[key] !== undefined ? config[key] : defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GnaniApiProvider,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    provider = module.get<GnaniApiProvider>(GnaniApiProvider);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('isAvailable', () => {
    it('should return true when API key is configured', () => {
      expect(provider.isAvailable).toBe(true);
    });

    it('should return false when API key is missing', async () => {
      configService.get.mockReturnValue('');
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GnaniApiProvider,
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      const withoutKey = module.get<GnaniApiProvider>(GnaniApiProvider);
      expect(withoutKey.isAvailable).toBe(false);
    });
  });

  describe('speechToText', () => {
    it('should throw when not configured', async () => {
      configService.get.mockReturnValue('');
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GnaniApiProvider,
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      const withoutKey = module.get<GnaniApiProvider>(GnaniApiProvider);
      await expect(
        withoutKey.speechToText(Buffer.from('test'), 'en-IN', 'audio/wav'),
      ).rejects.toThrow('Gnani.ai is not configured');
    });
  });

  describe('textToSpeech', () => {
    it('should throw when not configured', async () => {
      configService.get.mockReturnValue('');
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GnaniApiProvider,
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      const withoutKey = module.get<GnaniApiProvider>(GnaniApiProvider);
      await expect(
        withoutKey.textToSpeech('Hello', 'en-IN'),
      ).rejects.toThrow('Gnani.ai is not configured');
    });
  });
});
