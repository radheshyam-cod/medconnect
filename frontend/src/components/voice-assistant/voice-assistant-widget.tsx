"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Volume2,
  Send,
  X,
  Sparkles,
  Bot,
  User,
  ArrowRight,
  RefreshCw,
  ChevronDown,
  ShieldCheck,
  Check,
  Copy,
  Activity,
  FileText,
  Pill,
  HelpCircle,
  BarChart2,
  UploadCloud,
  Paperclip,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface MessageItem {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: Date;
  audioBase64?: string | null;
  action?: {
    type: string;
    navigationUrl?: string;
    payload?: any;
  };
}

const HINDI_QUICK_PROMPTS = [
  { icon: BarChart2, label: "मेरे हाल ही के ब्लड टेस्ट दिखाओ", query: "मेरे हाल ही के ब्लड टेस्ट दिखाओ" },
  { icon: Pill, label: "मेरी सक्रिय दवाइयां क्या हैं?", query: "मेरी सक्रिय दवाइयां क्या हैं?" },
  { icon: UploadCloud, label: "नई मेडिकल रिपोर्ट अपलोड करो", query: "नई मेडिकल रिपोर्ट अपलोड करो" },
  { icon: HelpCircle, label: "क्या मेरा ब्लड प्रेशर नॉर्मल है?", query: "क्या मेरा ब्लड प्रेशर नॉर्मल है?" },
];

const ENGLISH_QUICK_PROMPTS = [
  { icon: BarChart2, label: "Show my recent lab test reports", query: "Show my recent lab test reports" },
  { icon: Pill, label: "What active medications am I taking?", query: "What active medications am I taking?" },
  { icon: UploadCloud, label: "I want to upload a new prescription", query: "I want to upload a new prescription" },
  { icon: HelpCircle, label: "Explain my blood test health trends", query: "Explain my blood test health trends" },
];

