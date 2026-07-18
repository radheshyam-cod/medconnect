"use client";

import { motion } from "framer-motion";
import { FileText, FileImage, File, MoreHorizontal, Download, Trash2, Eye, CheckCircle2, Loader2, AlertCircle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";

interface DocumentCardProps {
  document: {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    documentType?: string;
    status: string;
    createdAt: string;
    ocrConfidence?: number;
  };
  viewMode?: "grid" | "list";
  onDelete?: (id: string) => void;
  onDownload?: (id: string) => void;
  isLoading?: boolean;
  className?: string;
}

const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  PENDING: { icon: Clock, color: "text-muted-foreground", bg: "bg-muted", label: "Pending" },
  PROCESSING: { icon: Loader2, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-950/50", label: "Processing" },
  OCR_COMPLETED: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-950/50", label: "OCR Done" },
  EXTRACTING: { icon: Loader2, color: "text-purple-500", bg: "bg-purple-100 dark:bg-purple-950/50", label: "Extracting" },
  COMPLETED: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-950/50", label: "Completed" },
  FAILED: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-100 dark:bg-red-950/50", label: "Failed" },
};

const fileIcon = (fileType: string) => {
  if (fileType.startsWith("image/")) return FileImage;
  if (fileType === "application/pdf") return FileText;
  return File;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentCard({
  document,
  viewMode = "grid",
  onDelete,
  onDownload,
  isLoading,
  className,
}: DocumentCardProps) {
  const [showActions, setShowActions] = useState(false);
  const status = statusConfig[document.status] || statusConfig.PENDING;
  const StatusIcon = status.icon;
  const FileIcon = fileIcon(document.fileType);

  if (isLoading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className={viewMode === "grid" ? "p-0" : "p-4"}>
          {viewMode === "grid" ? (
            <div className="p-4">
              <div className="skeleton h-24 w-full rounded-lg mb-3" />
              <div className="space-y-2">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="skeleton h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-1">
                <div className="skeleton h-4 w-1/3" />
                <div className="skeleton h-3 w-1/4" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const cardContent = (
    <div className={cn(
      "flex gap-3 w-full min-w-0 overflow-hidden",
      viewMode === "grid" ? "flex-col items-stretch" : "flex-row items-start"
    )}>
      {/* File icon */}
      <div className={cn(
        "flex items-center justify-center rounded-lg shrink-0",
        viewMode === "grid" ? "h-24 w-full" : "h-10 w-10",
        "bg-gradient-to-br from-primary/5 to-primary/10"
      )}>
        <FileIcon className={cn(
          viewMode === "grid" ? "h-10 w-10" : "h-5 w-5",
          "text-primary"
        )} />
      </div>

      {/* Content */}
      <div className={cn("flex-1 min-w-0 w-full overflow-hidden", viewMode === "grid" ? "px-1" : "")}>
        <div className="flex items-start justify-between gap-2 w-full min-w-0 overflow-hidden">
          <div className="min-w-0 flex-1 w-full overflow-hidden">
            <p
              className={cn("font-medium truncate overflow-hidden text-ellipsis whitespace-nowrap block w-full", viewMode === "grid" ? "text-sm" : "text-sm")}
              title={document.fileName}
            >
              {document.fileName}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate overflow-hidden text-ellipsis whitespace-nowrap block w-full">
              {formatFileSize(document.fileSize)}
              {document.documentType && ` • ${document.documentType}`}
            </p>
          </div>
        </div>

        {/* Status + Date */}
        <div className="flex items-center gap-2 mt-2">
          <div className={cn("flex items-center gap-1 rounded-full px-2 py-0.5", status.bg)}>
            <StatusIcon className={cn("h-3 w-3", document.status === "PROCESSING" ? "animate-spin" : "", status.color)} />
            <span className={cn("text-[10px] font-medium", status.color)}>{status.label}</span>
          </div>
          <span className="text-[10px] text-muted-foreground/60">
            {formatDate(document.createdAt)}
          </span>
        </div>

        {/* Progress / confidence bar */}
        {(document.ocrConfidence !== undefined || document.status === "COMPLETED" || document.status === "OCR_COMPLETED") && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-muted/60 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  document.status === "COMPLETED" || document.status === "OCR_COMPLETED" || (document.ocrConfidence && document.ocrConfidence >= 80)
                    ? "bg-emerald-500"
                    : document.ocrConfidence && document.ocrConfidence >= 60
                    ? "bg-amber-500"
                    : "bg-red-500"
                )}
                style={{
                  width:
                    document.status === "COMPLETED" || document.status === "OCR_COMPLETED"
                      ? "100%"
                      : `${document.ocrConfidence || 0}%`,
                }}
              />
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
              {document.ocrConfidence !== undefined && document.ocrConfidence !== null
                ? `${document.ocrConfidence}%`
                : document.status === "COMPLETED" || document.status === "OCR_COMPLETED"
                ? "100%"
                : "0%"}
            </span>
          </div>
        )}
      </div>

      {/* Actions menu (shown on hover) */}
      {viewMode === "grid" && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <div className="flex gap-1 bg-background/80 backdrop-blur-md rounded-lg p-0.5 shadow-sm border border-border/50">
            <div className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted cursor-pointer transition-colors">
              <Eye className="h-3.5 w-3.5 text-foreground" />
            </div>
            {onDownload && (
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted transition-colors rounded-md" onClick={(e) => { e.preventDefault(); onDownload(document.id); }}>
                <Download className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-colors rounded-md" onClick={(e) => { e.preventDefault(); onDelete(document.id); }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="group relative h-full"
    >
      {viewMode === "list" ? (
        <Link href={`/documents/${document.id}`} className="block h-full">
          <Card className={cn("overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/20 h-full", className)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 flex gap-3 w-full min-w-0 overflow-hidden items-start">
                  <div className="flex items-center justify-center rounded-lg h-10 w-10 shrink-0 bg-gradient-to-br from-primary/5 to-primary/10">
                    <FileIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 w-full overflow-hidden">
                    <div className="flex items-start justify-between gap-2 w-full min-w-0 overflow-hidden">
                      <div className="min-w-0 flex-1 w-full overflow-hidden">
                        <p className="font-medium truncate overflow-hidden text-ellipsis whitespace-nowrap block w-full text-sm">
                          {document.fileName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate overflow-hidden text-ellipsis whitespace-nowrap block w-full">
                          {formatFileSize(document.fileSize)}
                          {document.documentType && ` • ${document.documentType}`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {onDownload && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.preventDefault(); onDownload(document.id); }}>
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={(e) => { e.preventDefault(); onDelete(document.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ) : (
        <Link href={`/documents/${document.id}`} className="block h-full">
          <Card className={cn("overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-border/80 border-border/40 surface-card rounded-2xl h-full flex flex-col", className)}>
            <CardContent className="p-0 relative flex flex-col h-full">
              
              {/* Top Image Preview Area */}
              <div className="h-[140px] w-full bg-gradient-to-br from-muted/50 to-muted/80 relative flex items-center justify-center overflow-hidden border-b border-border/40 shrink-0 group-hover:from-primary/5 group-hover:to-primary/10 transition-colors">
                {/* Mockup Checkbox Top Left */}
                <div className="absolute top-3 left-3 w-4 h-4 rounded border border-foreground/20 bg-background shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.preventDefault()}>
                  {/* Empty checkbox */}
                </div>
                
                {/* Mockup ... Menu Top Right */}
                <div className="absolute top-3 right-3 w-6 h-6 rounded-md bg-background/50 backdrop-blur-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition-colors shadow-sm" onClick={(e) => e.preventDefault()}>
                  <MoreHorizontal className="h-4 w-4" />
                </div>

                <FileIcon className="h-16 w-16 text-muted-foreground/30 transition-transform duration-500 group-hover:scale-110 group-hover:text-primary/20" strokeWidth={1} />

                {/* Bottom Left Badge overlay on image */}
                <div className="absolute bottom-2 left-2 flex h-8 w-8 items-center justify-center rounded-lg bg-background/90 backdrop-blur shadow-sm border border-border/50">
                  <FileIcon className="h-4 w-4 text-primary" />
                </div>
              </div>

              {/* Content Area */}
              <div className="p-4 flex flex-col flex-1">
                <p className="font-bold text-sm truncate w-full text-foreground/90">
                  {document.fileName}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 truncate">
                  Uploaded {formatDate(document.createdAt).split(",")[0]} • {formatFileSize(document.fileSize)}
                </p>

                {/* Tag badges */}
                <div className="flex flex-wrap gap-1.5 mt-3 mb-4">
                  <span className="px-2 py-0.5 rounded-sm bg-muted/60 text-muted-foreground text-[9px] font-semibold border border-border/40">
                    {document.documentType ? document.documentType.replace("_", " ") : "Document"}
                  </span>
                  <span className="px-2 py-0.5 rounded-sm bg-muted/60 text-muted-foreground text-[9px] font-semibold border border-border/40">
                    {document.fileType.includes("image") ? "Image" : document.fileType.includes("pdf") ? "PDF" : "File"}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-sm bg-muted/60 text-muted-foreground text-[9px] font-semibold border border-border/40">
                    +1
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}
    </motion.div>
  );
}
