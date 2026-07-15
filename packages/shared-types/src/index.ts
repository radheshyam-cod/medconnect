// ─── API Response Types ───
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  meta?: PaginationMeta;
  error?: ApiError;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  timestamp: string;
  path: string;
  errors?: Record<string, string[]>;
}

// ─── Document Types ───
export enum DocumentType {
  PRESCRIPTION = "PRESCRIPTION",
  LAB_REPORT = "LAB_REPORT",
  DISCHARGE_SUMMARY = "DISCHARGE_SUMMARY",
  IMAGING_REPORT = "IMAGING_REPORT",
  VACCINATION_CARD = "VACCINATION_CARD",
  HEALTH_CARD = "HEALTH_CARD",
  INSURANCE = "INSURANCE",
  OTHER = "OTHER",
}

export enum ProcessingStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export interface Document {
  id: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  documentType: DocumentType | null;
  status: ProcessingStatus;
  ocrConfidence: number | null;
  createdAt: string;
}

// ─── Extraction Types ───
export interface ExtractionResult {
  diseases: ExtractedDisease[];
  medicines: ExtractedMedicine[];
  doctors: ExtractedDoctor[];
  hospitals: ExtractedHospital[];
  labValues: ExtractedLabValue[];
  dates: ExtractedDate[];
  procedures: ExtractedProcedure[];
  rawOcrText: string | null;
  aiSummary: string | null;
  confidence: number | null;
}

export interface ExtractedDisease {
  name: string;
  confidence: number;
  icdCode?: string;
  sourceText: string;
}

export interface ExtractedMedicine {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  route?: string;
  confidence: number;
  sourceText: string;
}

export interface ExtractedDoctor {
  name: string;
  specialization?: string;
  licenseNumber?: string;
  confidence: number;
  sourceText: string;
}

export interface ExtractedHospital {
  name: string;
  address?: string;
  department?: string;
  confidence: number;
}

export interface ExtractedLabValue {
  testName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  isAbnormal: boolean;
  date?: string;
  confidence: number;
}

export interface ExtractedDate {
  event: string;
  date: string;
  confidence: number;
}

export interface ExtractedProcedure {
  name: string;
  date?: string;
  doctor?: string;
  hospital?: string;
  confidence: number;
}

// ─── Timeline Types ───
export enum TimelineEventType {
  VISIT = "VISIT",
  DIAGNOSIS = "DIAGNOSIS",
  MEDICATION = "MEDICATION",
  LAB_TEST = "LAB_TEST",
  PROCEDURE = "PROCEDURE",
  IMAGING = "IMAGING",
  VACCINATION = "VACCINATION",
  ALLERGY = "ALLERGY",
  HOSPITALIZATION = "HOSPITALIZATION",
  SURGERY = "SURGERY",
  OTHER = "OTHER",
}

export interface TimelineEvent {
  id: string;
  eventType: TimelineEventType;
  eventDate: string;
  title: string;
  description: string | null;
  severity: string | null;
  facility: string | null;
  doctorName: string | null;
  source: string;
  documentId: string | null;
}

// ─── Medication Types ───
export interface Medication {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  reminders: MedicationReminder[];
}

export interface MedicationReminder {
  id: string;
  time: string;
  daysOfWeek: number[];
  isTaken: boolean;
}

// ─── Lab Result Types ───
export interface LabResult {
  id: string;
  testName: string;
  value: string;
  unit: string | null;
  referenceRange: string | null;
  isAbnormal: boolean;
  date: string;
  category: string | null;
}

// ─── Doctor Summary Types ───
export interface DoctorSummary {
  id: string;
  currentConditions: SummarySection[];
  currentMedicines: SummarySection[];
  allergies: SummarySection[];
  recentLabs: SummarySection[];
  recentImaging: SummarySection[];
  pastSurgeries: SummarySection[];
  vitalSigns: SummarySection[];
  immunizations: SummarySection[];
  generatedAt: string;
}

export interface SummarySection {
  text: string;
  sourceDocumentId: string;
  sourceUrl?: string;
  date?: string;
}

// ─── Family Types ───
export interface FamilyGroup {
  id: string;
  name: string;
  members: FamilyMember[];
}

export interface FamilyMember {
  id: string;
  userId: string;
  fullName: string;
  relation: string;
  permission: string;
  status: string;
}

// ─── Share Link Types ───
export interface ShareLink {
  id: string;
  token: string;
  title: string | null;
  accessLevel: string;
  expiresAt: string | null;
  currentAccessCount: number;
  maxAccessCount: number | null;
  qrCodeUrl: string | null;
  createdAt: string;
}

// ─── Search Types ───
export interface SearchResult {
  resourceType: string;
  resourceId: string;
  title: string;
  snippet: string;
  score: number;
}