export function VoiceAssistantWidget() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState<"hi-IN" | "en-IN">("hi-IN");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "नमस्ते! मैं Gnani.ai Voice Assistant हूँ। आप हिंदी या English में बोलकर या लिखकर अपने मेडिकल रिकॉर्ड्स खोज सकते हैं, रिपोर्ट अपलोड कर सकते हैं, या स्वास्थ्य से जुड़े सवाल पूछ सकते हैं।",
      timestamp: new Date(),
    },
  ]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const langMenuRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Speech recognition fallback ref
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing, isRecording, isUploadingDoc]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = language;

        recognition.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTextInput(currentTranscript);
        };

        recognition.onerror = (e: any) => {
          console.warn("Speech recognition error:", e.error);
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [language]);

  const toggleLanguage = (lang: "hi-IN" | "en-IN") => {
    setLanguage(lang);
    setShowLangMenu(false);
    if (lang === "en-IN" && messages[0].id === "welcome") {
      setMessages([
        {
          id: "welcome",
          sender: "assistant",
          text: "Hello! I am your Gnani.ai Voice Assistant. You can speak or type in English or Hindi to search your medical records, upload documents, or ask health related questions.",
          timestamp: new Date(),
        },
      ]);
    } else if (lang === "hi-IN" && messages[0].id === "welcome") {
      setMessages([
        {
          id: "welcome",
          sender: "assistant",
          text: "नमस्ते! मैं Gnani.ai Voice Assistant हूँ। आप हिंदी या English में बोलकर या लिखकर अपने मेडिकल रिकॉर्ड्स खोज सकते हैं, रिपोर्ट अपलोड कर सकते हैं, या स्वास्थ्य से जुड़े सवाल पूछ सकते हैं।",
          timestamp: new Date(),
        },
      ]);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
          stream.getTracks().forEach((track) => track.stop());

          if (audioBlob.size > 100) {
            await handleAudioSubmit(audioBlob);
          } else if (textInput.trim()) {
            await handleTextSubmitQuery(textInput.trim());
          }
        };

        mediaRecorder.start();
        setIsRecording(true);

        if (recognitionRef.current) {
          recognitionRef.current.lang = language;
          try {
            recognitionRef.current.start();
          } catch (e) {}
        }
      } catch (err) {
        console.error("Microphone access denied or failed", err);
        alert("कृपया माइक्रोफ़ोन की अनुमति दें (Please grant microphone permission to record audio).");
      }
    }
  };

  const handleAudioSubmit = async (audioBlob: Blob) => {
    setIsProcessing(true);
    const userMsgId = Date.now().toString();

    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: "user",
        text: textInput || (language === "hi-IN" ? "🎙️ बोल रहे हैं..." : "🎙️ Speaking..."),
        timestamp: new Date(),
      },
    ]);

    try {
      const res = await api.voice.interactAudio(audioBlob, language);
      updateConversationWithResponse(userMsgId, res.transcript || textInput || "Voice Input", res);
    } catch (err) {
      console.error("Audio processing failed, falling back to text if available", err);
      if (textInput.trim()) {
        await handleTextSubmitQuery(textInput.trim(), userMsgId);
      } else {
        setIsProcessing(false);
      }
    } finally {
      setIsProcessing(false);
      setTextInput("");
    }
  };

  const handleTextSubmitQuery = async (query: string, existingUserMsgId?: string) => {
    if (!query.trim()) return;

    setTextInput("");
    setIsProcessing(true);

    const userMsgId = existingUserMsgId || Date.now().toString();
    if (!existingUserMsgId) {
      setMessages((prev) => [
        ...prev,
        {
          id: userMsgId,
          sender: "user",
          text: query,
          timestamp: new Date(),
        },
      ]);
    }

    try {
      const res = await api.voice.interact({
        textCommand: query,
        languageCode: language,
      });
      updateConversationWithResponse(userMsgId, query, res);
    } catch (err) {
      console.error("Voice interaction API error", err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "assistant",
          text:
            language === "hi-IN"
              ? "माफ़ कीजिए, सर्वर से संपर्क करने में समस्या आई। कृपया पुनः प्रयास करें।"
              : "Sorry, I encountered an issue reaching the server. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChatDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDoc(true);
    const userMsgId = Date.now().toString();
    const assistantMsgId = (Date.now() + 1).toString();

    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: "user",
        text:
          language === "hi-IN"
            ? `📎 रिपोर्ट अपलोड: "${file.name}"`
            : `📎 Uploading report: "${file.name}"`,
        timestamp: new Date(),
      },
    ]);

    try {
      await api.documents.upload(file, {
        documentType: "Medical Report / Prescription",
      });

      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          sender: "assistant",
          text:
            language === "hi-IN"
              ? `✅ आपका दस्तावेज़ "${file.name}" सफलतापूर्वक अपलोड हो गया है और सुरक्षित रूप से सहेज लिया गया है। हमारा AI अब इस रिपोर्ट से महत्वपूर्ण जानकारी और स्वास्थ्य रुझान निकाल रहा है। आप इस रिपोर्ट के बारे में कोई भी सवाल पूछ सकते हैं या नीचे दिए गए बटन से सभी दस्तावेज़ देख सकते हैं।`
              : `✅ Your document "${file.name}" has been successfully uploaded and stored securely! Our AI is extracting clinical insights and lab trends from this report right now. Feel free to ask me questions about it or view your medical documents below.`,
          timestamp: new Date(),
          action: {
            type: "NAVIGATE_UPLOAD",
            navigationUrl: "/documents",
          },
        },
      ]);
    } catch (err) {
      console.error("Chat document upload failed", err);
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          sender: "assistant",
          text:
            language === "hi-IN"
              ? `❌ क्षमा करें, "${file.name}" अपलोड करने में कोई समस्या हुई। कृपया पुनः प्रयास करें।`
              : `❌ Sorry, failed to upload "${file.name}". Please check your connection and try again.`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleTextSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    handleTextSubmitQuery(textInput.trim());
  };

  const updateConversationWithResponse = (
    userMsgId: string,
    finalTranscript: string,
    res: {
      transcript: string;
      responseText: string;
      audioBase64?: string | null;
      action: { type: string; navigationUrl?: string; payload?: any };
    },
  ) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === userMsgId ? { ...msg, text: res.transcript || finalTranscript } : msg,
      ),
    );

    const assistantMsg: MessageItem = {
      id: (Date.now() + 1).toString(),
      sender: "assistant",
      text: res.responseText,
      timestamp: new Date(),
      audioBase64: res.audioBase64,
      action: res.action,
    };
    setMessages((prev) => [...prev, assistantMsg]);

    if (res.audioBase64) {
      playAudio(res.audioBase64);
    } else {
      fallbackTts(res.responseText);
    }
  };

  const playAudio = (base64String: string) => {
    try {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audio = new Audio(base64String);
      audioPlayerRef.current = audio;
      setIsPlayingAudio(true);
      audio.onended = () => setIsPlayingAudio(false);
      audio.play();
    } catch (e) {
      console.warn("Audio playback error", e);
      setIsPlayingAudio(false);
    }
  };

  const fallbackTts = (text: string) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleActionNavigate = (url?: string) => {
    if (url) {
      setIsOpen(false);
      router.push(url);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickPrompts = language === "hi-IN" ? HINDI_QUICK_PROMPTS : ENGLISH_QUICK_PROMPTS;

  return (
    <>
      {/* State-of-the-art Floating Action Orb */}
      <div className="fixed bottom-6 right-6 sm:right-8 z-50">
        <div className="relative group">
          {/* Animated Ambient Outer Glow */}
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#4A88FF] via-[#7C3AED] to-[#EC4899] opacity-75 blur-md group-hover:opacity-100 transition duration-500 animate-pulse" />

          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "relative flex items-center gap-3.5 rounded-full bg-gradient-to-r from-[#1E293B] via-[#0F172A] to-[#1E293B] p-1 pr-5 text-white shadow-2xl transition-all duration-300 border border-white/20 group-hover:scale-105",
              isOpen && "ring-4 ring-indigo-500/50 bg-[#0A0F2C]",
            )}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#4A88FF] via-[#5F52FF] to-[#8C3CFF] shadow-lg shadow-indigo-500/40 shrink-0">
              <Bot className="h-5 w-5 text-white animate-bounce" style={{ animationDuration: "3s" }} />
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-[#0A0F2C]" />
              </span>
            </div>
            <div className="flex flex-col text-left">
              <span className="font-bold text-[13.5px] leading-tight tracking-wide flex items-center gap-1 bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">
                Gnani.ai Voice <Sparkles className="h-3 w-3 text-amber-400 fill-amber-400 inline" />
              </span>
              <span className="text-[11px] text-slate-400 font-medium tracking-normal flex items-center gap-1.5">
                <span>{language === "hi-IN" ? "🇮🇳 हिंदी / Eng" : "🇬🇧 Eng / हिंदी"}</span>
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Ultra-Premium Glassmorphic Drawer / Modal with Rich Micro-Interactions */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-8 z-50 w-[94vw] sm:w-[460px] max-h-[86vh] flex flex-col rounded-[32px] bg-[#060B1E] text-white border border-[#1E2850] shadow-[0_30px_100px_-15px_rgba(0,0,0,0.98),0_0_80px_-20px_rgba(95,82,255,0.4)] overflow-hidden animate-in slide-in-from-bottom-6 zoom-in-95 duration-300">
          
          {/* Ambient Glowing Background Layer inside Modal */}
          <div className="absolute top-0 left-1/4 w-48 h-48 bg-[#4A88FF]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/3 right-0 w-56 h-56 bg-[#8C3CFF]/15 rounded-full blur-3xl pointer-events-none" />

          {/* 1. Header Bar with Sheen & Precision */}
          <div className="relative z-[100] flex items-center justify-between border-b border-[#141C38] pt-5 pb-4 px-6 bg-[#060B1E]/95 backdrop-blur-xl">
            <div className="flex items-center gap-3.5">
              {/* Premium App Icon */}
              <div className="relative flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-[#4A88FF] via-[#5F52FF] to-[#8C3CFF] font-bold text-white text-xl shadow-lg shadow-indigo-500/30 select-none tracking-tight border border-white/20">
                AI
                <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-[#060B1E]" title="Online - Vachana STT Ready">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                </span>
              </div>
              <div>
                <h3 className="font-bold text-[18px] text-white leading-tight flex items-center gap-1.5 tracking-tight">
                  Gnani.ai
                  <span className="text-[#FFC83D] text-[18px] leading-none drop-shadow-[0_0_8px_rgba(255,200,61,0.6)]">✦</span>
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[12.5px] text-[#8C98B8] font-normal">Voice Health Assistant</span>
                  <span className="inline-block h-1 w-1 rounded-full bg-indigo-400" />
                  <span className="text-[11px] text-indigo-400 font-semibold uppercase tracking-wider">v3 AI</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 relative z-[100]">
              {/* Language Switcher Dropdown */}
              <div className="relative" ref={langMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className="flex items-center gap-2 rounded-full border border-[#263568] bg-[#0C122C] hover:bg-[#151D42] hover:border-[#4A88FF]/50 px-3.5 h-10 text-xs sm:text-sm font-medium text-white shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <span>{language === "hi-IN" ? "🇮🇳 हिंदी" : "🇬🇧 Eng"}</span>
                  <ChevronDown className={cn("h-4 w-4 text-[#8C98B8] transition-transform duration-200", showLangMenu && "rotate-180")} />
                </button>

                {showLangMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-[#0C122C] border border-[#263568] p-2 shadow-[0_20px_50px_rgba(0,0,0,0.95)] z-[110] animate-in fade-in zoom-in-95 duration-150 backdrop-blur-2xl">
                    <button
                      type="button"
                      onClick={() => toggleLanguage("hi-IN")}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all text-left cursor-pointer",
                        language === "hi-IN" ? "bg-gradient-to-r from-[#5346F4] to-[#7B38F7] text-white shadow-md" : "text-[#8C98B8] hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <span className="text-base">🇮🇳</span>
                      <div className="flex flex-col">
                        <span>हिंदी (Hindi)</span>
                        <span className="text-[10px] opacity-75 font-normal">Aditi TTS • Vachana</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleLanguage("en-IN")}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all text-left mt-1 cursor-pointer",
                        language === "en-IN" ? "bg-gradient-to-r from-[#5346F4] to-[#7B38F7] text-white shadow-md" : "text-[#8C98B8] hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <span className="text-base">🇬🇧</span>
                      <div className="flex flex-col">
                        <span>English (India)</span>
                        <span className="text-[10px] opacity-75 font-normal">Karan TTS • Vachana</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="w-9 h-9 rounded-full bg-[#0C122C] border border-[#263568] hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400 flex items-center justify-center text-[#8C98B8] transition-all shrink-0 cursor-pointer"
                title="Close Assistant"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 2. Center Content Area with Live Equalizer & Interactive Chips */}
          <div className="relative z-0 flex-1 overflow-y-auto px-6 py-6 space-y-6 max-h-[460px] min-h-[350px]">
            
            {/* Top Greeting Banner */}
            <div className="pt-1 pb-1 text-center">
              <h2 className="text-[28px] sm:text-[32px] font-extrabold bg-gradient-to-r from-[#60A5FA] via-[#A855F7] to-[#EC4899] bg-clip-text text-transparent inline-flex items-center justify-center gap-2.5 mb-1 tracking-tight">
                <span>{language === "hi-IN" ? "नमस्ते!" : "Hello!"}</span>
                <span className="text-[28px] sm:text-[32px] not-italic leading-none animate-bounce" style={{ animationDuration: "2s" }}>👋</span>
              </h2>
              <p className="text-[#8C98B8] text-[15px] sm:text-[16px] font-normal mt-1">
                {language === "hi-IN" ? "मैं आपकी क्या मदद कर सकता हूँ?" : "How can I help you today?"}
              </p>
            </div>

            {/* Quick Prompt Chips (Suggested Clinical Voice Queries) when conversation is short */}
            {messages.length === 1 && !isRecording && !isProcessing && (
              <div className="space-y-2.5 pt-1 animate-in fade-in slide-in-from-bottom-3 duration-500">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#6C7A9C] px-1 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>{language === "hi-IN" ? "सुझाए गए सवाल (Quick Prompts)" : "Suggested Voice Questions"}</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {quickPrompts.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleTextSubmitQuery(item.query)}
                        className="group flex items-start gap-2.5 rounded-2xl bg-[#0C1330]/90 hover:bg-[#141E48] border border-[#1C2852] hover:border-indigo-500/50 p-3 text-left transition-all duration-200 shadow-sm hover:shadow-indigo-500/10 active:scale-[0.98]"
                      >
                        <div className="p-2 rounded-xl bg-[#1D295C] text-indigo-300 group-hover:bg-gradient-to-br group-hover:from-[#4A88FF] group-hover:to-[#8C3CFF] group-hover:text-white transition-all shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs sm:text-[13px] text-[#D4DCF1] group-hover:text-white font-medium leading-snug mt-0.5">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Conversation Messages Stack */}
            <div className="space-y-4">
              {messages.map((msg) => {
                if (msg.id === "welcome") {
                  return (
                    <div
                      key={msg.id}
                      className="rounded-[26px] bg-[#0C1330]/95 border border-[#1E2954] p-5 shadow-xl relative text-left overflow-hidden transition-all duration-300 group hover:border-[#3876FF]/40 flex items-start gap-3.5"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-500/10 to-transparent pointer-events-none rounded-tr-[26px]" />
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4A88FF] to-[#8C3CFF] flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-500/30">
                        <Sparkles className="h-5 w-5 text-white fill-white animate-spin" style={{ animationDuration: "12s" }} />
                      </div>
                      <p className="text-[#D4DCF1] text-[15px] sm:text-[16px] leading-[1.65] font-normal flex-1 pt-0.5">
                        {msg.text}
                      </p>
                    </div>
                  );
                }

                if (msg.sender === "user") {
                  return (
                    <div
                      key={msg.id}
                      className="flex items-start gap-3 ml-auto flex-row-reverse max-w-[90%] animate-in fade-in slide-in-from-bottom-2 duration-200"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#5346F4] to-[#7B38F7] text-white shadow-lg shadow-indigo-500/30 mt-0.5">
                        <User className="h-4.5 w-4.5" />
                      </div>
                      <div className="rounded-[24px] rounded-tr-sm px-5 py-3.5 bg-gradient-to-r from-[#5346F4] via-[#6366F1] to-[#7B38F7] text-white text-[15px] leading-[1.6] shadow-lg shadow-indigo-500/20 font-medium">
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className="flex items-start gap-3.5 mr-auto max-w-[92%] animate-in fade-in slide-in-from-bottom-2 duration-200"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4A88FF] to-[#8C3CFF] text-white shadow-lg shadow-indigo-500/30 mt-0.5">
                      <Sparkles className="h-4.5 w-4.5 fill-white" />
                    </div>

                    <div className="flex-1 rounded-[24px] rounded-tl-sm bg-[#0C1330] border border-[#1E2954] p-4.5 sm:p-5 text-[#D4DCF1] text-[15px] sm:text-[16px] leading-[1.65] shadow-xl transition-all group hover:border-[#3876FF]/30 space-y-3.5">
                      <p className="whitespace-pre-wrap font-normal">{msg.text}</p>

                      {/* Action Navigation Button embedded cleanly inside the AI response card */}
                      {msg.action?.navigationUrl && (
                        <div className="pt-0.5">
                          <button
                            onClick={() => handleActionNavigate(msg.action?.navigationUrl)}
                            className="inline-flex items-center justify-between gap-2.5 rounded-xl bg-gradient-to-r from-[#3876FF] to-[#5D4CFF] hover:from-[#2967F0] hover:to-[#4E3DEF] text-white font-semibold text-xs sm:text-[13px] px-4 py-2.5 shadow-md shadow-blue-500/25 transition-all group/btn cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              {msg.action.type === "SEARCH_RESULTS" && "🔍 View Matching Medical Records"}
                              {msg.action.type === "NAVIGATE_UPLOAD" && "📤 Open Document Dropzone Now"}
                              {msg.action.type === "NAVIGATE" && "🔗 Navigate to Screen"}
                              {msg.action.type === "HEALTH_QA" && "📋 Open Health Timeline"}
                            </span>
                            <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform shrink-0" />
                          </button>
                        </div>
                      )}

                      {/* Read Aloud & Copy Actions Footer */}
                      <div className="flex items-center justify-between border-t border-[#1C264C] pt-3 mt-3 text-xs text-[#8C98B8]">
                        <div className="flex items-center gap-1.5">
                          {msg.audioBase64 ? (
                            <button
                              onClick={() => playAudio(msg.audioBase64!)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 transition-colors font-medium cursor-pointer"
                              title="Play Timbre TTS"
                            >
                              <Volume2 className="h-3.5 w-3.5 text-indigo-400" />
                              <span>{isPlayingAudio ? "Speaking..." : "Listen"}</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => fallbackTts(msg.text)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-[#8C98B8] hover:text-white transition-colors font-medium cursor-pointer"
                              title="Speak Text"
                            >
                              <Volume2 className="h-3.5 w-3.5" />
                              <span>Read Aloud</span>
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => copyToClipboard(msg.text, msg.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-[#8C98B8] hover:text-white transition-colors font-medium cursor-pointer"
                          title="Copy response"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Live Audio Recording Waveform Visualizer */}
              {isRecording && (
                <div className="rounded-[24px] bg-[#10173A] border border-red-500/40 p-4 flex items-center justify-between gap-4 animate-in fade-in duration-200">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500" />
                    </span>
                    <span className="text-sm font-bold text-red-300">
                      {language === "hi-IN" ? "सुन रहे हैं (Listening in Hindi)..." : "Listening in English..."}
                    </span>
                  </div>
                  {/* Equalizer Wave Bars */}
                  <div className="flex items-center gap-1 h-6">
                    <span className="w-1.5 bg-red-400 rounded-full animate-pulse h-3" />
                    <span className="w-1.5 bg-red-500 rounded-full animate-pulse h-6" style={{ animationDelay: "100ms" }} />
                    <span className="w-1.5 bg-red-400 rounded-full animate-pulse h-4" style={{ animationDelay: "200ms" }} />
                    <span className="w-1.5 bg-red-500 rounded-full animate-pulse h-5" style={{ animationDelay: "300ms" }} />
                    <span className="w-1.5 bg-red-400 rounded-full animate-pulse h-3" style={{ animationDelay: "400ms" }} />
                  </div>
                </div>
              )}

              {/* AI Processing or Document Uploading Shimmer */}
              {(isProcessing || isUploadingDoc) && (
                <div className="flex items-center gap-3 text-xs font-medium text-indigo-300 animate-pulse pl-12 bg-indigo-500/10 py-2.5 px-4 rounded-2xl border border-indigo-500/20 w-fit">
                  <RefreshCw className="h-4 w-4 animate-spin text-indigo-400 shrink-0" />
                  <span>
                    {isUploadingDoc
                      ? language === "hi-IN"
                        ? "मेडिकल रिपोर्ट अपलोड की जा रही है और AI विश्लेषण चल रहा है..."
                        : "Uploading medical document and running clinical AI extraction..."
                      : language === "hi-IN"
                        ? "Gnani Vachana STT & Gemini 1.5 स्वास्थ्य रिकॉर्ड्स का विश्लेषण कर रहे हैं..."
                        : "Gnani Vachana STT & Gemini analyzing longitudinal health records..."}
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* 3. State-of-the-Art Bottom Controls Bar & Security Shield Footer */}
          <div className="relative z-10 px-6 pb-6 pt-3 bg-[#060B1E]/95 backdrop-blur-2xl border-t border-[#141C38] space-y-4">
            <form onSubmit={handleTextSubmitForm} className="rounded-full border border-[#223060] bg-[#090F28] p-1.5 flex items-center justify-between gap-2.5 shadow-2xl focus-within:ring-2 focus-within:ring-[#4A88FF]/50 focus-within:border-[#4A88FF] transition-all">
              
              {/* Big Circular Gradient Microphone Button */}
              <button
                type="button"
                onClick={toggleRecording}
                disabled={isProcessing || isUploadingDoc}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0 transition-all duration-300 shadow-lg relative group/mic",
                  isRecording
                    ? "bg-gradient-to-r from-red-500 to-pink-600 animate-bounce ring-4 ring-red-500/40"
                    : "bg-gradient-to-r from-[#5346F4] to-[#7B38F7] hover:from-[#4437E3] hover:to-[#6C29E6] shadow-indigo-500/30 hover:scale-105 active:scale-95"
                )}
                title={isRecording ? "Stop Recording & Submit" : "Click to Speak in Hindi / English"}
              >
                {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>

              {/* Vertical Divider */}
              <div className="h-6 w-px bg-[#263568] mx-0.5 shrink-0" />

              {/* Hidden File Input for Document Uploading */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleChatDocUpload}
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                className="hidden"
              />

              {/* Document Upload Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing || isUploadingDoc || isRecording}
                className="w-10 h-10 rounded-full bg-[#141D42] hover:bg-[#1E2A60] border border-[#2A3B72] flex items-center justify-center text-[#A6B4D8] hover:text-white shrink-0 transition-all hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer shadow-sm group/doc"
                title={
                  language === "hi-IN"
                    ? "मेडिकल रिपोर्ट या प्रिस्क्रिप्शन अपलोड करें (.pdf, .jpg)"
                    : "Upload Medical Report or Prescription (.pdf, .jpg)"
                }
              >
                {isUploadingDoc ? (
                  <RefreshCw className="h-4.5 w-4.5 animate-spin text-indigo-400" />
                ) : (
                  <Paperclip className="h-4.5 w-4.5 group-hover/doc:rotate-12 transition-transform" />
                )}
              </button>

              {/* Text Input Bar */}
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={
                  isUploadingDoc
                    ? language === "hi-IN"
                      ? "रिपोर्ट अपलोड हो रही है..."
                      : "Uploading document..."
                    : isRecording
                      ? language === "hi-IN"
                        ? "सुन रहे हैं... बोलिए..."
                        : "Listening... speak now..."
                      : language === "hi-IN"
                        ? "हिंदी या English में बोलें या लिखें..."
                        : "Speak or type in English or Hindi..."
                }
                disabled={isProcessing || isUploadingDoc}
                className="flex-1 bg-transparent border-0 text-[#D4DCF1] text-[15px] focus:outline-none placeholder:text-[#6C7A9C] px-1 font-normal"
              />

              {/* Big Circular Royal Blue Send Button */}
              <button
                type="submit"
                disabled={!textInput.trim() || isProcessing || isUploadingDoc}
                className="w-12 h-12 rounded-full bg-gradient-to-r from-[#3876FF] to-[#5D4CFF] hover:from-[#2967F0] hover:to-[#4E3DEF] text-white flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0 transition-transform hover:scale-105 active:scale-95 disabled:opacity-35 disabled:pointer-events-none"
                title="Send Voice or Text Command"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>

            {/* Security Shield Badge */}
            <div className="flex items-center justify-center gap-2 text-[#7C8BAE] text-[13px] font-medium pb-0.5 select-none">
              <ShieldCheck className="w-4 h-4 text-[#6853F5] shrink-0" />
              <span>
                {language === "hi-IN"
                  ? "आपकी जानकारी सुरक्षित और गोपनीय है"
                  : "Your information is secure and private"}
              </span>
            </div>
          </div>

        </div>
      )}
    </>
  );
}
