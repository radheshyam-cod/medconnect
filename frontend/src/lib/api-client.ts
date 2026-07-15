const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

// ─── Auth Token Management ───

let _getClerkTokenFn: (() => Promise<string | null>) | null = null;

/**
 * Register a token provider (called from ClerkProvider setup).
 * This decouples the API client from Clerk's internal APIs.
 */
export function setTokenProvider(fn: () => Promise<string | null>) {
  _getClerkTokenFn = fn;
}

async function getClerkToken(): Promise<string | null> {
  if (_getClerkTokenFn) {
    const token = await _getClerkTokenFn();
    if (token) return token;
  }
  if (typeof window !== "undefined" && (window as any).Clerk?.session) {
    try {
      return await (window as any).Clerk.session.getToken();
    } catch (e) {
      console.warn("Direct Clerk token fetch failed:", e);
    }
  }
  return null;
}

// ─── Core Request Function ───

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...init } = options;

  let url = `${API_BASE}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  // Auto-attach auth token to every request
  const token = await getClerkToken();

  // Build headers: always include auth if available,
  // set JSON content-type by default for requests with a body,
  // and let the caller's headers override our defaults.
  const hasBody = init.body !== undefined && init.body !== null;
  const headers: Record<string, string> = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (hasBody && !(init.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // Merge caller-provided headers on top of defaults
  if (init.headers) {
    const callerHeaders = init.headers as Record<string, string>;
    Object.assign(headers, callerHeaders);
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: "Request failed" }));
    throw new ApiError(response.status, errorBody.message || errorBody.error || "Unknown error");
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  const json = await response.json();
  return json.data as T;
}

// ─── Upload Helper (bypasses request() for FormData) ───

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
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Upload failed" }));
    throw new ApiError(response.status, error.message || "Upload failed");
  }

  return response.json().then((r) => r.data as T);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── API Methods ───

export const documents = {
  list: (params?: { page?: number; limit?: number; documentType?: string }) =>
    request<any[]>("/documents", { params: params as any }),

  get: (id: string) => request<any>(`/documents/${id}`),

  upload: (file: File, metadata?: { documentType?: string; documentDate?: string }) =>
    uploadFile<any>("/documents/upload", file, metadata),

  delete: (id: string) =>
    request<void>(`/documents/${id}`, { method: "DELETE" }),

  getExtraction: (id: string) =>
    request<any>(`/documents/${id}/extraction`),

  getDownloadUrl: (id: string) =>
    request<{ url: string | null }>(`/documents/${id}/download`),
};

export const timeline = {
  list: (params?: { page?: number; limit?: number; eventType?: string; from?: string; to?: string }) =>
    request<any[]>("/timeline", { params: params as any }),

  getSummary: () => request<any>("/timeline/summary"),
  getAISummary: () =>
    request<{
      summary: string;
      keyEvents: Array<{
        date: string;
        title: string;
        type: string;
        significance: string;
      }>;
      trends: string[];
      recommendations: string[];
      totalEventsInPeriod: number;
      periodStart: string;
      periodEnd: string;
    }>("/timeline/ai-summary"),
};

export const summary = {
  getPatient: () => request<any>("/summary/patient"),
  getDoctor: () => request<any>("/summary/doctor"),
};

export const search = {
  query: (q: string) =>
    request<any[]>("/search", {
      method: "GET",
      params: { q },
    }),
};

export const fhir = {
  export: async () => {
    const token = await getClerkToken();
    if (!token) throw new Error("Not authenticated");

    const res = await fetch(`${API_BASE}/fhir/export`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error("Failed to export FHIR data");
    }

    // Download the file
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
    request<any[]>("/medications", { params: params as any }),
};

export const labs = {
  list: (params?: { page?: number; limit?: number }) =>
    request<any[]>("/labs", { params: params as any }),
};

export const family = {
  listGroups: () => request<any[]>("/family/groups"),
  inviteMember: (groupId: string, email: string, relation: string) =>
    request<any>(`/family/groups/${groupId}/invite`, {
      method: "POST",
      body: JSON.stringify({ email, relation }),
    }),
};

export const dashboard = {
  getStats: () =>
    request<{
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
    }>("/dashboard/stats"),
};

export const sharing = {
  listLinks: () => request<any[]>("/sharing/links"),
  createLink: (data: { title?: string; expiresInDays?: number; resources: { resourceType: string; resourceId: string }[] }) =>
    request<any>("/sharing/links", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  revokeLink: (id: string) =>
    request<void>(`/sharing/links/${id}`, { method: "DELETE" }),
};

export const voice = {
  interact: (data: { textCommand?: string; languageCode?: string; voiceName?: string }) =>
    request<{
      transcript: string;
      responseText: string;
      audioBase64?: string | null;
      action: {
        type: 'SEARCH_RESULTS' | 'NAVIGATE_UPLOAD' | 'HEALTH_QA' | 'NAVIGATE';
        navigationUrl?: string;
        payload?: Record<string, unknown> | unknown[] | null;
      };
    }>("/voice/interact", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  interactAudio: (file: Blob | File, languageCode: string = "hi-IN", voiceName?: string) => {
    const metadata: Record<string, string> = { languageCode };
    if (voiceName) metadata.voiceName = voiceName;
    return uploadFile<{
      transcript: string;
      responseText: string;
      audioBase64?: string | null;
      action: {
        type: 'SEARCH_RESULTS' | 'NAVIGATE_UPLOAD' | 'HEALTH_QA' | 'NAVIGATE';
        navigationUrl?: string;
        payload?: Record<string, unknown> | unknown[] | null;
      };
    }>("/voice/interact", file instanceof File ? file : new File([file], "voice.wav", { type: "audio/wav" }), metadata);
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
};

export default api;
