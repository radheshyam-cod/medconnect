import { Injectable } from '@nestjs/common';
import { MemorySearchResult } from '../memory/interfaces/memory.interface';
import { PatientAiContext } from './context-builder.service';

@Injectable()
export class PromptBuilder {
  /**
   * Build an enriched medical extraction prompt with patient memory context.
   */
  buildExtractionPrompt(
    rawText: string,
    memoryContext: string,
    patientContext: string,
  ): string {
    const sections: string[] = [];

    sections.push(`PATIENT CONTEXT
${patientContext}`);

    if (memoryContext) {
      sections.push(`PATIENT MEMORY
${memoryContext}`);
    }

    sections.push(`INSTRUCTIONS
Extract structured medical entities from the following raw OCR text.
The text may be messy, contain typos, or be poorly formatted. Do your best to identify true medical concepts.
Return strictly a JSON object with these exact keys, each containing an array of strings. If none found, return an empty array for that key. Normalize dates to ISO format where possible.
Keys: diseases, medicines, doctors, hospitals, labValues, dates, procedures`);

    sections.push(`RAW OCR TEXT
${rawText}`);

    return sections.join('\n\n');
  }

  /**
   * Build an enriched timeline generation prompt with patient memory.
   */
  buildTimelinePrompt(
    extractions: any[],
    memoryContext: string,
    patientContext: string,
  ): string {
    const sections: string[] = [];

    sections.push(`PATIENT CONTEXT
${patientContext}`);

    if (memoryContext) {
      sections.push(`PATIENT MEMORY
${memoryContext}`);
    }

    sections.push(`INSTRUCTIONS
You are a medical data analyst. Given extracted medical data from documents, create a chronological health timeline.
Use the patient context and memory to avoid duplicating known information and to enhance accuracy.
Group related events. Each event MUST include the sourceDocumentId from the extraction it came from.
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
}`);

    sections.push(`EXTRACTIONS
${JSON.stringify(extractions)}`);

    return sections.join('\n\n');
  }

  /**
   * Build an enriched patient summary prompt.
   */
  buildSummaryPrompt(
    extractions: any[],
    type: 'PATIENT' | 'DOCTOR',
    memoryContext: string,
    patientContext: string,
  ): string {
    const sections: string[] = [];

    const roleInstruction = type === 'DOCTOR'
      ? 'You are writing a concise clinical summary for a physician. Use standard medical terminology and ICD/CPT concepts where applicable.'
      : 'You are writing a friendly, easy-to-understand health summary for the patient. Avoid complex jargon and explain things simply.';

    sections.push(`ROLE
${roleInstruction}`);

    sections.push(`PATIENT CONTEXT
${patientContext}`);

    if (memoryContext) {
      sections.push(`PATIENT MEMORY
${memoryContext}`);
    }

    sections.push(`INSTRUCTIONS
Based on the following extracted medical records and the patient's historical memory, provide a comprehensive summary of the patient's health history.
Use the patient memory to fill in gaps, identify trends, and avoid duplicating information.
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
}`);

    sections.push(`EXTRACTIONS
${JSON.stringify(extractions)}`);

    return sections.join('\n\n');
  }

  /**
   * Format memory search results into a compact string for prompt injection.
   */
  formatMemoriesForPrompt(memories: MemorySearchResult[]): string {
    if (!memories || memories.length === 0) return '';

    const parts: string[] = [];
    const seenCategories = new Set<string>();

    for (const memory of memories) {
      const category = memory.category || 'general';
      const label = category.charAt(0).toUpperCase() + category.slice(1);

      if (!seenCategories.has(category)) {
        seenCategories.add(category);
        parts.push(`\n[${label}]:`);
      }

      // Truncate long memories to save tokens
      const content = memory.memory.length > 500
        ? memory.memory.substring(0, 500) + '...'
        : memory.memory;

      parts.push(`- ${content.replace(/\n/g, ' ').substring(0, 200)}`);
    }

    return parts.join('\n');
  }

  /**
   * Estimate token count for a prompt string (rough approximation).
   */
  estimateTokenCount(text: string): number {
    // Rough estimation: ~4 chars per token for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Compress extractions list to avoid token overflow.
   * Keeps most recent extractions and removes very large raw text.
   */
  compressExtractions(extractions: any[], maxTokens: number = 30000): any[] {
    const totalEstimate = this.estimateTokenCount(JSON.stringify(extractions));
    if (totalEstimate <= maxTokens) return extractions;

    // Remove rawOcrText from extractions to save tokens
    const compressed = extractions.map((e) => {
      const { rawOcrText, ...rest } = e;
      return rest;
    });

    const compressedEstimate = this.estimateTokenCount(JSON.stringify(compressed));
    if (compressedEstimate <= maxTokens) return compressed;

    // If still too large, reduce the number of extractions
    const maxExtractions = Math.max(
      5,
      Math.floor((maxTokens / compressedEstimate) * compressed.length),
    );
    return compressed.slice(0, maxExtractions);
  }

  /**
   * Merge and deduplicate context to avoid repeating information.
   */
  mergeContexts(
    patientContext: string,
    memoryContext: string,
  ): string {
    // Remove duplicate lines between the two contexts
    const patientLines = new Set(patientContext.split('\n').filter((l) => l.trim()));
    const memoryLines = memoryContext.split('\n').filter((l) => l.trim());

    const uniqueMemoryLines = memoryLines.filter(
      (line) => !patientLines.has(line),
    );

    return [patientContext, ...uniqueMemoryLines].join('\n');
  }
}
