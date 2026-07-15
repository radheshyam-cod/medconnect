import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '../database/prisma.service';
import { ContextBuilder } from '../ai-context/context-builder.service';
import { VoiceCommandDto, VoiceResponseDto } from './dto/voice-command.dto';

@Injectable()
export class VoiceAssistantService {
  private readonly logger = new Logger(VoiceAssistantService.name);
  private genAI: GoogleGenerativeAI | null = null;
  private readonly gnaniApiKey: string;
  private readonly gnaniApiUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly contextBuilder: ContextBuilder,
  ) {
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (geminiKey) {
      this.genAI = new GoogleGenerativeAI(geminiKey);
    }
    this.gnaniApiKey =
      this.configService.get<string>('GNANI_API_KEY') ||
      'vach_1ytE2CY5X2Pmf8TMaLyQEXnGg7A0ts5OxHwzRcCD2j32GokGiSThAM76H4A83a69uMRPJApQ67JBSjBwyFj68eLaOKgV2MHW_4ca17c3b2a6af29cfa1a7d27504e06f1';
    this.gnaniApiUrl =
      this.configService.get<string>('GNANI_API_URL') || 'https://api.vachana.ai';
  }

  /**
   * Main entry point to process voice/text command from Gnani STT -> AI -> TTS flow
   */
  async processCommand(
    userId: string,
    dto: VoiceCommandDto,
    audioBuffer?: Buffer,
  ): Promise<VoiceResponseDto> {
    const languageCode = dto.languageCode || 'hi-IN';
    let transcript = dto.textCommand?.trim() || '';

    // Step 1: Speech-to-Text (if audio buffer or audioBase64 provided and transcript empty)
    if (!transcript && (audioBuffer || dto.audioBase64)) {
      try {
        const bufferToUse = audioBuffer || Buffer.from(dto.audioBase64!, 'base64');
        transcript = await this.callGnaniStt(bufferToUse, languageCode);
      } catch (sttErr) {
        this.logger.error('Gnani STT call failed or returned empty fallback', sttErr);
        transcript =
          languageCode.startsWith('hi')
            ? 'नमस्ते, मैं आपकी क्या सहायता कर सकता हूँ?'
            : 'Hello, how can I help you with your health records today?';
      }
    }

    if (!transcript) {
      transcript =
        languageCode.startsWith('hi')
          ? 'नमस्ते, मैं आपकी क्या सहायता कर सकता हूँ?'
          : 'Hello, how can I help you with your health records today?';
    }

    // Step 2: Backend AI — Intent Routing & Health Q&A via Gemini + ContextBuilder
    const aiResult = await this.analyzeCommandAndGenerateResponse(userId, transcript, languageCode);

    // Step 3: Text-to-Speech via Gnani Vachana/Timbre TTS
    let audioBase64: string | null = null;
    try {
      audioBase64 = await this.callGnaniTts(aiResult.responseText, languageCode, dto.voiceName);
    } catch (ttsErr) {
      this.logger.warn('Gnani TTS call failed or timed out. Falling back to client-side Web Speech API.', ttsErr);
    }

    return {
      transcript,
      responseText: aiResult.responseText,
      audioBase64,
      action: aiResult.action,
    };
  }

  /**
   * Step 1 Helper: Call Gnani.ai Vachana STT API
   */
  private async callGnaniStt(audioBuffer: Buffer, languageCode: string): Promise<string> {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/wav' });
    formData.append('audio_file', blob, 'recording.wav');
    formData.append('language_code', languageCode);

    try {
      const response = await fetch(`${this.gnaniApiUrl}/stt/v3`, {
        method: 'POST',
        headers: {
          'X-API-Key-ID': this.gnaniApiKey,
          token: this.gnaniApiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Gnani STT returned status ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      return data.transcript || data.text || data.result || '';
    } catch (error) {
      this.logger.warn(`Gnani STT API error: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
  }

  /**
   * Step 2 Helper: Analyze command with Gemini + ContextBuilder (Prisma queries)
   */
  private async analyzeCommandAndGenerateResponse(
    userId: string,
    transcript: string,
    languageCode: string,
  ): Promise<{
    responseText: string;
    action: { type: 'SEARCH_RESULTS' | 'NAVIGATE_UPLOAD' | 'HEALTH_QA' | 'NAVIGATE'; navigationUrl?: string; payload?: Record<string, unknown> | unknown[] | null };
  }> {
    const patientContext = await this.contextBuilder.buildPatientContext(userId);
    const compressedContext = this.contextBuilder.compressContext(patientContext);

    // If Gemini not configured or unavailable, use deterministic rule-based router
    if (!this.genAI) {
      return this.ruleBasedFallbackRouter(userId, transcript, languageCode);
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-pro',
        generationConfig: { responseMimeType: 'application/json' },
      });

      const prompt = `You are Gnani.ai Voice Assistant inside the MedConnect India digital health platform.
The patient just spoke or typed this query in ${languageCode}:
"${transcript}"

Here is the patient's longitudinal health summary from their personal health records:
---
${compressedContext}
---

Your task:
1. Classify the user's intent into exactly one of these categories:
   - "SEARCH_RECORDS": Looking for documents, reports, lab tests, prescriptions, or historical visits.
   - "UPLOAD_DOCUMENT": Wants to upload a new prescription, lab report, or discharge summary.
   - "HEALTH_QA": Asking questions about their current health, active medicines, lab results, allergies, or general medical advice.
   - "NAVIGATE": Wants to open a specific screen (timeline, medications, labs, family, sharing, settings).
2. Generate an empathetic, clear voice assistant response inside "responseText" strictly in the SAME language as their query (${languageCode.startsWith('hi') ? 'Hindi (in Devanagari script or natural conversational Hindi)' : 'English'}).
3. Determine the appropriate action payload.

Return ONLY a valid JSON structure matching:
{
  "intent": "SEARCH_RECORDS" | "UPLOAD_DOCUMENT" | "HEALTH_QA" | "NAVIGATE",
  "responseText": "String response to be spoken aloud by TTS",
  "searchQuery": "Extracted search keywords if intent is SEARCH_RECORDS, else null",
  "targetScreen": "/dashboard | /timeline | /documents | /medications | /labs | /family | /share | /settings"
}`;

      const result = await model.generateContent(prompt);
      const parsed = JSON.parse(result.response.text());

      const intent = parsed.intent || 'HEALTH_QA';
      let actionType: 'SEARCH_RESULTS' | 'NAVIGATE_UPLOAD' | 'HEALTH_QA' | 'NAVIGATE' = 'HEALTH_QA';
      let navigationUrl = parsed.targetScreen || '/dashboard';
      let payload: Record<string, unknown> | unknown[] | null = null;

      if (intent === 'SEARCH_RECORDS') {
        actionType = 'SEARCH_RESULTS';
        const query = parsed.searchQuery || transcript;
        navigationUrl = `/search?q=${encodeURIComponent(query)}`;
        // Perform quick database lookup for matching records
        const matchingDocs = await this.prisma.document.findMany({
          where: {
            userId,
            fileName: { contains: query, mode: 'insensitive' },
          },
          take: 5,
        });
        const matchingLabs = await this.prisma.labResult.findMany({
          where: {
            userId,
            testName: { contains: query, mode: 'insensitive' },
          },
          take: 5,
        });
        payload = { documents: matchingDocs, labs: matchingLabs };
      } else if (intent === 'UPLOAD_DOCUMENT') {
        actionType = 'NAVIGATE_UPLOAD';
        navigationUrl = '/documents?action=upload';
      } else if (intent === 'NAVIGATE') {
        actionType = 'NAVIGATE';
        navigationUrl = parsed.targetScreen || '/dashboard';
      } else {
        actionType = 'HEALTH_QA';
      }

      return {
        responseText: parsed.responseText || (languageCode.startsWith('hi') ? 'मैंने आपकी जानकारी जांच ली है।' : 'I checked your health records.'),
        action: {
          type: actionType,
          navigationUrl,
          payload,
        },
      };
    } catch (err) {
      this.logger.error('Gemini Voice Assistant analysis failed', err);
      return this.ruleBasedFallbackRouter(userId, transcript, languageCode);
    }
  }

  /**
   * Step 3 Helper: Call Gnani.ai Timbre TTS API
   */
  private async callGnaniTts(text: string, languageCode: string, voiceName?: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.gnaniApiUrl}/api/v1/tts/inference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key-ID': this.gnaniApiKey,
          token: this.gnaniApiKey,
        },
        body: JSON.stringify({
          text,
          voice: voiceName || (languageCode.startsWith('hi') ? 'Aditi' : 'Karan'),
          audio_config: {
            container: 'mp3',
            sample_rate: 44100,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gnani TTS status ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer && arrayBuffer.byteLength > 0) {
        return `data:audio/mp3;base64,${Buffer.from(arrayBuffer).toString('base64')}`;
      }
      return null;
    } catch (error) {
      this.logger.debug(`Gnani TTS network call fallback: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  /**
   * Rule-based router if LLM unavailable or fails
   */
  private async ruleBasedFallbackRouter(userId: string, transcript: string, languageCode: string) {
    const lower = transcript.toLowerCase();
    const isHindi = languageCode.startsWith('hi') || /[\u0900-\u097F]/.test(transcript);

    if (lower.includes('upload') || lower.includes('अपलोड') || lower.includes('report') || lower.includes('रिपोर्ट')) {
      return {
        responseText: isHindi
          ? 'जरूर! मैं आपको नया मेडिकल डॉक्यूमेंट और रिपोर्ट अपलोड करने के पेज पर ले जा रहा हूँ।'
          : "Certainly! I'm taking you to the document upload dropzone right now.",
        action: {
          type: 'NAVIGATE_UPLOAD' as const,
          navigationUrl: '/documents?action=upload',
        },
      };
    }

    if (lower.includes('search') || lower.includes('खोज') || lower.includes('दिखाओ') || lower.includes('show') || lower.includes('lab') || lower.includes('खून')) {
      return {
        responseText: isHindi
          ? `मैंने आपके रिकॉर्ड्स में "${transcript}" की खोज शुरू कर दी है।`
          : `I have initiated a search for "${transcript}" across your longitudinal records.`,
        action: {
          type: 'SEARCH_RESULTS' as const,
          navigationUrl: `/search?q=${encodeURIComponent(transcript)}`,
        },
      };
    }

    // Default general QA / greeting
    const meds = await this.prisma.medication.findMany({ where: { userId, isActive: true }, take: 3 });
    const medNames = meds.map((m) => m.name).join(', ');

    return {
      responseText: isHindi
        ? `नमस्ते! वर्तमान में आपकी सक्रिय दवाएं हैं: ${medNames || 'कोई नहीं'}। आप मुझसे अपनी कोई भी रिपोर्ट या स्वास्थ्य जानकारी पूछ सकते हैं।`
        : `Hello! Your current active medications are: ${medNames || 'None logged'}. Feel free to ask about your lab trends, allergies, or doctor summaries.`,
      action: {
        type: 'HEALTH_QA' as const,
        navigationUrl: '/dashboard',
      },
    };
  }
}
