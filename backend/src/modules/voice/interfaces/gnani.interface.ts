// ─── Gnani.ai API Response Types ───

export interface GnaniSttResponse {
  success: boolean;
  request_id: string;
  timestamp: string;
  transcript: string;
}

export interface GnaniSttRequest {
  audio_file: Buffer;
  language_code: string;
  format?: 'verbatim' | 'transcribe';
  itn_native_numerals?: boolean;
}

export interface GnaniTtsRequest {
  text: string;
  model: string;
  voice: string;
  audio_config: GnaniAudioConfig;
}

export interface GnaniAudioConfig {
  sample_rate: number;
  num_channels: number;
  sample_width: number;
  encoding: string;
  container: string;
}

export interface GnaniConfig {
  apiKey: string;
  baseUrl: string;
  defaultLanguage: string;
  timeout: number;
  ttsVoice: string;
  ttsModel: string;
  maxAudioSizeBytes: number;
  maxAudioDurationSeconds: number;
  retryCount: number;
  retryDelayMs: number;
}

// ─── Gnani Provider Token ───

export const GNANI_PROVIDER_TOKEN = 'GNANI_PROVIDER';

export interface GnaniProvider {
  speechToText(
    audioBuffer: Buffer,
    languageCode: string,
    mimeType: string,
  ): Promise<GnaniSttResult>;

  textToSpeech(
    text: string,
    languageCode: string,
  ): Promise<GnaniTtsResult>;

  readonly isAvailable: boolean;
}

export interface GnaniSttResult {
  success: boolean;
  transcript: string;
  requestId: string;
  latencyMs: number;
}

export interface GnaniTtsResult {
  success: boolean;
  audioBuffer: Buffer;
  latencyMs: number;
}

// ─── Language Codes ───

export const GNANI_SUPPORTED_LANGUAGES = {
  'en-IN': 'English (India)',
  'hi-IN': 'Hindi',
  'ta-IN': 'Tamil',
  'te-IN': 'Telugu',
  'kn-IN': 'Kannada',
  'ml-IN': 'Malayalam',
  'mr-IN': 'Marathi',
  'gu-IN': 'Gujarati',
  'pa-IN': 'Punjabi',
  'bn-IN': 'Bengali',
} as const;

export type GnaniLanguageCode = keyof typeof GNANI_SUPPORTED_LANGUAGES;

// ─── TTS Voices ───

export const GNANI_TTS_VOICES = {
  'en-IN': ['Pranav', 'Kaveri', 'Shubhra', 'Deepak', 'Karan', 'Simran'],
  'hi-IN': ['Pranav', 'Kaveri', 'Raju', 'Riya'],
} as const;

// ─── Conversation Types ───

export interface VoiceConversation {
  conversationId: string;
  userId: string;
  messages: VoiceMessage[];
  startedAt: string;
  updatedAt: string;
}

export interface VoiceMessage {
  role: 'user' | 'assistant';
  text: string;
  audioBuffer?: Buffer;
  timestamp: string;
}

// ─── Logger Types ───

export interface VoiceLogEntry {
  operation: 'STT' | 'TTS' | 'CHAT';
  durationMs: number;
  providerLatencyMs?: number;
  audioDurationSec?: number;
  success: boolean;
  retryCount?: number;
  error?: string;
  languageCode?: string;
  audioSizeBytes?: number;
}
