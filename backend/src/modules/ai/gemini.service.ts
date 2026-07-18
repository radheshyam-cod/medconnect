import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIContextService } from '../ai-context/ai-context.service';
import { MemoryLogger } from '../memory/memory-logger.service';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly aiContextService: AIContextService,
    private readonly memoryLogger: MemoryLogger,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    } else {
      this.logger.warn('GEMINI_API_KEY not configured. AI features will be unavailable.');
    }
  }

  private async generateWithFallback(
    prompt: string | Array<unknown>,
    generationConfig?: Record<string, unknown>,
    models: string[] = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest', 'gemini-flash-latest']
  ): Promise<string> {
    if (!this.genAI) {
      throw new Error('AI not initialized');
    }
    let lastError: unknown;
    for (const modelName of models) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: modelName,
          generationConfig,
        });
        const result = await model.generateContent(
          prompt as string | Array<string | { inlineData: { data: string; mimeType: string } }>,
        );
        const text = result.response.text();
        if (text) {
          if (modelName !== models[0]) {
            this.logger.warn(`Successfully generated response using fallback model: ${modelName}`);
          }
          return text;
        }
      } catch (error) {
        lastError = error;
        this.logger.warn(`Model ${modelName} failed (${error instanceof Error ? error.message : String(error)}), trying next fallback...`);
      }
    }
    throw lastError || new Error('All models failed');
  }

  async extractTextFromMedia(base64Data: string, mimeType: string, prompt: string): Promise<string> {
    if (!this.genAI) {
      return '';
    }
    try {
      const parts = [
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
      ];
      return await this.generateWithFallback(parts);
    } catch (error) {
      this.logger.error('Gemini vision extraction failed', error);
      return '';
    }
  }

  async extractMedicalData(rawText: string, clerkId?: string) {
    if (!this.genAI) {
      return this.fallbackExtraction();
    }

    try {
      // Build enriched prompt with patient context and memory
      let prompt: string;
      if (clerkId) {
        // We need the internal userId - the context service handles this
        const context = await this.aiContextService.buildExtractionContext(clerkId, rawText);
        prompt = context.enrichedPrompt;
        this.memoryLogger.debug('EXTRACTION_WITH_MEMORY', { hasMemory: context.hasMemory });
      } else {
        prompt = this.buildExtractionPrompt(rawText);
      }

      const text = await this.generateWithFallback(prompt, { responseMimeType: 'application/json' });
      return JSON.parse(text);
    } catch (error) {
      this.logger.error('Gemini extraction failed', error);
      return this.fallbackExtraction();
    }
  }

  async generateChatReply(prompt: string, _history?: Array<{ role: string; text: string }>): Promise<string> {
    if (!this.genAI) {
      return 'AI features are not configured. Please set GEMINI_API_KEY.';
    }

    try {
      const text = await this.generateWithFallback(prompt, {
        temperature: 0.3,
        maxOutputTokens: 3072,
        topP: 0.9,
      });
      return text || 'I could not generate an answer.';
    } catch (error) {
      this.logger.error('Gemini chat reply generation failed:', error);
      throw error;
    }
  }

  async generateTimeline(extractions: Record<string, unknown>[], clerkId?: string) {
    if (!this.genAI) {
      return { events: [], model: 'fallback' };
    }

    try {
      let prompt: string;
      if (clerkId) {
        const context = await this.aiContextService.buildTimelineContext(clerkId, extractions);
        prompt = context.enrichedPrompt;
        this.memoryLogger.debug('TIMELINE_WITH_MEMORY', { hasMemory: context.hasMemory });
      } else {
        prompt = this.buildTimelinePrompt(extractions);
      }

      const text = await this.generateWithFallback(prompt, { responseMimeType: 'application/json' });
      const parsed = JSON.parse(text);
      return { events: parsed.events || [], model: 'gemini-3.5-flash' };
    } catch (error) {
      this.logger.error('Gemini timeline generation failed', error);
      return { events: [], model: 'fallback' };
    }
  }

  async summarizePatientHistory(extractions: Record<string, unknown>[], type: 'PATIENT' | 'DOCTOR', clerkId?: string) {
    if (!this.genAI) {
      return { summary: "AI summary not available." };
    }

    try {
      let prompt: string;
      if (clerkId) {
        const context = await this.aiContextService.buildSummaryContext(clerkId, extractions, type);
        prompt = context.enrichedPrompt;
        this.memoryLogger.debug('SUMMARY_WITH_MEMORY', { hasMemory: context.hasMemory });
      } else {
        prompt = this.buildSummaryPrompt(extractions, type);
      }

      const text = await this.generateWithFallback(prompt, { responseMimeType: 'application/json' });
      return JSON.parse(text);
    } catch (error) {
      this.logger.error('Gemini summarization failed', error);
      return { summary: "Summarization failed." };
    }
  }

  async summarizeTimeline(
    events: Array<{ eventDate: Date; eventType: string; title: string; description?: string | null; severity?: string | null; facility?: string | null; doctorName?: string | null; diseases: string[]; medicines: string[] }>,
    periodLabel: string,
    _clerkId?: string,
  ) {
    if (!this.genAI) {
      return this.fallbackTimelineSummary(events, periodLabel);
    }

    try {
      const prompt = `You are a medical data analyst reviewing a patient's health timeline events from the last month (${periodLabel}).
Analyze the events below and return a JSON object with this exact structure:
{
  "summary": "A 2-3 paragraph narrative summary of the most important health events and patterns from the last month",
  "keyEvents": [
    {
      "date": "event date",
      "title": "event title",
      "type": "event type",
      "significance": "Why this event was medically significant (1 sentence)"
    }
  ],
  "trends": ["Array of observed health trends or patterns (2-4 items)"],
  "recommendations": ["Array of practical health recommendations based on the events (2-3 items)"]
}

Focus on:
- New diagnoses or conditions
- Changes in medication
- Abnormal lab results or significant procedures
- Hospitalizations or ER visits
- Patterns in symptoms or visits

Timeline Events:
${JSON.stringify(events, null, 2)}`;

      const text = await this.generateWithFallback(prompt, { responseMimeType: 'application/json' });
      return JSON.parse(text);
    } catch (error) {
      this.logger.error('Gemini timeline summary failed', error);
      return this.fallbackTimelineSummary(events, periodLabel);
    }
  }

  private fallbackTimelineSummary(
    events: Array<{ eventDate: Date; eventType: string; title: string }>,
    periodLabel: string,
  ) {
    const byType: Record<string, number> = {};
    for (const e of events) {
      byType[e.eventType] = (byType[e.eventType] || 0) + 1;
    }
    const topTypes = Object.entries(byType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type, count]) => `${count} ${type.toLowerCase().replace(/_/g, ' ')}`);

    return {
      summary: events.length === 0
        ? `No health events recorded in ${periodLabel}.`
        : `In ${periodLabel}, you had ${events.length} health event${events.length !== 1 ? 's' : ''}, including ${topTypes.join(', ')}. ${topTypes.length > 0 ? 'Your most frequent activity was ' + topTypes[0] + '.' : ''}`,
      keyEvents: events.slice(0, 5).map((e) => ({
        date: e.eventDate.toISOString().split('T')[0],
        title: e.title || 'Health event',
        type: e.eventType,
        significance: 'Recorded in your health timeline.',
      })),
      trends: ['Continue monitoring your health regularly.'],
      recommendations: ['Keep your medical records up to date by uploading new documents.'],
    };
  }

  private buildExtractionPrompt(rawText: string): string {
    return `Extract structured medical entities from the following raw OCR text.
The text may be messy, contain typos, or be poorly formatted. Do your best to identify true medical concepts.
Return strictly a JSON object with these exact keys, each containing an array of strings (plus confidence as a float between 0.0 and 1.0 e.g. 0.94 representing overall extraction confidence). If none found, return an empty array for that key. Normalize dates to ISO format where possible.
Keys: diseases, medicines, doctors, hospitals, labValues, dates, procedures, confidence
Raw OCR Text:
${rawText}`;
  }

  private buildTimelinePrompt(extractions: Record<string, unknown>[]): string {
    return `You are a medical data analyst. Given extracted medical data from documents, create a chronological health timeline. Group related events. Each event MUST include the sourceDocumentId from the extraction it came from.
Output a JSON array of events with this exact structure:
{
  "events": [
    {
      "eventType": "VISIT|DIAGNOSIS|MEDICATION|LAB_TEST|PROCEDURE|IMAGING|VACCINATION|ALLERGY|HOSPITALIZATION|SURGERY|OTHER",
      "eventDate": "ISO date string",
      "endDate": "ISO date string or null",
      "title": "Short event title",
      "description": "Detailed description",
      "severity": "MILD|MODERATE|SEVERE|CRITICAL|null",
      "facility": "Hospital/clinic name or null",
      "doctorName": "Doctor name or null",
      "diseases": ["array of disease names"],
      "medicines": ["array of medicine names"],
      "procedureName": "procedure name or null",
      "labValues": {},
      "sourceDocumentId": "ID of the source document"
    }
  ]
}
Extractions:
${JSON.stringify(extractions)}`;
  }

  private buildSummaryPrompt(extractions: Record<string, unknown>[], type: 'PATIENT' | 'DOCTOR'): string {
    const roleInstruction = type === 'DOCTOR' 
      ? 'You are writing a concise clinical summary for a physician. Use standard medical terminology and ICD/CPT concepts where applicable.'
      : 'You are writing a friendly, easy-to-understand health summary for the patient. Avoid complex jargon and explain things simply.';

    return `${roleInstruction}
Based on the following extracted medical records, provide a comprehensive summary of the patient's health history.
You MUST return the output strictly as a JSON object with the following exact keys. Use empty arrays if data is not available.
{
  "currentConditions": ["string array of conditions/diseases"],
  "currentMedicines": [{"name": "string", "dosage": "string", "frequency": "string"}],
  "allergies": ["string array of allergens"],
  "recentLabs": [{"testName": "string", "date": "string", "value": "string", "abnormal": boolean}],
  "recentImaging": [{"procedure": "string", "date": "string", "finding": "string"}],
  "pastSurgeries": [{"procedure": "string", "date": "string"}],
  "vitalSigns": [{"name": "string", "value": "string", "date": "string"}],
  "summary": "A detailed 2-3 paragraph narrative summary of their overall health."
}

Extractions:
${JSON.stringify(extractions)}`;
  }

  private fallbackExtraction() {
    return {
      diseases: [],
      medicines: [],
      doctors: [],
      hospitals: [],
      labValues: [],
      dates: [],
      procedures: [],
      confidence: 0.85,
    };
  }
}
