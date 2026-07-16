"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Send, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type RecorderStatus = "idle" | "recording" | "recorded" | "processing" | "error";

interface VoiceRecorderProps {
  onStartRecording?: () => void;
  onStopRecording?: () => Promise<void> | void;
  onSend?: () => Promise<void> | void;
  onCancel?: () => void;
  status: RecorderStatus;
  audioLevel?: number; // 0-1
  disabled?: boolean;
  error?: string | null;
  maxDurationSeconds?: number;
}

export function VoiceRecorder({
  onStartRecording,
  onStopRecording,
  onSend,
  onCancel,
  status,
  audioLevel = 0,
  disabled = false,
  error = null,
  maxDurationSeconds = 60,
}: VoiceRecorderProps) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRecording = status === "recording";

  // Timer for recording duration
  useEffect(() => {
    if (isRecording) {
      setElapsed(0);
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev >= maxDurationSeconds) {
            // Auto-stop at max duration
            onStopRecording?.();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (status === "idle") setElapsed(0);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRecording, maxDurationSeconds, onStopRecording, status]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const circleVariants = {
    idle: { scale: 1 },
    recording: { scale: [1, 1.05, 1] as number[] },
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Recording circle */}
      <div className="relative flex items-center justify-center">
        {/* Pulsing ring when recording */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ scale: 1, opacity: 0.4 }}
              animate={{
                scale: 1 + audioLevel * 0.3,
                opacity: 0.4 - audioLevel * 0.3,
              }}
              exit={{ scale: 1, opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute inset-0 rounded-full bg-primary/30"
              style={{ width: 80, height: 80 }}
            />
          )}
        </AnimatePresence>

        <motion.button
          variants={circleVariants}
          animate={isRecording ? "recording" : "idle"}
          transition={{
            repeat: isRecording ? Infinity : 0,
            duration: 1.2,
            ease: "easeInOut",
          }}
          onClick={async () => {
            if (isRecording) {
              await onStopRecording?.();
            } else if (status === "idle") {
              onStartRecording?.();
            }
          }}
          disabled={disabled || status === "processing"}
          className={cn(
            "relative z-10 flex h-20 w-20 items-center justify-center rounded-full transition-all duration-200",
            isRecording
              ? "bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/30"
              : status === "recorded"
                ? "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30"
                : "bg-muted hover:bg-primary/20 hover:shadow-lg",
            disabled && "opacity-50 cursor-not-allowed",
          )}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
        >
          {status === "processing" ? (
            <Loader2 className="h-8 w-8 text-primary-foreground animate-spin" />
          ) : isRecording ? (
            <Square className="h-6 w-6 text-white fill-white" />
          ) : (
            <Mic
              className={cn(
                "h-8 w-8 transition-colors",
                status === "recorded" ? "text-primary-foreground" : "text-muted-foreground",
              )}
            />
          )}
        </motion.button>
      </div>

      {/* Timer / Status text */}
      <div className="text-center space-y-1">
        {isRecording ? (
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm font-mono tabular-nums text-muted-foreground">
              {formatTime(elapsed)} / {formatTime(maxDurationSeconds)}
            </span>
          </div>
        ) : status === "recorded" ? (
          <p className="text-sm text-muted-foreground">Recording ready</p>
        ) : status === "processing" ? (
          <p className="text-sm text-muted-foreground">Processing your request...</p>
        ) : (
          <p className="text-sm text-muted-foreground">Tap to record</p>
        )}

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-destructive max-w-[200px]"
          >
            {error}
          </motion.p>
        )}
      </div>

      {/* Action buttons (shown after recording) */}
      {status === "recorded" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <button
            onClick={onCancel}
            disabled={disabled}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Discard
          </button>
          <button
            onClick={onSend}
            disabled={disabled}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Send className="h-3.5 w-3.5" />
            Send
          </button>
        </motion.div>
      )}

      {/* Audio level visualization */}
      {isRecording && (
        <div className="flex items-center gap-0.5 h-6 w-20">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              animate={{
                height: `${Math.max(10, audioLevel * 40 + Math.random() * 10)}%`,
              }}
              transition={{ duration: 0.1, ease: "easeOut" }}
              className="w-1 rounded-full bg-primary"
              style={{
                opacity: 0.4 + audioLevel * 0.6,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
