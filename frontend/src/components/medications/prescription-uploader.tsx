"use client";

import { useCallback, useState, useRef } from "react";
import { Upload, File, X, AlertCircle, Pill, Sun, Sunset, Moon, Sparkles, User, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PrescriptionUploaderProps {
  onUpload: (file: File, metadata: { documentType: string; doctorName?: string; targetSlot?: string }) => Promise<void>;
  isUploading: boolean;
  onCancel?: () => void;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const MAX_SIZE = 25 * 1024 * 1024; // 25MB

export function PrescriptionRxUploader({ onUpload, isUploading, onCancel }: PrescriptionUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doctorName, setDoctorName] = useState<string>("");
  const [targetSlot, setTargetSlot] = useState<string>("auto");
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Unsupported file type. Please upload a Prescription PDF, JPEG, PNG, or WebP photo.";
    }
    if (file.size > MAX_SIZE) {
      return "File is too large. Maximum size is 25MB.";
    }
    return null;
  };

  const handleFile = (file: File) => {
    setError(null);
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSelectedFile(file);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleUploadClick = async () => {
    if (!selectedFile) return;
    await onUpload(selectedFile, {
      documentType: "PRESCRIPTION",
      doctorName,
      targetSlot,
    });
    setSelectedFile(null);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="rounded-3xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-background to-teal-500/10 p-6 sm:p-8 shadow-xl space-y-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

      {/* Header info */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm shrink-0">
            <Pill className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
              <Sparkles className="h-3 w-3" /> Rx Regimen Digitizer Studio
            </div>
            <h3 className="text-lg font-bold text-foreground leading-tight">Prescription & Drug Order Ingestion</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload doctor prescriptions or pill bottle photos. AI extracts medicine names, dosages, and builds your daily regimen schedule.
            </p>
          </div>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Prescription Metadata Tagging */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-emerald-500" /> Prescribing Doctor / Clinic (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Dr. A. Sharma / Apollo Clinic..."
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
            disabled={isUploading}
            className="flex h-10 w-full rounded-xl border border-border/60 bg-background/90 px-3 py-2 text-xs font-medium focus-visible:outline-none focus-visible:border-emerald-500 focus-visible:ring-1 focus-visible:ring-emerald-500 shadow-sm transition-colors placeholder:text-muted-foreground"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Sun className="h-3.5 w-3.5 text-amber-500" /> Primary Regimen Slot
          </label>
          <select
            value={targetSlot}
            onChange={(e) => setTargetSlot(e.target.value)}
            disabled={isUploading}
            className="flex h-10 w-full rounded-xl border border-border/60 bg-background/90 px-3 py-2 text-xs font-medium focus-visible:outline-none focus-visible:border-emerald-500 focus-visible:ring-1 focus-visible:ring-emerald-500 shadow-sm transition-colors"
          >
            <option value="auto">✨ AI Auto-Detect from Rx Instructions</option>
            <option value="morning">🌅 Morning Schedule (8:00 AM)</option>
            <option value="afternoon">☀️ Afternoon Schedule (2:00 PM)</option>
            <option value="night">🌙 Night / Bedtime Schedule (8:00 PM)</option>
          </select>
        </div>
      </div>

      {/* Drop / Select Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isUploading && inputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-all cursor-pointer w-full group",
          dragActive
            ? "border-emerald-500 bg-emerald-500/10 scale-[1.01]"
            : "border-emerald-500/30 hover:border-emerald-500/60 bg-card/60 hover:bg-card/90 shadow-inner",
          error && "border-destructive bg-destructive/5",
          isUploading && "pointer-events-none opacity-80"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={handleChange}
          disabled={isUploading}
        />

        {!selectedFile ? (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform shadow-md border border-emerald-500/20">
              <Upload className="h-7 w-7" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">
              Drag & drop your prescription PDF or photo here
            </p>
            <p className="text-xs text-muted-foreground mb-4 max-w-sm">
              Our AI OCR engine recognizes handwritten and printed drug orders, exact mg dosages, frequency (1-0-1), and food instructions.
            </p>
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-6 h-9 font-semibold text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
            >
              Browse Prescription Files
            </Button>
            <p className="mt-3 text-[10px] text-muted-foreground font-semibold">
              Supported Formats: PDF, JPG, PNG, WebP • Max Size: 25MB
            </p>
          </div>
        ) : (
          <div className="w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-background/90 border border-emerald-500/30 shadow-md">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <File className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate text-foreground">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground font-medium">
                    {formatSize(selectedFile.size)} • Slot: <span className="text-emerald-600 dark:text-emerald-400 font-semibold uppercase">{targetSlot}</span>
                  </p>
                </div>
              </div>
              {!isUploading && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setError(null);
                  }}
                  className="rounded-full p-1.5 hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {isUploading ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3 text-center">
                <div className="flex items-center justify-center gap-3 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                  <span className="animate-spin text-lg">💊</span>
                  AI Rx Engine Parsing Drug Names, Dosages & Intake Schedules...
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 rounded-full animate-pulse w-3/4" />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Please keep this window open. Prescription digitization completes in ~3-5 seconds.
                </p>
              </div>
            ) : (
              <Button
                type="button"
                onClick={handleUploadClick}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 gap-2"
              >
                <Pill className="h-4 w-4" />
                Digitize Prescription & Add to Regimen
              </Button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2.5 rounded-xl bg-destructive/10 border border-destructive/20 p-3.5 text-xs font-semibold text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
