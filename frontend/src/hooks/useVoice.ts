"use client";

import { useState, useRef, useCallback } from "react";
import { voiceChat, speechToText, textToSpeech } from "@/services/voice.api";

// ─── Types ───

export type VoiceStatus =
  | "idle"
  | "recording"
  | "recorded"
  | "processing"
  | "speaking"
  | "error";

export interface VoiceMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  audioUrl?: string;
  timestamp: number;
}

export interface VoiceState {
  status: VoiceStatus;
  isRecording: boolean;
  isProcessing: boolean;
  messages: VoiceMessage[];
  error: string | null;
  conversationId: string | null;
  audioLevel: number;
  hasRecorded: boolean;
}

export interface VoiceActions {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  sendAudio: () => Promise<void>;
  playAudio: (audioBase64: string, mimeType: string) => Promise<void>;
  cancelRecording: () => void;
  clearMessages: () => void;
  speakText: (text: string, languageCode?: string) => Promise<void>;
}

const SAMPLE_RATE = 16000;

// ─── Hook ───

export function useVoice(options?: {
  languageCode?: string;
  voice?: string;
}): VoiceState & VoiceActions {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasRecorded, setHasRecorded] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioBlobRef = useRef<Blob | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const languageCode = options?.languageCode || "en-IN";
  const voice = options?.voice || "Pranav";

  const cleanupRecorder = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current?.state !== "closed") {
      audioContextRef.current?.close().catch(() => {});
    }
    audioContextRef.current = null;
    analyserRef.current = null;
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setAudioLevel(0);
  }, []);

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(data);
    const max = Math.max(...data);
    const level = (max - 128) / 128;
    setAudioLevel(Math.max(0, Math.min(1, level)));
    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setHasRecorded(false);
      setStatus("recording");
      setIsRecording(true);
      audioChunksRef.current = [];
      audioBlobRef.current = null;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      audioContextRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      updateAudioLevel();

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        cleanupRecorder();

        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        audioBlobRef.current = blob;
        setHasRecorded(true);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone access denied."
          : "Failed to start recording.";
      setError(message);
      setStatus("error");
      setIsRecording(false);
      cleanupRecorder();
    }
  }, [cleanupRecorder, updateAudioLevel]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setStatus("recorded");
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    audioBlobRef.current = null;
    audioChunksRef.current = [];
    setIsRecording(false);
    setHasRecorded(false);
    setStatus("idle");
    cleanupRecorder();
  }, [cleanupRecorder]);

  const sendAudio = useCallback(async () => {
    const blob = audioBlobRef.current;
    if (!blob || blob.size === 0) {
      setError("No audio recorded. Please record your question first.");
      return;
    }

    try {
      setError(null);
      setStatus("processing");
      setIsProcessing(true);

      const result = await voiceChat(blob, {
        languageCode,
        voice,
        conversationId: conversationId || undefined,
        includeAudio: true,
      });

      const userMsg: VoiceMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        text: result.text,
        timestamp: Date.now(),
      };

      const assistantMsg: VoiceMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        text: result.answer,
        audioUrl: result.audioBase64
          ? `data:${result.audioMimeType || "audio/wav"};base64,${result.audioBase64}`
          : undefined,
        timestamp: Date.now() + 1,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setConversationId(result.conversationId);

      if (result.audioBase64) {
        await playAudioFromBase64(result.audioBase64, result.audioMimeType || "audio/wav");
      }

      audioBlobRef.current = null;
      audioChunksRef.current = [];
      setHasRecorded(false);
      setStatus("idle");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Voice chat failed.";
      setError(message);
      setStatus("error");
    } finally {
      setIsProcessing(false);
    }
  }, [conversationId, languageCode, voice]);

  const playAudioFromBase64 = useCallback(
    (base64: string, mimeType: string): Promise<void> => {
      return new Promise((resolve) => {
        try {
          const audioUrl = `data:${mimeType};base64,${base64}`;
          const audio = new Audio(audioUrl);
          setStatus("speaking");

          audio.onended = () => {
            setStatus("idle");
            resolve();
          };
          audio.onerror = () => {
            setStatus("idle");
            resolve();
          };
          audio.play().catch(() => {
            setStatus("idle");
            resolve();
          });
        } catch {
          setStatus("idle");
          resolve();
        }
      });
    },
    [],
  );

  const playAudio = useCallback(
    async (audioBase64: string, mimeType: string) => {
      await playAudioFromBase64(audioBase64, mimeType);
    },
    [playAudioFromBase64],
  );

  const speakText = useCallback(
    async (text: string, lang?: string) => {
      try {
        setStatus("processing");
        const result = await textToSpeech(text, voice, lang || languageCode);
        await playAudioFromBase64(result.audioBase64, result.mimeType);
      } catch {
        // Fallback to browser TTS
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang || languageCode;
        utterance.rate = 0.9;
        setStatus("speaking");
        utterance.onend = () => setStatus("idle");
        utterance.onerror = () => setStatus("idle");
        window.speechSynthesis.speak(utterance);
      }
    },
    [voice, languageCode, playAudioFromBase64],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
  }, []);

  return {
    status,
    isRecording,
    isProcessing,
    messages,
    error,
    conversationId,
    audioLevel,
    hasRecorded,
    startRecording,
    stopRecording,
    sendAudio,
    playAudio,
    cancelRecording,
    clearMessages,
    speakText,
  };
}
