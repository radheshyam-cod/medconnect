import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  ServiceUnavailableException,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { MemoryService } from '../memory/memory.service';
import { ContextBuilder } from '../ai-context/context-builder.service';
import { PromptBuilder } from '../ai-context/prompt-builder.service';
import { GeminiService } from '../ai/gemini.service';

import {
  GNANI_PROVIDER_TOKEN,
  GnaniProvider,
  GnaniSttResult,
  GnaniTtsResult,
} from './interfaces/gnani.interface';
import { SpeechToTextResponseDto } from './dto/speech-to-text.dto';
import { TextToSpeechResponseDto } from './dto/text-to-speech.dto';
import { VoiceChatResponseDto } from './dto/chat.dto';

const MAX_CONVERSATIONS = 100;
const CONVERSATION_TTL_MS = 30 * 60 * 1000;


interface Conversation {
  userId: string;
  messages: Array<{ role: 'user' | 'assistant'; text: string; timestamp: number }>;
  createdAt: number;
  lastAccessedAt: number;
}

@Injectable()
export class VoiceService implements OnModuleDestroy {
  private readonly logger = new Logger(VoiceService.name);
  private readonly maxAudioSizeBytes: number;
  private readonly allowedMimeTypes: string[];
  private readonly geminiApiKey: string;
  private readonly conversations: Map<string, Conversation> = new Map();
  private readonly cleanupTimer: NodeJS.Timeout;
  private conversationIndex = 0;

