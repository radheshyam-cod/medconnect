import { Injectable } from '@nestjs/common';
import { MedicalContext } from './dto/medical-context.dto';

@Injectable()
export class PromptBuilder {
  /**
   * Build an enriched medical extraction prompt with patient memory context.
   */
  buildExtractionPrompt(
    rawText: string,
    medicalContext: MedicalContext,
  ): string {
    const sections: string[] = [];

    if (medicalContext) {
      sections.push(`MEDICAL CONTEXT
${JSON.stringify(medicalContext, null, 2)}`);
    }

    sections.push(`INSTRUCTIONS
Extract structured medical entities from the following raw OCR text.
The text may be messy, contain typos, or be poorly formatted. Do your best to identify true medical concepts.
Return strictly a JSON object with these exact keys. For all keys EXCEPT labValues, return an array of strings.
For 'labValues', return an array of objects with these keys: "testName" (string), "value" (string), "unit" (string, or null), "isAbnormal" (boolean, true if out of range or flagged).
If none found, return an empty array for that key. Normalize dates to ISO format where possible. (confidence as a float between 0.0 and 1.0)
Keys: diseases, medicines, doctors, hospitals, labValues, dates, procedures, confidence`);

    sections.push(`RAW OCR TEXT
${rawText}`);

    return sections.join('\n\n');
  }

  /**
   * Build an enriched timeline generation prompt with patient memory.
   */
  buildTimelinePrompt(
    extractions: Record<string, unknown>[],
    medicalContext: MedicalContext,
  ): string {
    const sections: string[] = [];

    if (medicalContext) {
      sections.push(`MEDICAL CONTEXT
${JSON.stringify(medicalContext, null, 2)}`);
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
    extractions: Record<string, unknown>[],
    type: 'PATIENT' | 'DOCTOR',
    medicalContext: MedicalContext,
  ): string {
    const sections: string[] = [];

    const roleInstruction = type === 'DOCTOR'
      ? 'You are writing a concise clinical summary for a physician. Use standard medical terminology and ICD/CPT concepts where applicable.'
      : 'You are writing a friendly, easy-to-understand health summary for the patient. Avoid complex jargon and explain things simply.';

    sections.push(`ROLE
${roleInstruction}`);

    if (medicalContext) {
      sections.push(`MEDICAL CONTEXT
${JSON.stringify(medicalContext, null, 2)}`);
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
  compressExtractions(extractions: Record<string, unknown>[], maxTokens: number = 30000): Record<string, unknown>[] {
    const totalEstimate = this.estimateTokenCount(JSON.stringify(extractions));
    if (totalEstimate <= maxTokens) return extractions;

    // Remove rawOcrText from extractions to save tokens
    const compressed = extractions.map((e) => {
      const rest = { ...e };
      delete rest.rawOcrText;
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
}
