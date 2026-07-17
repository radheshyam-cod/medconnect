import { Injectable } from '@nestjs/common';
import { MemoryLogger } from './memory-logger.service';
import { PatientMemory } from './interfaces/memory.interface';

@Injectable()
export class MemorySanitizer {
  constructor(private readonly memoryLogger: MemoryLogger) {}

  sanitizeMemoryData(data: Record<string, unknown>): Record<string, unknown> {
    const cleaned = this.removeNullValues(data);
    const deduplicated = this.removeDuplicates(cleaned);
    const normalized = this.normalizeValues(deduplicated);
    const noArtifacts = this.removeOcrArtifacts(normalized);
    this.memoryLogger.debug('MEMORY_SANITIZED', {
      originalKeys: Object.keys(data).length,
      cleanedKeys: Object.keys(noArtifacts).length,
    });
    return noArtifacts;
  }

  sanitizePatientMemory(memory: PatientMemory): PatientMemory {
    const sanitized: PatientMemory = {};

    if (memory.medicalConditions) {
      sanitized.medicalConditions = memory.medicalConditions
        .filter((c) => c.name && c.name.trim().length > 0)
        .map((c) => ({
          ...c,
          name: this.normalizeMedicalTerm(c.name),
          confidence: Math.min(Math.max(c.confidence ?? 0.5, 0), 1),
        }));
    }

    if (memory.currentMedicines) {
      sanitized.currentMedicines = memory.currentMedicines
        .filter((m) => m.name && m.name.trim().length > 0)
        .map((m) => ({
          ...m,
          name: this.normalizeMedicineName(m.name),
        }));
    }

    if (memory.pastMedicines) {
      sanitized.pastMedicines = memory.pastMedicines
        .filter((m) => m.name && m.name.trim().length > 0)
        .map((m) => ({
          ...m,
          name: this.normalizeMedicineName(m.name),
        }));
    }

    if (memory.allergies) {
      sanitized.allergies = [...new Set(
        memory.allergies
          .filter((a) => a && a.trim().length > 0)
          .map((a) => this.normalizeMedicalTerm(a)),
      )];
    }

    if (memory.diagnoses) {
      sanitized.diagnoses = [...new Set(
        memory.diagnoses
          .filter((d) => d && d.trim().length > 0)
          .map((d) => this.normalizeMedicalTerm(d)),
      )];
    }

    if (memory.labTrends) {
      sanitized.labTrends = memory.labTrends
        .filter((l) => l.testName && l.testName.trim().length > 0)
        .map((l) => ({
          ...l,
          testName: this.normalizeMedicalTerm(l.testName),
          values: l.values.filter((v) => v.value && v.value.trim().length > 0),
        }))
        .filter((l) => l.values.length > 0);
    }

    if (memory.doctors) {
      sanitized.doctors = [...new Set(
        memory.doctors
          .filter((d) => d && d.trim().length > 0)
          .map((d) => this.normalizeName(d)),
      )];
    }

    if (memory.hospitals) {
      sanitized.hospitals = [...new Set(
        memory.hospitals
          .filter((h) => h && h.trim().length > 0)
          .map((h) => this.normalizeName(h)),
      )];
    }

    if (memory.vaccinations) {
      sanitized.vaccinations = [...new Set(
        memory.vaccinations
          .filter((v) => v && v.trim().length > 0)
          .map((v) => this.normalizeMedicalTerm(v)),
      )];
    }

    if (memory.importantClinicalFacts) {
      sanitized.importantClinicalFacts = [...new Set(
        memory.importantClinicalFacts
          .filter((f) => f && f.trim().length > 10),
      )];
    }

    if (memory.emergencyNotes) {
      sanitized.emergencyNotes = memory.emergencyNotes
        .filter((n) => n.note && n.note.trim().length > 5);
    }

    if (memory.healthTimeline) {
      sanitized.healthTimeline = memory.healthTimeline
        .filter((e) => e.title && e.title.trim().length > 0);
    }

    // Preserve other fields as-is
    if (memory.patientIdentity) sanitized.patientIdentity = memory.patientIdentity;
    if (memory.chronicDiseases) sanitized.chronicDiseases = memory.chronicDiseases;
    if (memory.surgeries) sanitized.surgeries = memory.surgeries;
    if (memory.procedures) sanitized.procedures = memory.procedures;
    if (memory.familyHistory) sanitized.familyHistory = memory.familyHistory;
    if (memory.lifestyle) sanitized.lifestyle = memory.lifestyle;
    if (memory.recurringSymptoms) sanitized.recurringSymptoms = memory.recurringSymptoms;
    if (memory.riskFactors) sanitized.riskFactors = memory.riskFactors;
    if (memory.preferences) sanitized.preferences = memory.preferences;
    if (memory.languages) sanitized.languages = memory.languages;
    if (memory.documentMetadata) sanitized.documentMetadata = memory.documentMetadata;
    if (memory.vitalSigns) sanitized.vitalSigns = memory.vitalSigns;

    return sanitized;
  }

