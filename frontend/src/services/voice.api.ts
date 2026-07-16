import { getClerkToken } from "@/lib/api-client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

let _getClerkTokenFn: (() => Promise<string | null>) | null = null;

export function setVoiceTokenProvider(fn: () => Promise<string | null>) {
  _getClerkTokenFn = fn;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  let token = _getClerkTokenFn ? await _getClerkTokenFn() : null;
  if (!token) {
    token = await getClerkToken();
  }
  return {
    Authorization: `Bearer ${token || ""}`,
  };
}

async function ensureWavBlob(blob: Blob): Promise<Blob> {
  if (blob.type === "audio/wav" || blob.type === "audio/wave") {
    return blob;
  }
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return blob;
    const audioContext = new AudioCtx();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const wavBuffer = audioBufferToWav(audioBuffer);
    return new Blob([wavBuffer], { type: "audio/wav" });
  } catch (error) {
    console.warn("Could not convert audio blob to WAV in browser, sending original blob:", error);
    return blob;
  }
}

function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new ArrayBuffer(length);
  const view = new DataView(out);
  const channels: Float32Array[] = [];
  let pos = 0;

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 0;
  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return out;
}

/**
 * Speech-to-Text: Upload audio and get transcribed text.
 */
export async function speechToText(
  audioBlob: Blob,
  languageCode: string = "en-IN",
): Promise<{ transcript: string; requestId: string; latencyMs: number }> {
  const wavBlob = await ensureWavBlob(audioBlob);
  const formData = new FormData();
  formData.append("audio_file", wavBlob, "recording.wav");
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
  const wavBlob = await ensureWavBlob(audioBlob);
  const formData = new FormData();
  formData.append("audio_file", wavBlob, "question.wav");

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
