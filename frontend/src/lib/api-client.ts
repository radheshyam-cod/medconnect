const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

// ─── Auth Token Management ───

let _getClerkTokenFn: (() => Promise<string | null>) | null = null;

export function setTokenProvider(fn: () => Promise<string | null>) {
  _getClerkTokenFn = fn;
}

export async function getClerkToken(): Promise<string | null> {
  if (_getClerkTokenFn) return _getClerkTokenFn();
  return null;
}

// ─── Types ───

export interface DashboardStats {
  documentsThisMonth: number;
  totalDocuments: number;
  activeMedications: number;
  totalLabResults: number;
  upcomingRemindersToday: number;
  recentDocuments: Array<{
    id: string;
    fileName: string;
    documentType: string | null;
    status: string;
    createdAt: string;
  }>;
  recentLabResults: Array<{
    id: string;
    testName: string;
    value: string;
    unit: string | null;
    isAbnormal: boolean;
    date: string;
  }>;
}

export interface DocumentItem {
  id: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  publicUrl?: string;
  documentType?: string;
  documentDate?: string;
  status: string;
  ocrConfidence?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentDetail extends DocumentItem {
  extraction?: {
    id: string;
    rawText?: string;
    diseases?: any;
    medicines?: any;
    doctors?: any;
    hospitals?: any;
    confidence?: number;
    [key: string]: any;
  };
}

export interface TimelineEvent {
  id: string;
  userId: string;
  eventDate: string;
  endDate?: string;
  eventType: string;
  title: string;
  description?: string;
  severity?: string;
  facility?: string;
  doctorName?: string;
  source: string;
  documentId?: string;
  createdAt: string;
  diseases?: string[];
  medicines?: string[];
  procedureName?: string;
}

export interface TimelineSummary {
  totalEvents: number;
  byType: Record<string, number>;
  byMonth: Record<string, number>;
  recentEvents: TimelineEvent[];
}

export interface AITimelineSummary {
  summary: string;
  keyEvents: Array<{ date: string; title: string; type: string; significance: string }>;
  trends: string[];
  recommendations: string[];
  totalEventsInPeriod: number;
  periodStart: string;
  periodEnd: string;
}

export interface MedicationItem {
  id: string;
  name: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  instructions?: string;
  prescribedBy?: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LabItem {
  id: string;
  testName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  isAbnormal: boolean;
  category?: string;
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyGroup {
  id: string;
  name: string;
  ownerId: string;
  members: Array<{
    id: string;
    memberId: string;
    relation: string;
    status: string;
    permission: string;
    member: { fullName?: string; email: string };
  }>;
}

export interface ShareLink {
  id: string;
  token: string;
  title?: string;
  expiresAt: string;
  isRevoked: boolean;
  createdAt: string;
  sharedResources: Array<{ resourceType: string; resourceId: string }>;
  accessLogs?: Array<any>;
}

export interface DoctorSummary {
  id: string;
  currentConditions?: any;
  currentMedicines?: any;
  allergies?: any;
  recentLabs?: any;
  recentImaging?: any;
  pastSurgeries?: any;
  vitalSigns?: any;
  riskFactors?: any;
  recommendations?: any;
  aiNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  id: string;
  type: 'TIMELINE' | 'MEDICATION' | 'LAB_RESULT' | 'DOCUMENT';
  title: string;
  description?: string;
  date: string;
  metadata?: any;
}

// ─── Core Request Functions ───

const DEFAULT_TIMEOUT = 30_000; // 30 seconds
const UPLOAD_TIMEOUT = 120_000; // 2 minutes for uploads

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...init } = options;
  let url = `${API_BASE}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.set(key, String(value));
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const token = await getClerkToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const hasBody = init.body !== undefined && init.body !== null;
  if (hasBody && !(init.body instanceof FormData)) headers["Content-Type"] = "application/json";

  if (init.headers) Object.assign(headers, init.headers as Record<string, string>);

  // Add abort signal with timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const response = await fetch(url, { ...init, headers, signal: controller.signal });
    
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: "Request failed" }));
      let errorMessage = errorBody.message || errorBody.error || "Unknown error";
      if (Array.isArray(errorMessage)) errorMessage = errorMessage.join(", ");
      throw new ApiError(response.status, errorMessage);
    }

    if (response.status === 204) return undefined as T;

    const json = await response.json();
    // Backend wraps responses in { data: ... }
    return (json.data !== undefined ? json.data : json) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(408, "Request timed out");
    }
    throw new ApiError(0, (error as Error).message || "Network error");
  } finally {
    clearTimeout(timeout);
  }
}

async function uploadFile<T>(
  endpoint: string,
  file: File,
  metadata?: Record<string, string>,
): Promise<T> {
  const formData = new FormData();
  formData.append("file", file);
  if (metadata) {
    Object.entries(metadata).forEach(([key, value]) => {
      if (value) formData.append(key, value);
    });
  }

  const token = await getClerkToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Upload failed" }));
    throw new ApiError(response.status, error.message || "Upload failed");
  }

  const json = await response.json();
  return (json.data !== undefined ? json.data : json) as T;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── API Methods ───

export const documents = {
  list: (params?: { page?: number; limit?: number; documentType?: string; status?: string; search?: string }) =>
    request<{ documents: DocumentItem[]; total: number }>("/documents", { params: params as any }),

  get: (id: string) => request<DocumentDetail>(`/documents/${id}`),

  upload: (file: File, metadata?: { documentType?: string; documentDate?: string }) =>
    uploadFile<DocumentItem>("/documents/upload", file, metadata),

  update: (id: string, data: { documentType?: string; documentDate?: string; fileName?: string }) =>
    request<DocumentItem>(`/documents/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) => request<void>(`/documents/${id}`, { method: "DELETE" }),

