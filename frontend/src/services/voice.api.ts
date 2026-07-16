const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

let _getClerkTokenFn: (() => Promise<string | null>) | null = null;

export function setVoiceTokenProvider(fn: () => Promise<string | null>) {
  _getClerkTokenFn = fn;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = _getClerkTokenFn ? await _getClerkTokenFn() : null;
  return {
    Authorization: `Bearer ${token || ""}`,
  };
}

/**
 * Speech-to-Text: Upload audio and get transcribed text.
 */
export async function speechToText(
  audioBlob: Blob,
  languageCode: string = "en-IN",
): Promise<{ transcript: string; requestId: string; latencyMs: number }> {
  const formData = new FormData();
  formData.append("audio_file", audioBlob, "recording.wav");
  formData.append("language_code", languageCode);

  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/voice/speech-to-text`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Speech recognition failed" }));
    throw new Error(error.message || error.error || "Speech recognition failed");
  }

  const json = await response.json();
  return json.data as { transcript: string; requestId: string; latencyMs: number };
}

/**
 * Text-to-Speech: Send text and get back base64-encoded audio.
 */
export async function textToSpeech(
  text: string,
  voice: string = "Pranav",
  languageCode: string = "en-IN",
): Promise<{ audioBase64: string; mimeType: string; durationMs: number }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/voice/text-to-speech`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      voice,
      language_code: languageCode,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Speech synthesis failed" }));
    throw new Error(error.message || error.error || "Speech synthesis failed");
  }

  const json = await response.json();
  return json.data as { audioBase64: string; mimeType: string; durationMs: number };
}

/**
 * Voice Chat: Upload audio question, get AI answer + audio.
 */
export async function voiceChat(
  audioBlob: Blob,
  options?: {
    languageCode?: string;
    voice?: string;
    conversationId?: string;
    includeAudio?: boolean;
  },
): Promise<{
  text: string;
  answer: string;
  audioBase64?: string;
  audioMimeType?: string;
  conversationId: string;
  totalLatencyMs: number;
}> {
  const formData = new FormData();
  formData.append("audio_file", audioBlob, "question.wav");

  const lang = options?.languageCode || "en-IN";
  const voice = options?.voice || "Pranav";
  formData.append("language_code", lang);
  formData.append("voice", voice);

  if (options?.conversationId) {
    formData.append("conversation_id", options.conversationId);
  }
  if (options?.includeAudio !== undefined) {
    formData.append("include_audio", String(options.includeAudio));
  }

  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/voice/chat`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Voice chat failed" }));
    throw new Error(error.message || error.error || "Voice chat failed");
  }

  const json = await response.json();
  return json.data as {
    text: string;
    answer: string;
    audioBase64?: string;
    audioMimeType?: string;
    conversationId: string;
    totalLatencyMs: number;
  };
}

/**
 * Text Chat: Send text question, get AI answer + optionally audio.
 */
export async function textChat(
  text: string,
  options?: {
    languageCode?: string;
    voice?: string;
    conversationId?: string;
    includeAudio?: boolean;
  },
): Promise<{
  text: string;
  answer: string;
  audioBase64?: string;
  audioMimeType?: string;
  conversationId: string;
  totalLatencyMs: number;
}> {
  const headers = await getAuthHeaders();
  
  const body = {
    text,
    language_code: options?.languageCode || "en-IN",
    voice: options?.voice || "Pranav",
    conversation_id: options?.conversationId,
    include_audio: options?.includeAudio !== false ? "true" : "false",
  };

  const response = await fetch(`${API_BASE}/voice/text-chat`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Text chat failed" }));
    throw new Error(error.message || error.error || "Text chat failed");
  }

  const json = await response.json();
  return json.data as {
    text: string;
    answer: string;
    audioBase64?: string;
    audioMimeType?: string;
    conversationId: string;
    totalLatencyMs: number;
  };
}
