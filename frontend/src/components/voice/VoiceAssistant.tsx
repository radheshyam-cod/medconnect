"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  User,
  Sparkles,
  MessageSquare,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useVoice, VoiceMessage } from "@/hooks/useVoice";
import { VoiceRecorder, RecorderStatus } from "./VoiceRecorder";
import { VoicePlayer } from "./VoicePlayer";
import { cn } from "@/lib/utils";

interface VoiceAssistantProps {
  defaultOpen?: boolean;
  languageCode?: string;
  voice?: string;
  position?: "bottom-right" | "bottom-left";
}

export function VoiceAssistant({
  defaultOpen = false,
  languageCode = "en-IN",
  voice = "Pranav",
  position = "bottom-right",
}: VoiceAssistantProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [textInput, setTextInput] = useState("");

  const {
    status,
    isRecording,
    isProcessing,
    messages,
    error,
    audioLevel,
    hasRecorded,
    startRecording,
    stopRecording,
    sendAudio,
    sendText,
    playAudio,
    cancelRecording,
    clearMessages,
    speakText,
  } = useVoice({ languageCode, voice });

  // Determine recorder status using the explicit hasRecorded flag
  const recorderStatus: RecorderStatus =
    status === "recording"
      ? "recording"
      : status === "processing"
        ? "processing"
        : hasRecorded && !isRecording
          ? "recorded"
          : "idle";

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const positionClasses =
    position === "bottom-right" ? "right-4" : "left-4";

  return (
    <>
      {/* FAB button to toggle assistant */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          onClick={() => setIsOpen(true)}
          className={cn(
            "fixed bottom-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 transition-all hover:shadow-primary/40",
            positionClasses,
          )}
          aria-label="Open voice assistant"
        >
          <MessageSquare className="h-6 w-6" />
        </motion.button>
      )}

      {/* Assistant panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={cn(
              "fixed bottom-4 z-50 w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl border bg-background shadow-2xl",
              positionClasses,
            )}
            style={{ maxHeight: "calc(100vh - 2rem)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Health Voice Assistant</h3>
                  <p className="text-[10px] text-muted-foreground">
                    Ask about your health records
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={clearMessages}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                    aria-label="Clear conversation"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                  aria-label="Close"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              className="overflow-y-auto px-4 py-3 space-y-3"
              style={{ maxHeight: "400px" }}
            >
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium">How can I help you?</p>
                  <p className="mt-1 text-xs text-muted-foreground max-w-[250px]">
                    Tap the microphone and ask about your medications, lab results, or health timeline.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 justify-center">                      {[
                        { text: "What medicines am I taking?", lang: "en-IN" },
                        { text: "Show my recent lab results", lang: "en-IN" },
                        { text: "What happened in my last visit?", lang: "en-IN" },
                      ].map((suggestion) => (
                        <button
                          key={suggestion.text}
                          onClick={async () => {
                            await sendText(suggestion.text);
                          }}
                          className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[10px] text-primary transition-colors hover:bg-primary/10"
                        >
                          {suggestion.text}
                        </button>
                      ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <ChatBubble key={msg.id} message={msg} />
                  ))}
                  {(status === "processing" || status === "speaking") && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pl-10">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      {status === "processing" ? "Thinking..." : "Speaking..."}
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t p-4 space-y-3">
              {/* Voice recorder */}
              <div className="flex justify-center">
                <VoiceRecorder
                  status={recorderStatus}
                  audioLevel={audioLevel}
                  error={error}
                  disabled={isProcessing}
                  onStartRecording={startRecording}
                  onStopRecording={stopRecording}
                  onSend={sendAudio}
                  onCancel={cancelRecording}
                />
              </div>

              {/* Text input alternative */}
              <div className="flex items-center gap-2">
                <textarea
                  ref={inputRef}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Or type your question..."
                  className="flex min-h-[36px] w-full rounded-lg border border-input bg-transparent px-3 py-1.5 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (textInput.trim()) {
                        sendText(textInput.trim());
                        setTextInput("");
                      }
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (textInput.trim()) {
                      sendText(textInput.trim());
                      setTextInput("");
                    }
                  }}
                  disabled={!textInput.trim() || isProcessing}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 shrink-0"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Chat Bubble Component ───

function ChatBubble({ message }: { message: VoiceMessage }) {
  const isUser = message.role === "user";
  const [isSpeaking, setIsSpeaking] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn("flex gap-2", isUser ? "flex-row-reverse" : "flex-row")}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary/10" : "bg-muted",
        )}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5 text-primary" />
        ) : (
          <Bot className="h-3.5 w-3.5 text-foreground" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "flex flex-col gap-1 max-w-[80%]",
          isUser ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-3 py-2 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-muted text-foreground rounded-tl-sm",
          )}
        >
          {message.text}
        </div>

        {/* Audio playback for assistant responses */}
        {!isUser && message.audioUrl && (
          <div className="flex items-center gap-2 pl-1">
            <VoicePlayer
              audioUrl={message.audioUrl}
              onPlayStart={() => setIsSpeaking(true)}
              onPlayEnd={() => setIsSpeaking(false)}
              className="h-6 w-6"
            />
            {isSpeaking && (
              <div className="flex items-center gap-0.5">
                {[1, 2, 3].map((i) => (
                  <motion.span
                    key={i}
                    animate={{ height: [4, 12 + i * 3, 4] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.15,
                    }}
                    className="w-0.5 rounded-full bg-primary"
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
