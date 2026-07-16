import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VoiceService } from './voice.service';
import { GNANI_PROVIDER_TOKEN } from './interfaces/gnani.interface';
import { PrismaService } from '../database/prisma.service';
import { MemoryService } from '../memory/memory.service';
import { ContextBuilder } from '../ai-context/context-builder.service';
import { PromptBuilder } from '../ai-context/prompt-builder.service';
import { TimelineService } from '../timeline/timeline.service';

describe('VoiceService', () => {
  let service: VoiceService;
  let gnaniProvider: any;
  let prisma: any;
  let memoryService: any;

  const mockFile = (overrides?: Partial<Express.Multer.File>): Express.Multer.File => ({
    fieldname: 'audio_file',
    originalname: 'test.wav',
    encoding: '7bit',
    mimetype: 'audio/wav',
    buffer: Buffer.from('fake-audio-data'),
    size: 1024,
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
    ...overrides,
  });

  beforeEach(async () => {
    gnaniProvider = {
      isAvailable: true,
      speechToText: jest.fn(),
      textToSpeech: jest.fn(),
    };

    const userLookup: Record<string, { id: string; clerkId: string }> = {
      'clerk_123': { id: 'user_123', clerkId: 'clerk_123' },
      'different_clerk': { id: 'user_456', clerkId: 'different_clerk' },
    };

    prisma = {
      user: {
        findUnique: jest.fn().mockImplementation(({ where: { clerkId } }: { where: { clerkId: string } }) => {
          return Promise.resolve(userLookup[clerkId] || null);
        }),
      },
      medication: { findMany: jest.fn() },
      labResult: { findMany: jest.fn() },
      timeline: { findMany: jest.fn() },
      document: { findMany: jest.fn() },
      patientProfile: { findUnique: jest.fn() },
    };

    memoryService = {
      searchRelevantMemories: jest.fn().mockResolvedValue([]),
      storeMemory: jest.fn(),
    };

    const contextBuilder = {
      buildPatientContext: jest.fn().mockResolvedValue({
        patientProfile: null,
        recentDocuments: [],
        recentTimeline: [],
        recentMedications: [],
        recentLabs: [],
        recentSummary: null,
        contextTimestamp: new Date().toISOString(),
      }),
      compressContext: jest.fn().mockReturnValue('Patient data context'),
    };

    const promptBuilder = {
      formatMemoriesForPrompt: jest.fn().mockReturnValue(''),
      estimateTokenCount: jest.fn().mockReturnValue(100),
    };

    const timelineService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      remove: jest.fn(),
      getSummary: jest.fn(),
      getAISummary: jest.fn(),
      generateFromExtractions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoiceService,
        { provide: GNANI_PROVIDER_TOKEN, useValue: gnaniProvider },
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                GNANI_MAX_AUDIO_SIZE_MB: 10,
                GEMINI_API_KEY: '',
              };
              return config[key] !== undefined ? config[key] : defaultValue;
            }),
          },
        },
        { provide: MemoryService, useValue: memoryService },
        { provide: ContextBuilder, useValue: contextBuilder },
        { provide: PromptBuilder, useValue: promptBuilder },
        { provide: TimelineService, useValue: timelineService },
      ],
    }).compile();

    service = module.get<VoiceService>(VoiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── Language Validation ───

  describe('validateLanguageCode', () => {
    it('should return en-IN for empty input', () => {
      expect(VoiceService.validateLanguageCode('')).toBe('en-IN');
    });

    it('should normalize English variants to en-IN', () => {
      expect(VoiceService.validateLanguageCode('en')).toBe('en-IN');
      expect(VoiceService.validateLanguageCode('EN')).toBe('en-IN');
      expect(VoiceService.validateLanguageCode('english')).toBe('en-IN');
      expect(VoiceService.validateLanguageCode('English')).toBe('en-IN');
    });

    it('should normalize Hindi variants to hi-IN', () => {
      expect(VoiceService.validateLanguageCode('hi')).toBe('hi-IN');
      expect(VoiceService.validateLanguageCode('hindi')).toBe('hi-IN');
    });

    it('should normalize Tamil, Telugu, Kannada, Malayalam', () => {
      expect(VoiceService.validateLanguageCode('ta')).toBe('ta-IN');
      expect(VoiceService.validateLanguageCode('tamil')).toBe('ta-IN');
      expect(VoiceService.validateLanguageCode('te')).toBe('te-IN');
      expect(VoiceService.validateLanguageCode('telugu')).toBe('te-IN');
      expect(VoiceService.validateLanguageCode('kn')).toBe('kn-IN');
      expect(VoiceService.validateLanguageCode('kannada')).toBe('kn-IN');
      expect(VoiceService.validateLanguageCode('ml')).toBe('ml-IN');
      expect(VoiceService.validateLanguageCode('malayalam')).toBe('ml-IN');
    });

    it('should pass through full BCP-47 codes', () => {
      expect(VoiceService.validateLanguageCode('en-IN')).toBe('en-IN');
      expect(VoiceService.validateLanguageCode('hi-IN')).toBe('hi-IN');
      expect(VoiceService.validateLanguageCode('ta-IN')).toBe('ta-IN');
    });

    it('should fallback to en-IN for unknown codes', () => {
      expect(VoiceService.validateLanguageCode('fr-FR')).toBe('en-IN');
      expect(VoiceService.validateLanguageCode('xyz')).toBe('en-IN');
    });
  });

  // ─── Audio File Validation ───

  describe('speechToText', () => {
    it('should transcribe audio successfully', async () => {
      gnaniProvider.speechToText.mockResolvedValue({
        success: true,
        transcript: 'Hello, how are you?',
        requestId: 'req_123',
        latencyMs: 500,
      });

      const result = await service.speechToText('clerk_123', mockFile(), 'en-IN');

      expect(result.success).toBe(true);
      expect(result.transcript).toBe('Hello, how are you?');
      expect(result.requestId).toBe('req_123');
      expect(gnaniProvider.speechToText).toHaveBeenCalled();
    });

    it('should throw when Gnani is not available', async () => {
      gnaniProvider.isAvailable = false;

      await expect(
        service.speechToText('clerk_123', mockFile(), 'en-IN'),
      ).rejects.toThrow('Gnani.ai is not configured.');
    });

    it('should throw on invalid file type', async () => {
      const invalidFile = mockFile({ mimetype: 'application/pdf' });
      await expect(
        service.speechToText('clerk_123', invalidFile, 'en-IN'),
      ).rejects.toThrow('Unsupported audio format');
    });

    it('should throw on empty file', async () => {
      const emptyFile = mockFile({ size: 0, buffer: Buffer.alloc(0) });
      await expect(
        service.speechToText('clerk_123', emptyFile, 'en-IN'),
      ).rejects.toThrow('Audio file is empty');
    });
  });

  describe('textToSpeech', () => {
    it('should synthesize speech successfully', async () => {
      gnaniProvider.textToSpeech.mockResolvedValue({
        success: true,
        audioBuffer: Buffer.from('fake-audio'),
        latencyMs: 300,
      });

      const result = await service.textToSpeech(
        'clerk_123', 'Hello world', 'Pranav', 'en-IN',
      );

      expect(result.success).toBe(true);
      expect(result.audioBase64).toBeDefined();
      expect(result.mimeType).toBe('audio/wav');
      expect(gnaniProvider.textToSpeech).toHaveBeenCalledWith('Hello world', 'en-IN');
    });

    it('should throw when Gnani is not available', async () => {
      gnaniProvider.isAvailable = false;

      await expect(
        service.textToSpeech('clerk_123', 'Hello', 'Pranav', 'en-IN'),
      ).rejects.toThrow('Gnani.ai is not configured.');
    });
  });

  describe('voiceChat', () => {
    it('should process a voice chat end-to-end', async () => {
      gnaniProvider.speechToText.mockResolvedValue({
        success: true,
        transcript: 'What medicines am I taking?',
        requestId: 'req_123',
        latencyMs: 400,
      });

      gnaniProvider.textToSpeech.mockResolvedValue({
        success: true,
        audioBuffer: Buffer.from('fake-tts-audio'),
        latencyMs: 200,
      });

      const result = await service.voiceChat(
        'clerk_123', mockFile(), 'en-IN', 'Pranav',
      );

      expect(result.success).toBe(true);
      expect(result.text).toBe('What medicines am I taking?');
      expect(result.answer).toBeTruthy();
      expect(result.conversationId).toBeDefined();
      expect(result.sttLatencyMs).toBeGreaterThanOrEqual(0);
      expect(result.aiLatencyMs).toBeGreaterThanOrEqual(0);
      // TTS may be skipped if Gemini returns early (no API key in test)
      // Check that the core chat flow completes successfully
    });

    it('should generate response without audio when includeAudio=false', async () => {
      gnaniProvider.speechToText.mockResolvedValue({
        success: true,
        transcript: 'Any abnormal labs?',
        requestId: 'req_456',
        latencyMs: 300,
      });

      const result = await service.voiceChat(
        'clerk_123', mockFile(), 'en-IN', 'Pranav', undefined, false,
      );

      expect(result.success).toBe(true);
      expect(result.audioBase64).toBeUndefined();
      expect(result.audioMimeType).toBeUndefined();
      expect(result.ttsLatencyMs).toBeUndefined();
      // Verify TTS was never called when audio is not requested
      expect(gnaniProvider.textToSpeech).not.toHaveBeenCalled();
    });

    it('should throw on empty transcription', async () => {
      gnaniProvider.speechToText.mockResolvedValue({
        success: true,
        transcript: '',
        requestId: 'req_789',
        latencyMs: 100,
      });

      await expect(
        service.voiceChat('clerk_123', mockFile(), 'en-IN', 'Pranav'),
      ).rejects.toThrow('Could not transcribe any speech');
    });

    it('should maintain conversation history for follow-up questions', async () => {
      gnaniProvider.speechToText.mockResolvedValue({
        success: true,
        transcript: 'First question',
        requestId: 'req_1', latencyMs: 100,
      });

      const result1 = await service.voiceChat(
        'clerk_123', mockFile(), 'en-IN', 'Pranav',
      );
      const convId = result1.conversationId;

      gnaniProvider.speechToText.mockResolvedValue({
        success: true,
        transcript: 'Follow up question',
        requestId: 'req_2', latencyMs: 100,
      });

      const result2 = await service.voiceChat(
        'clerk_123', mockFile(), 'en-IN', 'Pranav', convId,
      );

      expect(result2.conversationId).toBe(convId);
    });

    it('should reject unauthorized conversation access', async () => {
      // Create a conversation first
      gnaniProvider.speechToText.mockResolvedValue({
        success: true, transcript: 'test', requestId: 'r', latencyMs: 100,
      });
      const result = await service.voiceChat(
        'clerk_123', mockFile(), 'en-IN', 'Pranav',
      );

      // Try to access with different user
      await expect(
        service.voiceChat(
          'different_clerk', mockFile(), 'en-IN', 'Pranav', result.conversationId,
        ),
      ).rejects.toThrow('Conversation not found or access denied');
    });
  });
});