  regenerate: (id: string) =>
    request<{ success: boolean; message: string }>(`/documents/${id}/regenerate`, { method: "POST" }),

  process: (id: string) =>
    request<{ success: boolean; message: string }>(`/documents/${id}/process`, { method: "POST" }),

  getDownloadUrl: (id: string) => request<{ url: string | null }>(`/documents/${id}/download`),
};

export const timeline = {
  list: (params?: { page?: number; limit?: number; eventType?: string; from?: string; to?: string; search?: string }) =>
    request<{ events: TimelineEvent[]; total: number }>("/timeline", { params: params as any }),

  get: (id: string) => request<TimelineEvent>(`/timeline/${id}`),

  getSummary: () => request<TimelineSummary>("/timeline/summary"),

  getAISummary: () => request<AITimelineSummary>("/timeline/ai-summary"),

  create: (data: {
    eventType: string;
    eventDate: string;
    title: string;
    description?: string;
    severity?: string;
    facility?: string;
    doctorName?: string;
    diseases?: string[];
    medicines?: string[];
    procedureName?: string;
  }) =>
    request<TimelineEvent>("/timeline", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  generate: (extractionIds: string[]) =>
    request<TimelineEvent[]>("/timeline/generate", {
      method: "POST",
      body: JSON.stringify({ extractionIds }),
    }),

  delete: (id: string) => request<void>(`/timeline/${id}`, { method: "DELETE" }),
};

export const summary = {
  getPatient: () => request<any>("/summary/patient"),
  getDoctor: () => request<DoctorSummary>("/summary/doctor"),
};

export const search = {
  query: (q: string) => request<SearchResult[]>("/search", { params: { q } }),
};

export const fhir = {
  export: async () => {
    const token = await getClerkToken();
    if (!token) throw new Error("Not authenticated");

    const res = await fetch(`${API_BASE}/fhir/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Failed to export FHIR data");

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "patient-fhir-export.json";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};

export const medications = {
  list: (params?: { isActive?: boolean }) =>
    request<MedicationItem[]>("/medications", { params: params as any }),

  get: (id: string) => request<MedicationItem>(`/medications/${id}`),

  create: (data: {
    name: string;
    dosage?: string;
    frequency?: string;
    route?: string;
    instructions?: string;
    prescribedBy?: string;
    isActive?: boolean;
    startDate?: string;
    endDate?: string;
  }) =>
    request<MedicationItem>("/medications", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<{
    name: string;
    dosage: string;
    frequency: string;
    route: string;
    instructions: string;
    prescribedBy: string;
    isActive: boolean;
    startDate: string;
    endDate: string;
  }>) =>
    request<MedicationItem>(`/medications/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) => request<void>(`/medications/${id}`, { method: "DELETE" }),
};

export const labs = {
  list: (params?: { page?: number; limit?: number }) =>
    request<{ results: LabItem[]; total: number }>("/labs", { params: params as any }),

  get: (id: string) => request<LabItem>(`/labs/${id}`),

  create: (data: {
    testName: string;
    value: string;
    unit?: string;
    referenceRange?: string;
    isAbnormal?: boolean;
    category?: string;
    date: string;
    notes?: string;
  }) =>
    request<LabItem>("/labs", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<{
    testName: string;
    value: string;
    unit: string;
    referenceRange: string;
    isAbnormal: boolean;
    category: string;
    date: string;
    notes: string;
  }>) =>
    request<LabItem>(`/labs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) => request<void>(`/labs/${id}`, { method: "DELETE" }),
};

export const family = {
  listGroups: () => request<{ owned: FamilyGroup[]; memberOf: any[] }>("/family/groups"),

  createGroup: (name: string) =>
    request<FamilyGroup>("/family/groups", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  inviteMember: (groupId: string, email: string, relation: string) =>
    request<any>(`/family/groups/${groupId}/invite`, {
      method: "POST",
      body: JSON.stringify({ email, relation }),
    }),

  respondToInvite: (groupId: string, action: "ACCEPT" | "REJECT") =>
    request<any>(`/family/groups/${groupId}/respond`, {
      method: "POST",
      body: JSON.stringify({ action }),
    }),
};

export const sharing = {
  listLinks: () => request<ShareLink[]>("/sharing/links"),
  
  createLink: (data: { title?: string; expiresInDays?: number; resources: { resourceType: string; resourceId: string }[] }) =>
    request<ShareLink>("/sharing/links", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  revokeLink: (id: string) => request<void>(`/sharing/links/${id}`, { method: "DELETE" }),
};

export const auth = {
  sync: (data: { email: string; firstName?: string; lastName?: string; phone?: string }) =>
    request<{ success: boolean; userId: string }>("/auth/sync", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const health = {
  check: () => request<{ status: string; timestamp: string; uptime: number; database: string }>("/health"),
};

export const dashboard = {
  getStats: () => request<DashboardStats>("/dashboard/stats"),
};

export const voice = {
  speechToText: async (audioBlob: Blob, languageCode = "en-IN") => {
    const formData = new FormData();
    formData.append("audio_file", audioBlob, "recording.wav");
    formData.append("language_code", languageCode);
    const token = await getClerkToken();
    const response = await fetch(`${API_BASE}/voice/speech-to-text`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token || ""}` },
      body: formData,
    });
    if (!response.ok) throw new Error("Speech recognition failed");
    const json = await response.json();
    return json.data as { transcript: string; requestId: string; latencyMs: number };
  },

  textToSpeech: async (text: string, voice = "Pranav", languageCode = "en-IN") => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = await getClerkToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const response = await fetch(`${API_BASE}/voice/text-to-speech`, {
      method: "POST",
      headers,
      body: JSON.stringify({ text, voice, language_code: languageCode }),
    });
    if (!response.ok) throw new Error("Speech synthesis failed");
    const json = await response.json();
    return json.data as { audioBase64: string; mimeType: string; durationMs: number };
  },

  chat: async (
    audioBlob: Blob,
    options?: { languageCode?: string; voice?: string; conversationId?: string; includeAudio?: boolean }
  ) => {
    const formData = new FormData();
    formData.append("audio_file", audioBlob, "question.wav");
    formData.append("language_code", options?.languageCode || "en-IN");
    formData.append("voice", options?.voice || "Pranav");
    if (options?.conversationId) formData.append("conversation_id", options.conversationId);
    if (options?.includeAudio !== undefined) formData.append("include_audio", String(options.includeAudio));

    const token = await getClerkToken();
    const response = await fetch(`${API_BASE}/voice/chat`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token || ""}` },
      body: formData,
    });
    if (!response.ok) throw new Error("Voice chat failed");
    const json = await response.json();
    return json.data as {
      text: string;
      answer: string;
      audioBase64?: string;
      audioMimeType?: string;
      conversationId: string;
      totalLatencyMs: number;
    };
  },
};

export const api = {
  dashboard,
  documents,
  timeline,
  summary,
  search,
  medications,
  labs,
  family,
  sharing,
  fhir,
  voice,
  health,
  auth,
};

export default api;