  constructor(
    @Inject(GNANI_PROVIDER_TOKEN) private readonly gnaniProvider: GnaniProvider,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly memoryService: MemoryService,
    private readonly contextBuilder: ContextBuilder,
    private readonly promptBuilder: PromptBuilder,
    private readonly geminiService: GeminiService,
  ) {
    this.maxAudioSizeBytes =
      this.configService.get<number>('GNANI_MAX_AUDIO_SIZE_MB', 10) * 1024 * 1024;
    this.geminiApiKey = this.configService.get<string>('GEMINI_API_KEY', '');
    this.allowedMimeTypes = [
      'audio/wav', 'audio/wave', 'audio/mpeg', 'audio/mp3',
      'audio/ogg', 'audio/flac', 'audio/aac', 'audio/mp4',
      'audio/x-m4a', 'audio/webm',
    ];

    this.cleanupTimer = setInterval(() => this.evictStaleConversations(), 5 * 60 * 1000);
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupTimer);
  }

  /**
   * Supported language codes (BCP-47 format for Indian languages).
   */
  static readonly SUPPORTED_LANGUAGES = [
    'en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'kn-IN',
    'ml-IN', 'mr-IN', 'gu-IN', 'pa-IN', 'bn-IN',
  ] as const;

  /**
   * Validate and normalize a language code.
   * Accepts full BCP-47 codes (en-IN) or language names (hindi, tamil).
   */
  static validateLanguageCode(code: string): string {
    const normalized = code?.trim().toLowerCase();
    // Map short codes, language names, and full BCP-47 codes to normalized format
    const map: Record<string, string> = {
      'en': 'en-IN', 'english': 'en-IN', 'en-in': 'en-IN',
      'hi': 'hi-IN', 'hindi': 'hi-IN', 'hi-in': 'hi-IN',
      'ta': 'ta-IN', 'tamil': 'ta-IN', 'ta-in': 'ta-IN',
      'te': 'te-IN', 'telugu': 'te-IN', 'te-in': 'te-IN',
      'kn': 'kn-IN', 'kannada': 'kn-IN', 'kn-in': 'kn-IN',
      'ml': 'ml-IN', 'malayalam': 'ml-IN', 'ml-in': 'ml-IN',
      'mr': 'mr-IN', 'marathi': 'mr-IN', 'mr-in': 'mr-IN',
      'gu': 'gu-IN', 'gujarati': 'gu-IN', 'gu-in': 'gu-IN',
      'pa': 'pa-IN', 'punjabi': 'pa-IN', 'pa-in': 'pa-IN',
      'bn': 'bn-IN', 'bengali': 'bn-IN', 'bn-in': 'bn-IN',
    };
    return map[normalized] || 'en-IN';
  }

  /**
   * Validate language code and throw if invalid.
   * Used by the controller for multipart form validation.
   */


  private async getInternalUserId(clerkId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new NotFoundException('User not found');
    return user.id;
  }

  private validateAudioFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('Audio file is required');
    }
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported audio format: ${file.mimetype}. Allowed: ${this.allowedMimeTypes.join(', ')}`,
      );
    }
    if (file.size > this.maxAudioSizeBytes) {
      throw new BadRequestException(
        `Audio file too large. Maximum is ${this.maxAudioSizeBytes / (1024 * 1024)}MB`,
      );
    }
    if (file.size === 0) {
      throw new BadRequestException('Audio file is empty');
    }
    // Reject executable content (ELF magic bytes)
    if (
      file.buffer[0] === 0x7f && file.buffer[1] === 0x45 &&
      file.buffer[2] === 0x4c && file.buffer[3] === 0x46
    ) {
      throw new BadRequestException('Invalid audio file: executable content detected');
    }
  }

  private evictStaleConversations(): void {
    const now = Date.now();
    let evicted = 0;
    for (const [id, conv] of this.conversations) {
      if (now - conv.lastAccessedAt > CONVERSATION_TTL_MS) {
        this.conversations.delete(id);
        evicted++;
      }
    }
    if (evicted > 0) {
      this.logger.log(`Evicted ${evicted} stale conversations`);
    }
  }

  private getOrCreateConversation(
    convId: string | undefined,
    userId: string,
  ): { conversation: Conversation; id: string } {
    if (convId) {
      const existing = this.conversations.get(convId);
      if (existing && existing.userId === userId) {
        existing.lastAccessedAt = Date.now();
        return { conversation: existing, id: convId };
      }
      this.logger.warn(`Conversation ${convId} not found or expired. Starting a new session.`);
    }

    if (this.conversations.size >= MAX_CONVERSATIONS) {
      let oldestKey: string | undefined;
      let oldestTime = Infinity;
      for (const [key, conv] of this.conversations) {
        if (conv.lastAccessedAt < oldestTime) {
          oldestTime = conv.lastAccessedAt;
          oldestKey = key;
        }
      }
      if (oldestKey) {
        this.conversations.delete(oldestKey);
      }
    }

    const newConv: Conversation = {
      userId, messages: [],
      createdAt: Date.now(), lastAccessedAt: Date.now(),
    };
    const id = `conv-${userId}-${++this.conversationIndex}-${Date.now()}`;
    this.conversations.set(id, newConv);
    return { conversation: newConv, id };
  }

  async speechToText(
    clerkId: string,
    file: Express.Multer.File,
    languageCode: string,
  ): Promise<SpeechToTextResponseDto> {
    const startTime = Date.now();
    await this.getInternalUserId(clerkId);
    this.validateAudioFile(file);

    if (!this.gnaniProvider.isAvailable) {
      throw new ServiceUnavailableException('Gnani.ai is not configured.');
    }

    try {
      const result: GnaniSttResult = await this.gnaniProvider.speechToText(
        file.buffer, languageCode, file.mimetype,
      );
      return {
        success: result.success,
        transcript: result.transcript,
        requestId: result.requestId,
        latencyMs: Date.now() - startTime,
        detectedLanguage: languageCode,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`STT_FAILED | lang=${languageCode} | error=${msg}`);
      throw new ServiceUnavailableException(`Speech recognition failed: ${msg}`);
    }
  }

  async textToSpeech(
    clerkId: string,
    text: string,
    voice: string,
    languageCode: string,
  ): Promise<TextToSpeechResponseDto> {
    const startTime = Date.now();
    await this.getInternalUserId(clerkId);

    if (!this.gnaniProvider.isAvailable) {
      throw new ServiceUnavailableException('Gnani.ai is not configured.');
    }

    try {
      const result: GnaniTtsResult = await this.gnaniProvider.textToSpeech(text, languageCode);
      return {
        success: true,
        audioBase64: result.audioBuffer.toString('base64'),
        mimeType: 'audio/wav',
        durationMs: Math.round((text.length / 10) * 1000),
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`TTS_FAILED | voice=${voice} | error=${msg}`);
      throw new ServiceUnavailableException(`Speech synthesis failed: ${msg}`);
    }
  }

  /**
   * Voice Chat: STT → AI Q&A (ContextBuilder + Mem0 + PromptBuilder + Gemini) → TTS.
   *
   * Reuses existing services:
   * - ContextBuilder.buildPatientContext() — cached patient data query (2-min TTL)
   * - MemoryService.searchRelevantMemories() — Mem0 long-term memory
   * - PromptBuilder.formatMemoriesForPrompt() — structured memory formatting
   * - PromptBuilder.estimateTokenCount() — token usage monitoring
   */
  async voiceChat(
    clerkId: string,
    file: Express.Multer.File,
    languageCode: string,
    voice: string,
    conversationId?: string,
    includeAudio?: boolean,
  ): Promise<VoiceChatResponseDto> {
    const overallStart = Date.now();
    const userId = await this.getInternalUserId(clerkId);
    this.validateAudioFile(file);

    if (!this.gnaniProvider.isAvailable) {
      throw new ServiceUnavailableException('Gnani.ai is not configured.');
    }

    // ─── Step 1: Speech to Text ───
    const sttStart = Date.now();
    let sttResult: GnaniSttResult;
    try {
      sttResult = await this.gnaniProvider.speechToText(file.buffer, languageCode, file.mimetype);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`CHAT_STT_FAILED | error=${msg}`);
      throw new ServiceUnavailableException(`Speech recognition failed: ${msg}`);
    }
    const sttLatencyMs = Date.now() - sttStart;
    const userText = sttResult.transcript?.trim();

    if (!userText) {
      throw new BadRequestException('Could not transcribe any speech.');
    }

    // ─── Step 2: Get or create conversation ───
    const { conversation, id: convId } = this.getOrCreateConversation(conversationId, userId);
    conversation.messages.push({ role: 'user', text: userText, timestamp: Date.now() });

    // ─── Step 3: Generate AI answer ───
    const aiStart = Date.now();
    let aiAnswer: string;
    try {
      aiAnswer = await this.generateAnswer(userId, userText, conversation.messages);
    } catch (error) {
      this.logger.error(`CHAT_AI_FAILED | ${error instanceof Error ? error.message : ''}`);
      aiAnswer = 'I encountered a technical issue. Please try again.';
    }
    const aiLatencyMs = Date.now() - aiStart;

    conversation.messages.push({ role: 'assistant', text: aiAnswer, timestamp: Date.now() });
    if (conversation.messages.length > 10) conversation.messages = conversation.messages.slice(-10);

    // ─── Step 4: Text to Speech (optional) ───
    let ttsLatencyMs: number | undefined;
    let audioBase64: string | undefined;
    let audioMimeType: string | undefined;

    if (includeAudio) {
      const ttsStart = Date.now();
      try {
        const ttsResult: GnaniTtsResult = await this.gnaniProvider.textToSpeech(aiAnswer, languageCode);
        ttsLatencyMs = Date.now() - ttsStart;
        audioBase64 = ttsResult.audioBuffer.toString('base64');
        audioMimeType = 'audio/wav';
      } catch {
        this.logger.warn('CHAT_TTS_FAILED | continuing without audio');
      }
    }

    return {
      success: true, text: userText, answer: aiAnswer,
      audioBase64, audioMimeType, conversationId: convId,
      sttLatencyMs, aiLatencyMs, ttsLatencyMs,
      totalLatencyMs: Date.now() - overallStart,
    };
  }

  async textChat(
    clerkId: string,
    text: string,
    languageCode: string,
    voice: string,
    conversationId?: string,
    includeAudio?: boolean,
  ): Promise<VoiceChatResponseDto> {
    const overallStart = Date.now();
    const userId = await this.getInternalUserId(clerkId);

    const userText = text.trim();
    if (!userText) {
      throw new BadRequestException('Text cannot be empty.');
    }

    const { conversation, id: convId } = this.getOrCreateConversation(conversationId, userId);
    conversation.messages.push({ role: 'user', text: userText, timestamp: Date.now() });

    const aiStart = Date.now();
    let aiAnswer: string;
    try {
      aiAnswer = await this.generateAnswer(userId, userText, conversation.messages);
    } catch (error) {
      this.logger.error(`CHAT_AI_FAILED | ${error instanceof Error ? error.message : ''}`);
      aiAnswer = 'I encountered a technical issue. Please try again.';
    }
    const aiLatencyMs = Date.now() - aiStart;

    conversation.messages.push({ role: 'assistant', text: aiAnswer, timestamp: Date.now() });
    if (conversation.messages.length > 10) conversation.messages = conversation.messages.slice(-10);

    let ttsLatencyMs: number | undefined;
    let audioBase64: string | undefined;
    let audioMimeType: string | undefined;

    if (includeAudio) {
      const ttsStart = Date.now();
      try {
        if (!this.gnaniProvider.isAvailable) {
          throw new ServiceUnavailableException('Gnani.ai is not configured.');
        }
        const ttsResult: GnaniTtsResult = await this.gnaniProvider.textToSpeech(aiAnswer, languageCode);
        ttsLatencyMs = Date.now() - ttsStart;
        audioBase64 = ttsResult.audioBuffer.toString('base64');
        audioMimeType = 'audio/wav';
      } catch {
        this.logger.warn('CHAT_TTS_FAILED | continuing without audio');
      }
    }

    return {
      success: true, text: userText, answer: aiAnswer,
      audioBase64, audioMimeType, conversationId: convId,
      sttLatencyMs: 0, aiLatencyMs, ttsLatencyMs,
      totalLatencyMs: Date.now() - overallStart,
    };
  }

  /**
   * Generate AI answer using the existing services pipeline.
   *
   * Flow: ContextBuilder (patient data) → MemoryService (Mem0) →
   *       PromptBuilder (format) → Gemini (QA) → Zod-validated response
   */
  private async generateAnswer(
    userId: string,
    userQuery: string,
    history: Array<{ role: string; text: string; timestamp?: number }>,
  ): Promise<string> {
    if (!this.geminiApiKey) {
      return 'AI features are not configured.';
    }

    const sanitizedQuery = userQuery
      .replace(/<[^>]*>/g, '')
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .trim();

    if (!sanitizedQuery) {
      return 'I could not understand your question.';
    }

    // ─── Step 1: Build enriched patient context via ContextBuilder ───
    // buildPatientContext() queries: profile, timeline, meds, labs, docs, summary
    // compressContext() formats into compact string for AI prompts
    const patientContext = await this.contextBuilder.buildPatientContext(userId);
    const contextStr = this.contextBuilder.compressContext(patientContext);

    this.logger.debug(
      `QA_CONTEXT | tokens=${this.promptBuilder.estimateTokenCount(contextStr)}`,
    );

    // ─── Step 2: Search Mem0 for relevant long-term memories ───
    const relevantMemories = await this.memoryService
      .searchRelevantMemories(userId, sanitizedQuery, 10)
      .catch(() => []);

    const memoryStr = this.promptBuilder.formatMemoriesForPrompt(relevantMemories);

    // ─── Step 3: Build conversation history ───
    const historyStr = history
      .slice(0, -1)
      .map((m) => `${m.role === 'user' ? 'Patient' : 'Assistant'}: ${m.text}`)
      .join('\n');

    // ─── Step 4: Build Q&A prompt ───
    const prompt = [
      'You are a helpful, accurate medical voice assistant for MedConnect India.',
      'Answer questions based ONLY on the patient data below. Be concise and conversational.',
      'If the answer is not in the data, say you don\'t have enough information.',
      'Do NOT make up medical facts or diagnoses. If urgent, advise consulting a doctor.',
      '',
      `PATIENT DATA:\n${contextStr || 'No health records found.'}`,
      memoryStr ? `\nPATIENT MEMORY:\n${memoryStr}` : '',
      historyStr ? `\nCONVERSATION:\n${historyStr}` : '',
      `\nPATIENT QUESTION: ${sanitizedQuery}`,
      '\nAnswer concisely based ONLY on the patient data above:',
    ].join('\n');

    this.logger.debug(
      `QA_PROMPT | context=${this.promptBuilder.estimateTokenCount(contextStr)} | ` +
      `memory=${this.promptBuilder.estimateTokenCount(memoryStr)} | ` +
      `total=${this.promptBuilder.estimateTokenCount(prompt)}`,
    );

    // ─── Step 5: Call Gemini using official SDK (`GeminiService`) ───
    return this.geminiService.generateChatReply(prompt, history);
  }
}
