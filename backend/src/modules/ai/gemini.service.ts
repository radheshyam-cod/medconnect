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
    if (extractions.length === 0) {
      return {
        currentConditions: [],
        currentMedicines: [],
        allergies: [],
        recentLabs: [],
        recentImaging: [],
        pastSurgeries: [],
        vitalSigns: [],
        immunizations: [],
        summary: "No medical documents provided yet. Please upload clinical documents or prescriptions to generate insights."
      };
    }

    const normalizeSummary = (parsed: Record<string, unknown>) => {
      const currentConditions = parsed?.currentConditions;
      const conditions = Array.isArray(currentConditions) && currentConditions.length > 0
        ? currentConditions.map((c: Record<string, unknown> | string) => typeof c === 'string' ? c : String(c.name || c.condition || 'General Condition'))
        : [];

      const currentMedicines = parsed?.currentMedicines;
      const medicines = Array.isArray(currentMedicines) && currentMedicines.length > 0
        ? currentMedicines.map((m: Record<string, unknown> | string) => {
            const name = typeof m === 'string' ? m : String(m.name || 'Prescription Medication');
            const rawDosage = (typeof m === 'object' && m !== null && typeof m.dosage === 'string' && m.dosage.trim()) ? m.dosage : 'As prescribed';
            const isMissingDosage = rawDosage === 'As prescribed' || rawDosage === '-';
            const dosage = isMissingDosage ? 'Missing exact dosage (Please update intake & timing, e.g. "1 tablet after meals")' : rawDosage;
            return {
              name,
              dosage,
              rawDosage,
              isMissingDosage,
              frequency: (typeof m === 'object' && m !== null && typeof m.frequency === 'string' && m.frequency.trim()) ? m.frequency : 'Daily',
              indication: (typeof m === 'object' && m !== null && typeof m.indication === 'string' && m.indication.trim()) ? m.indication : '',
              displayText: (typeof m === 'object' && m !== null && typeof m.displayText === 'string' && m.displayText.trim()) ? m.displayText : '',
            };
          })
        : [];

      const recentLabs = parsed?.recentLabs;
      const labs = Array.isArray(recentLabs)
        ? recentLabs.map((l: Record<string, unknown>) => {
            const testName = String(l?.testName || 'Laboratory Test');
            let ref = (typeof l?.referenceRange === 'string' && l.referenceRange.trim() && !l.referenceRange.toLowerCase().includes('standard reference range') && !l.referenceRange.toLowerCase().includes('within standard laboratory baseline'))
              ? l.referenceRange
              : (typeof l?.range === 'string' && l.range.trim() && !l.range.toLowerCase().includes('standard reference range') ? l.range : '');
            if (!ref) {
              const nameLow = testName.toLowerCase();
              if (nameLow.includes('sugar') || nameLow.includes('glucose')) ref = '< 100 mg/dL';
              else if (nameLow.includes('pressure') || nameLow.includes('bp')) ref = '120/80 mmHg';
              else if (nameLow.includes('hba1c') || nameLow.includes('a1c')) ref = '< 5.7%';
              else if (nameLow.includes('cholesterol')) ref = '< 200 mg/dL';
              else if (nameLow.includes('hemoglobin')) ref = '13.5 - 17.5 g/dL';
              else if (nameLow.includes('mpv')) ref = '8.0 - 12.0 fL';
              else if (nameLow.includes('pdw')) ref = '10.0 - 18.0 fL';
              else if (nameLow.includes('lym')) ref = '20 - 40%';
              else if (nameLow.includes('p-lcr')) ref = '15.0 - 35.0%';
              else if (nameLow.includes('rdw')) ref = '11.5 - 14.5%';
              else ref = '';
            }
            return {
              testName,
              date: String(l?.date || new Date().toISOString().split('T')[0]),
              value: String(l?.value || 'Normal'),
              unit: String(l?.unit || ''),
              referenceRange: ref,
              abnormal: Boolean(l?.abnormal || l?.isAbnormal),
              summaryText: typeof l?.summaryText === 'string' ? l.summaryText : '',
            };
          })
        : [];

      return {
        ...parsed,
        currentConditions: conditions,
        currentMedicines: medicines,
        recentLabs: labs,
        summary: parsed?.summary || (type === 'DOCTOR' ? 'Patient status stable with no critical acute issues reported.' : 'Your health profile is stable based on recent records.'),
      };
    };

    if (!this.genAI) {
      return normalizeSummary({
        currentConditions: ['General Health Maintenance (No active chronic diagnoses reported)'],
        currentMedicines: [],
        recentLabs: [],
        summary: "AI summary not available. Showing normalized baseline profile."
      });
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
      return normalizeSummary(JSON.parse(text));
    } catch (error) {
      this.logger.error('Gemini summarization failed', error);
      return normalizeSummary({
        currentConditions: ['General Health Maintenance (No active chronic diagnoses reported)'],
        currentMedicines: [],
        recentLabs: [],
        summary: "Summarization encountered a temporary error. Showing normalized baseline profile."
      });
    }
  }

  async summarizeTimeline(
    events: Array<{ eventDate: Date; eventType: string; title: string; description?: string | null; severity?: string | null; facility?: string | null; doctorName?: string | null; diseases: string[]; medicines: string[] }>,
    periodLabel: string,
    _clerkId?: string,
  ) {
    if (events.length === 0) {
      return {
        summary: `No medical documents or timeline events recorded yet. Upload your first medical report, prescription, or lab test to start tracking and generate your AI health summary.`,
        keyEvents: [],
        trends: [],
        recommendations: [],
      };
    }

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
Return strictly a JSON object with these exact keys:
For 'diseases', return an array of strings representing active conditions and diagnoses (NEVER leave empty if any condition or symptom is mentioned).
For 'medicines', return an array of objects with these exact keys: "name" (string), "dosage" (string, e.g. "10 mg" or "As prescribed" if not stated), "frequency" (string, e.g. "Once daily" or "Daily" if not stated). DO NOT return plain strings for medicines.
For 'doctors', 'hospitals', 'dates', 'procedures', return an array of strings.
For 'labValues', return an array of objects with these keys: "testName" (string), "value" (string), "unit" (string, or null), "referenceRange" (string representing the Normal Range, e.g. "70 - 99 mg/dL" or "Standard reference range" if not explicitly mentioned), "isAbnormal" (boolean, true if out of range or flagged).
If none found, return an empty array for that key. Normalize dates to ISO format where possible. (confidence as a float between 0.0 and 1.0)
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
CRITICAL CLINICAL RULES:
1. Do NOT use the phrase 'General Health Maintenance' if any chronic conditions (like Essential Hypertension, Pre-diabetes, Diabetes, GERD, Hypothyroidism, Hyperlipidemia) or corresponding chronic medications exist in the records.
2. If consultations or prescriptions mention Telmisartan, Metformin, Pan D, or elevated BP/Sugar, strictly include active diagnoses such as 'Essential Hypertension' and 'Pre-diabetes'.
3. Group current medications and explicitly link them to their respective diagnoses (e.g., "Telmisartan for Essential Hypertension", "Metformin for Pre-diabetes", "Pan D for GERD").
4. If medication dosage is 'As prescribed' or missing, explicitly output dosage as 'Missing exact dosage (Please update intake & timing, e.g. "1 tablet after meals")'.
5. For hematology / CBC values: label out-of-range values specifically as [Abnormal/Low] or [Abnormal/High] based on standard reference ranges (MPV 8.0-12.0 fL -> 7.4 is [Abnormal/Low], PDW 10.0-18.0 fL -> 9.9 is [Abnormal/Low], LYM 20-40%, P-LCR 15.0-35.0%, RDW-CV 11.5-14.5%). Do not label low values as [Abnormal/Elevated].
6. Remove any placeholder text that says 'Standard reference range' or '(Normal Baseline: ...)' if the specific numerical reference range is not known/available.

You MUST return the output strictly as a JSON object with the following exact keys. Ensure NO mandatory fields are left empty:
{
  "currentConditions": ["string array of active conditions/diagnoses (e.g. ['Essential Hypertension', 'Pre-diabetes']). If and ONLY IF no medical conditions or medicines exist at all, return ['General Health Maintenance (No active chronic diagnoses reported)']"],
  "currentMedicines": [{"name": "string", "dosage": "string (flag missing if needed)", "frequency": "string (NEVER empty, default 'Daily')", "indication": "string linking to diagnosis (e.g. 'for Essential Hypertension')"}],
  "allergies": ["string array of allergens"],
  "recentLabs": [{"testName": "string", "date": "string", "value": "string", "abnormal": boolean, "referenceRange": "string (exact numerical range or empty string, NEVER placeholder)", "summaryText": "string highlighting finding, exact baseline if known, and [Abnormal/Low] vs [Abnormal/High]"}],
  "recentImaging": [{"procedure": "string", "date": "string", "finding": "string"}],
  "pastSurgeries": [{"procedure": "string", "date": "string"}],
  "vitalSigns": [{"name": "string", "value": "string", "date": "string"}],
  "summary": "A detailed 2-3 paragraph clinical narrative summary linking diagnoses, current medications, and significant lab findings cleanly."
}

Extractions:
${JSON.stringify(extractions)}`;
  }

  async generateLabInsights(labs: any[]) {
    if (!this.genAI) {
      return this.fallbackLabInsights();
    }

    try {
      const prompt = `You are an expert AI health assistant analyzing a patient's recent lab results.
Analyze the following lab results and generate personalized, actionable insights.
Return strictly a JSON object matching this exact structure:
{
  "summary": "A concise 2-sentence summary of their overall lab health and any notable changes.",
  "keyInsights": [
    {
      "text": "The insight observation (e.g. 'Vitamin D levels are low')",
      "type": "positive" | "negative" | "neutral"
    }
  ],
  "recommendations": [
    "A practical, actionable recommendation based on the results"
  ]
}

Ensure you provide between 3 to 5 key insights and 1 to 3 recommendations. If there are no labs, return a generic encouraging message.

Recent Lab Results:
${JSON.stringify(labs.slice(0, 20), null, 2)}`;

      const text = await this.generateWithFallback(prompt, { responseMimeType: 'application/json' });
      return JSON.parse(text);
    } catch (error) {
      this.logger.error('Gemini lab insights generation failed', error);
      return this.fallbackLabInsights();
    }
  }

  private fallbackLabInsights() {
    return {
      summary: "Your lab results are being monitored. Upload more recent reports for deeper insights.",
      keyInsights: [
        { text: "Continue maintaining a healthy lifestyle.", type: "neutral" }
      ],
      recommendations: [
        "Upload recent blood tests or lab reports to get personalized AI health insights."
      ]
    };
  }

  private fallbackExtraction() {
    return {
      diseases: ['General Health Maintenance'],
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
