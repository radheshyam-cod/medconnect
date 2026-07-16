"use client";

import { useState, useRef, useCallback } from "react";
import { Play, Pause, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoicePlayerProps {
  audioUrl: string | undefined;
  onPlayStart?: () => void;
  onPlayEnd?: () => void;
  disabled?: boolean;
  className?: string;
}

export function VoicePlayer({
  audioUrl,
  onPlayStart,
  onPlayEnd,
  disabled = false,
  className,
}: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = useCallback(() => {
    if (!audioUrl || isPlaying) return;

    try {
      setIsLoading(true);
      onPlayStart?.();

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.oncanplaythrough = () => {
        setIsLoading(false);
        setIsPlaying(true);
        audio.play().catch(() => {
          setIsPlaying(false);
          setIsLoading(false);
        });
      };

      audio.onended = () => {
        setIsPlaying(false);
        onPlayEnd?.();
        audioRef.current = null;
      };

      audio.onerror = () => {
        setIsPlaying(false);
        setIsLoading(false);
        onPlayEnd?.();
        audioRef.current = null;
      };

      // If audio is already loaded
      if (audio.readyState >= 3) {
        setIsLoading(false);
        setIsPlaying(true);
        audio.play().catch(() => {
          setIsPlaying(false);
        });
      }

      audio.load();
    } catch {
      setIsPlaying(false);
      setIsLoading(false);
    }
  }, [audioUrl, isPlaying, onPlayStart, onPlayEnd]);

  const handleStop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
    onPlayEnd?.();
  }, [onPlayEnd]);

  const toggle = useCallback(() => {
    if (isPlaying) {
      handleStop();
    } else {
      handlePlay();
    }
  }, [isPlaying, handlePlay, handleStop]);

  if (!audioUrl) return null;

  return (
    <button
      onClick={toggle}
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center justify-center rounded-full p-2 transition-all duration-200",
        isPlaying
          ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
          : "bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
      aria-label={isPlaying ? "Stop playback" : "Play response audio"}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isPlaying ? (
        <Pause className="h-4 w-4 fill-current" />
      ) : (
        <Play className="h-4 w-4 fill-current" />
      )}
    </button>
  );
}
