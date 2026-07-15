export const MEMORY_PROVIDER_TOKEN = 'MEMORY_PROVIDER';

export interface PatientMemory {
  patientIdentity?: PatientIdentity;
  medicalConditions?: MedicalCondition[];
  diagnoses?: string[];
  chronicDiseases?: string[];
  allergies?: string[];
  currentMedicines?: MedicineInfo[];
  pastMedicines?: MedicineInfo[];
  labTrends?: LabTrend[];
  vitalSigns?: VitalSign[];
  surgeries?: Procedure[];
  procedures?: Procedure[];
  vaccinations?: string[];
  familyHistory?: FamilyHistoryEntry[];
  lifestyle?: LifestyleInfo;
  doctors?: string[];
  hospitals?: string[];
  recurringSymptoms?: string[];
  emergencyNotes?: EmergencyNote[];
  riskFactors?: string[];
  healthTimeline?: HealthTimelineEntry[];
  preferences?: PatientPreference[];
  languages?: string[];
  documentMetadata?: DocumentMetadata[];
  importantClinicalFacts?: string[];
}

export interface PatientIdentity {
  userId: string;
  age?: number;
  gender?: string;
  bloodGroup?: string;
  abhaId?: string;
}

export interface MedicalCondition {
  name: string;
  diagnosedDate?: string;
  status?: 'ACTIVE' | 'RESOLVED' | 'CHRONIC';
  confidence: number;
  source: string;
  lastUpdated: string;
}

export interface MedicineInfo {
  name: string;
  dosage?: string;
  frequency?: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  source: string;
  lastUpdated: string;
}

export interface LabTrend {
  testName: string;
  category?: string;
  values: LabValue[];
  trend?: 'STABLE' | 'IMPROVING' | 'WORSENING' | 'FLUCTUATING';
}

export interface LabValue {
  value: string;
  unit?: string;
  date: string;
  isAbnormal: boolean;
  source: string;
}

export interface VitalSign {
  name: string;
  value: string;
  date: string;
  source: string;
}

export interface Procedure {
  name: string;
  date?: string;
  facility?: string;
  source: string;
}

export interface FamilyHistoryEntry {
  relation: string;
  condition: string;
  notes?: string;
}

export interface LifestyleInfo {
  smoking?: string;
  alcohol?: string;
  pregnancy?: string;
  exercise?: string;
}

export interface EmergencyNote {
  note: string;
  date: string;
  severity?: string;
  source: string;
}

export interface HealthTimelineEntry {
  eventType: string;
  date: string;
  title: string;
  description?: string;
  source: string;
}

export interface PatientPreference {
  key: string;
  value: string;
}

export interface DocumentMetadata {
  documentId: string;
  fileName: string;
  fileType: string;
  documentType?: string;
  uploadedAt: string;
}

export interface MemorySearchResult {
  id: string;
  score: number;
  memory: string;
  category?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface MemorySyncEvent {
  userId: string;
  eventType: MemoryEventType;
  data: Record<string, any>;
  timestamp?: string;
}

export enum MemoryEventType {
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  OCR_COMPLETED = 'OCR_COMPLETED',
  EXTRACTION_COMPLETED = 'EXTRACTION_COMPLETED',
  MEDICATION_CREATED = 'MEDICATION_CREATED',
  MEDICATION_UPDATED = 'MEDICATION_UPDATED',
  MEDICATION_DELETED = 'MEDICATION_DELETED',
  LAB_CREATED = 'LAB_CREATED',
  LAB_UPDATED = 'LAB_UPDATED',
  TIMELINE_CREATED = 'TIMELINE_CREATED',
  TIMELINE_UPDATED = 'TIMELINE_UPDATED',
  SUMMARY_GENERATED = 'SUMMARY_GENERATED',
  FHIR_IMPORTED = 'FHIR_IMPORTED',
  ABDM_SYNCED = 'ABDM_SYNCED',
  PATIENT_PROFILE_UPDATED = 'PATIENT_PROFILE_UPDATED',
  MANUAL_CORRECTION = 'MANUAL_CORRECTION',
  FAMILY_RECORD_SHARED = 'FAMILY_RECORD_SHARED',
}

export interface MemoryConfig {
  apiKey: string;
  projectId?: string;
  orgId?: string;
  baseUrl?: string;
  timeout: number;
  retries: number;
  cacheTtl: number;
  batchSize: number;
}
