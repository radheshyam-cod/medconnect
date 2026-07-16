import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import {
  GNANI_PROVIDER_TOKEN,
  GnaniProvider,
  GnaniSttResult,
  GnaniTtsResult,
  GnaniConfig,
} from '../interfaces/gnani.interface';

@Injectable()
export class GnaniApiProvider implements GnaniProvider {
  private readonly logger = new Logger(GnaniApiProvider.name);
  private readonly config: GnaniConfig;
  private readonly _isAvailable: boolean;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GNANI_API_KEY', '');
    this.config = {
      apiKey,
      baseUrl: this.configService.get<string>('GNANI_BASE_URL', 'https://api.vachana.ai'),
      defaultLanguage: this.configService.get<string>('GNANI_LANGUAGE', 'en-IN'),
      timeout: this.configService.get<number>('GNANI_TIMEOUT', 15000),
      ttsVoice: this.configService.get<string>('GNANI_TTS_VOICE', 'Pranav'),
      ttsModel: this.configService.get<string>('GNANI_TTS_MODEL', 'vachana-voice-v3'),
      maxAudioSizeBytes: this.configService.get<number>('GNANI_MAX_AUDIO_SIZE_MB', 10) * 1024 * 1024,
      maxAudioDurationSeconds: this.configService.get<number>('GNANI_MAX_AUDIO_DURATION_SEC', 60),
      retryCount: this.configService.get<number>('GNANI_RETRY_COUNT', 3),
      retryDelayMs: this.configService.get<number>('GNANI_RETRY_DELAY_MS', 1000),
    };

    this._isAvailable = !!apiKey;

    if (!this._isAvailable) {
      this.logger.warn(
        'GNANI_API_KEY not configured. Voice AI features will be unavailable.',
      );
    }
  }

  get isAvailable(): boolean {
    return this._isAvailable;
  }

  /**
   * Convert speech audio to text using Gnani.ai STT API (v3).
   * POST https://api.vachana.ai/stt/v3 (multipart/form-data)
   */
  async speechToText(
    audioBuffer: Buffer,
    languageCode: string,
    mimeType: string,
  ): Promise<GnaniSttResult> {
    if (!this._isAvailable) {
      throw new Error('Gnani.ai is not configured. Set GNANI_API_KEY environment variable.');
    }

    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryCount; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        // Build multipart form manually for Node.js environment
        const boundary = `----FormBoundary${uuidv4().replace(/-/g, '')}`;
        const extension = this.getExtension(mimeType);
        const header = Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="audio_file"; filename="recording.${extension}"\r\nContent-Type: ${mimeType}\r\n\r\n`,
        );
        const footer = Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="language_code"\r\n\r\n${languageCode}\r\n--${boundary}\r\nContent-Disposition: form-data; name="format"\r\n\r\ntranscribe\r\n--${boundary}--\r\n`);
        const bodyBuffer = Buffer.concat([header, audioBuffer, footer]);

        const response = await fetch(`${this.config.baseUrl}/stt/v3`, {
          method: 'POST',
          headers: {
            'X-API-Key-ID': this.config.apiKey,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
          },
          body: bodyBuffer,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');

          if (response.status === 429) {
            await this.delay(this.config.retryDelayMs * attempt);
            continue;
          }

          throw new Error(
            `Gnani STT API error (HTTP ${response.status}): ${errorBody || response.statusText}`,
          );
        }

        const result = await response.json() as {
          success: boolean;
          request_id: string;
          timestamp: string;
          transcript: string;
        };

        const latencyMs = Date.now() - startTime;

        this.logger.log(
          `Gnani STT success: ${latencyMs}ms, transcript length: ${result.transcript?.length || 0}`,
        );

        return {
          success: result.success,
          transcript: result.transcript || '',
          requestId: result.request_id || uuidv4(),
          latencyMs,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (error instanceof DOMException && error.name === 'AbortError') {
          this.logger.warn(
            `Gnani STT attempt ${attempt}/${this.config.retryCount} timed out after ${this.config.timeout}ms`,
          );
        } else {
          this.logger.warn(
            `Gnani STT attempt ${attempt}/${this.config.retryCount} failed: ${lastError?.message || error}`,
          );
        }

        if (attempt < this.config.retryCount) {
          await this.delay(this.config.retryDelayMs * attempt);
        }
      }
    }

    throw lastError || new Error('Gnani STT failed after all retry attempts');
  }

  /**
   * Convert text to speech using Gnani.ai TTS API.
   * POST https://api.vachana.ai/api/v1/tts/inference (application/json)
   */
  async textToSpeech(
    text: string,
    languageCode: string,
  ): Promise<GnaniTtsResult> {
    if (!this._isAvailable) {
      throw new Error('Gnani.ai is not configured. Set GNANI_API_KEY environment variable.');
    }

    const startTime = Date.now();
    let lastError: Error | null = null;

    const voice = languageCode === 'hi-IN' ? 'Kaveri' : this.config.ttsVoice;

    for (let attempt = 1; attempt <= this.config.retryCount; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const requestBody = {
          text,
          model: this.config.ttsModel,
          voice,
          audio_config: {
            sample_rate: 24000,
            num_channels: 1,
            sample_width: 2,
            encoding: 'linear_pcm',
            container: 'wav',
          },
        };

        const response = await fetch(`${this.config.baseUrl}/api/v1/tts/inference`, {
          method: 'POST',
          headers: {
            'X-API-Key-ID': this.config.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');

          if (response.status === 429) {
            await this.delay(this.config.retryDelayMs * attempt);
            continue;
          }

          throw new Error(
            `Gnani TTS API error (HTTP ${response.status}): ${errorBody || response.statusText}`,
          );
        }

        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = Buffer.from(arrayBuffer);
        const latencyMs = Date.now() - startTime;

        this.logger.log(
          `Gnani TTS success: ${latencyMs}ms, audio size: ${audioBuffer.length} bytes`,
        );

        return {
          success: true,
          audioBuffer,
          latencyMs,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (error instanceof DOMException && error.name === 'AbortError') {
          this.logger.warn(
            `Gnani TTS attempt ${attempt}/${this.config.retryCount} timed out after ${this.config.timeout}ms`,
          );
        } else {
          this.logger.warn(
            `Gnani TTS attempt ${attempt}/${this.config.retryCount} failed: ${lastError?.message || error}`,
          );
        }

        if (attempt < this.config.retryCount) {
          await this.delay(this.config.retryDelayMs * attempt);
        }
      }
    }

    throw lastError || new Error('Gnani TTS failed after all retry attempts');
  }

  private getExtension(mimeType: string): string {
    const extMap: Record<string, string> = {
      'audio/wav': 'wav',
      'audio/wave': 'wav',
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/ogg': 'ogg',
      'audio/flac': 'flac',
      'audio/aac': 'aac',
      'audio/mp4': 'm4a',
      'audio/x-m4a': 'm4a',
      'audio/webm': 'webm',
    };
    return extMap[mimeType] || 'wav';
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const GnaniProviderFactory = {
  provide: GNANI_PROVIDER_TOKEN,
  useClass: GnaniApiProvider,
};
