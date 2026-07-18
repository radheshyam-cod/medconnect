export interface ContextMetadata {
  version: string;
  source: string;
  timestamp: string;
  confidence: number;
  hash: string;
}

export interface ContextItem {
  id: string;
  meta: ContextMetadata;
}

export interface ConditionContext extends ContextItem {
  name: string;
  status: 'ACTIVE' | 'RESOLVED' | 'CHRONIC';
  diagnosedDate?: string;
}

export interface MedicationContext extends ContextItem {
  name: string;
  dosage?: string;
  frequency?: string;
  isActive: boolean;
}

export interface LabContext extends ContextItem {
  testName: string;
  value: string;
  unit?: string;
  isAbnormal: boolean;
  date: string;
}

export interface TimelineContext extends ContextItem {
  eventType: string;
  title: string;
  description?: string;
  date: string;
}

export interface PatientProfileContext extends ContextItem {
  age?: number;
  gender?: string;
  bloodGroup?: string;
  allergies: string[];
}

export interface ImportantEventContext extends ContextItem {
  description: string;
  date?: string;
}

export interface MedicalContext {
  patient: PatientProfileContext | null;
  conditions: ConditionContext[];
  medications: MedicationContext[];
  labs: LabContext[];
  timeline: TimelineContext[];
  riskFactors: ContextItem[]; // Extending this with specific fields if needed
  importantEvents: ImportantEventContext[];
}