  private removeNullValues(data: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) continue;
      if (Array.isArray(value) && value.length === 0) continue;
      if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) continue;
      if (typeof value === 'string' && value.trim().length === 0) continue;

      if (Array.isArray(value)) {
        const cleaned = value
          .filter((item) => item !== null && item !== undefined)
          .map((item) => typeof item === 'object' && item !== null ? this.removeNullValues(item as Record<string, unknown>) : item);
        if (cleaned.length > 0) result[key] = cleaned;
      } else if (typeof value === 'object') {
        const cleaned = this.removeNullValues(value as Record<string, unknown>);
        if (Object.keys(cleaned).length > 0) result[key] = cleaned;
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  private removeDuplicates(data: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = { ...data };
    for (const [key, value] of Object.entries(result)) {
      if (Array.isArray(value)) {
        const uniqueItems = this.deduplicateArray(value);
        result[key] = uniqueItems;
      }
    }
    return result;
  }

  private deduplicateArray(arr: unknown[]): unknown[] {
    const seen = new Set<string>();
    return arr.filter((item) => {
      if (typeof item === 'string') {
        const normalized = item.toLowerCase().trim();
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      }
      if (typeof item === 'object' && item !== null) {
        const key = JSON.stringify(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }
      return true;
    });
  }

  private normalizeValues(data: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = { ...data };
    for (const [key, value] of Object.entries(result)) {
      if (typeof value === 'string') {
        result[key] = value.trim().replace(/\s+/g, ' ');
      }
    }
    return result;
  }

  private removeOcrArtifacts(data: Record<string, unknown>): Record<string, unknown> {
    const ocrArtifactPatterns = [
      /^[•●■□●▪▸◦◇◆✓✗✘✙✚✛✜✝✞✟✠✡✢✣✤✥✦✧✨✩✪✫✬✭✮✯✰✱✲✳✴✵✶✷✸✹✺✻✼✽✾✿❀❁❂❃❄❅❆❇❈❉❊❋]+$/,
      /^[\d\s]{1,3}$/, // Just a few digits
      /^[_\-\s]+$/, // Just separators
      /^\s*$/, // Whitespace only
      /(<[^>]+>)/, // HTML tags
      /\[?\d*\]?/, // Just numbers in brackets
      /^Page \d+ of \d+$/i,
      /^Patient Name:/i,
      /^Date:\s*\d/,
      /^\d{1,2}\/\d{1,2}\/\d{2,4}$/, // Date-only strings that are OCR artifacts vs real data
    ];

    const result: Record<string, unknown> = { ...data };
    for (const [key, value] of Object.entries(result)) {
      if (Array.isArray(value)) {
        result[key] = value.filter((item) => {
          if (typeof item === 'string') {
            return !ocrArtifactPatterns.some((pattern) => pattern.test(item.trim()));
          }
          return true;
        });
      }
    }
    return result;
  }

  private normalizeMedicalTerm(term: string): string {
    return term
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[<>]/g, '')
      .replace(/^[\s,;:.]+|[\s,;:.]+$/g, '');
  }

  private normalizeMedicineName(name: string): string {
    // Remove common OCR noise from medicine names
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/^\d+\.?\s*/, '') // Remove leading numbers
      .replace(/\s*t\/\s*t\s*/g, ' ') // Remove "t/t" markers
      .replace(/\s*\d+x\d+\s*/g, ' ') // Remove "1x1" patterns
      .replace(/^[\s,;:.]+|[\s,;:.]+$/g, '');
  }

  private normalizeName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/^(Dr\.|Dr |Doctor)\s+/i, '')
      .replace(/^[\s,;:.]+|[\s,;:.]+$/g, '');
  }

  extractConfidence(text: string): number {
    // Simple heuristic: longer text = higher confidence
    const length = text.length;
    if (length < 10) return 0.3;
    if (length < 50) return 0.5;
    if (length < 200) return 0.7;
    return 0.9;
  }

  normalizeDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toISOString().split('T')[0];
    } catch {
      return dateStr;
    }
  }

  normalizeUnit(unit: string): string {
    const unitMap: Record<string, string> = {
      'mg/dl': 'mg/dL',
      'mg%': 'mg/dL',
      'gm%': 'g/dL',
      'gm/dl': 'g/dL',
      'u/l': 'U/L',
      'iu/l': 'IU/L',
      'miu/ml': 'mIU/mL',
      'ng/ml': 'ng/mL',
      'pg/ml': 'pg/mL',
      'cells/cumm': 'cells/μL',
      'cells/μl': 'cells/μL',
      '%': '%',
      'mm/h': 'mm/hr',
      'mmhg': 'mmHg',
    };
    return unitMap[unit.toLowerCase()] || unit;
  }
}
