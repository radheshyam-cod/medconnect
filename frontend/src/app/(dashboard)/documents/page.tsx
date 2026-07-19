"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Upload,
  FileText,
  Grid3X3,
  List,
  Search,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  ArrowUpDown,
  FileImage,
  File,
  Database,
  PieChart,
  FolderPlus,
  ChevronDown,
  Sparkles,
  Folder,
  Activity,
  Cpu,
  ShieldCheck,
  FolderOpen,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { DocumentCard } from "@/components/premium/document-card";
import { PageSkeleton } from "@/components/premium/page-skeleton";
import { DocumentUploader } from "@/components/documents/document-uploader";
import { useUploadDocument, useDeleteDocument } from "@/hooks/use-documents";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

type ViewMode = "grid" | "list";
type SortOption = "newest" | "oldest" | "name" | "size";

const VAULT_FOLDERS = [
  { id: "", label: "All Vault Files", icon: FolderOpen, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20", description: "Entire medical repository" },
  { id: "PRESCRIPTION", label: "Prescriptions Vault", icon: FileText, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", description: "Doctor Rx & drug orders" },
  { id: "LAB_REPORT", label: "Lab Reports Vault", icon: Activity, color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/20", description: "Blood, urine & biomarker tests" },
  { id: "DISCHARGE_SUMMARY", label: "Discharge Archives", icon: ShieldCheck, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20", description: "Hospitalization summaries" },
  { id: "IMAGING", label: "Imaging & Scans", icon: FileImage, color: "text-cyan-500", bg: "bg-cyan-500/10 border-cyan-500/20", description: "X-ray, MRI, CT & ultrasound" },
  { id: "OTHER", label: "Insurance & Other", icon: Folder, color: "text-slate-500", bg: "bg-slate-500/10 border-slate-500/20", description: "Claims, receipts & IDs" },
];

const STATUS_FILTERS = [
  { value: "", label: "All Status" },
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "COMPLETED", label: "Completed" },
  { value: "FAILED", label: "Failed" },
];

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showUpload, setShowUpload] = useState(false);

  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["documents", { documentType: typeFilter || undefined, status: statusFilter || undefined, search: searchQuery || undefined }],
    queryFn: () => api.documents.list({
      documentType: typeFilter || undefined,
      status: statusFilter || undefined,
      search: searchQuery || undefined,
      limit: 50,
    }),
    enabled: !showUpload, // Don't refetch while upload dialog is open
    refetchInterval: (query) => {
      const docs = (query.state.data as any)?.documents ?? [];
      const hasProcessing = docs.some((d: any) => ["PENDING", "PROCESSING", "EXTRACTING"].includes(d.status));
      return hasProcessing ? 3000 : false;
    },
  });

  const documents = data?.documents ?? [];
  const total = data?.total ?? 0;

  const handleUpload = async (file: File, metadata?: any) => {
    try {
      await uploadMutation.mutateAsync({ file, metadata });
      toast.success("Document uploaded successfully to AI Vault");
      setShowUpload(false);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Document deleted");
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const res = await api.documents.getDownloadUrl(id);
      if (res.url) window.open(res.url, "_blank");
    } catch {
      toast.error("Failed to get download link");
    }
  };

  // Sort documents
  const sortedDocs = [...documents].sort((a, b) => {
    switch (sortBy) {
      case "newest": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "oldest": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "name": return a.fileName.localeCompare(b.fileName);
      case "size": return b.fileSize - a.fileSize;
      default: return 0;
    }
  });

  // Stats for the page
  const completedCount = documents.filter(d => d.status === "COMPLETED" || d.status === "OCR_COMPLETED").length;
  const processingCount = documents.filter(d => ["PENDING", "PROCESSING", "EXTRACTING"].includes(d.status)).length;
  const failedCount = documents.filter(d => d.status === "FAILED").length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* AI Document Vault Header Studio */}
      {/* AI Document Vault Header Studio */}
      <div className="relative rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-background to-cyan-500/10 p-6 sm:p-8 shadow-sm">
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Cpu className="h-3.5 w-3.5 animate-pulse" />
              AI Multi-Engine OCR Vault
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Digital Health Vault</h1>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Securely archive all your clinical documents, prescriptions, and lab PDFs. Our AI pipeline automatically extracts text, classifies records, and maps biomarkers instantly.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button 
              className="rounded-full font-semibold h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white shadow-md gap-2"
              onClick={() => setShowUpload(!showUpload)}
            >
              <Upload className="h-4 w-4" />
              {showUpload ? "Close Upload Studio" : "Upload to AI Vault"}
            </Button>
          </div>
        </div>

        {/* Inline AI Uploader Studio */}
        <AnimatePresence>
          {showUpload && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden pt-6 mt-6 border-t border-border/50"
            >
              <div className="relative pt-2">
                <DocumentUploader
                  onUpload={handleUpload}
                  isUploading={uploadMutation.isPending}
                  onCancel={() => setShowUpload(false)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Vault Telemetry Status Bar */}
        <div className="relative z-10 mt-8 pt-6 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-background/80 backdrop-blur p-4 sm:p-5 border border-border/60 flex items-center justify-between gap-3 min-h-[88px]">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider block truncate">Vault Files</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-black text-foreground">{total}</span>
                <span className="text-[11px] text-muted-foreground font-semibold">records</span>
              </div>
            </div>
            <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <Database className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-2xl bg-background/80 backdrop-blur p-4 sm:p-5 border border-border/60 flex items-center justify-between gap-3 min-h-[88px]">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block truncate">AI OCR Extracted</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{completedCount}</span>
                <span className="text-[11px] text-emerald-600/80 font-semibold">ready</span>
              </div>
            </div>
            <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-2xl bg-background/80 backdrop-blur p-4 sm:p-5 border border-border/60 flex items-center justify-between gap-3 min-h-[88px]">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider block truncate">AI Processing</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-black text-foreground">{processingCount}</span>
                <span className="text-[11px] text-muted-foreground font-semibold">pipeline</span>
              </div>
            </div>
            <div className="h-11 w-11 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
              <Loader2 className={cn("h-5 w-5", processingCount > 0 && "animate-spin")} />
            </div>
          </div>

          <div className="rounded-2xl bg-background/80 backdrop-blur p-4 sm:p-5 border border-border/60 flex items-center justify-between gap-3 min-h-[88px]">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-extrabold text-red-600 dark:text-red-400 uppercase tracking-wider block truncate">OCR Issues</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className={cn("text-xl font-black", failedCount > 0 ? "text-red-500" : "text-foreground")}>{failedCount}</span>
                <span className="text-[11px] text-muted-foreground font-semibold">failed</span>
              </div>
            </div>
            <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0", failedCount > 0 ? "bg-red-500/10 text-red-500" : "bg-slate-500/10 text-slate-500")}>
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Vault Folders (Category Boxes) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <FolderPlus className="h-4 w-4 text-blue-500" /> Medical Vault Folders
          </h3>
          {(typeFilter || statusFilter || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-semibold text-blue-500 h-7 px-2"
              onClick={() => { setTypeFilter(""); setStatusFilter(""); setSearchQuery(""); }}
            >
              Reset Vault Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {VAULT_FOLDERS.map((folder) => {
            const Icon = folder.icon;
            const isSelected = typeFilter === folder.id;
            const folderCount = folder.id === "" ? documents.length : documents.filter(d => d.documentType === folder.id).length;

            return (
              <button
                key={folder.id}
                onClick={() => setTypeFilter(folder.id)}
                className={cn(
                  "flex flex-col items-start justify-between p-4 rounded-2xl border text-left transition-all duration-200 group relative overflow-hidden",
                  isSelected
                    ? "border-blue-500 bg-blue-600 text-white shadow-md scale-[1.02]"
                    : cn("hover:border-blue-500/40 bg-card/60 backdrop-blur", folder.bg)
                )}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110",
                    isSelected ? "bg-white/20 text-white" : cn("bg-background/90 shadow-sm", folder.color)
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge className={cn(
                    "text-[10px] font-extrabold rounded-full px-2 py-0.5",
                    isSelected ? "bg-white/20 text-white border-transparent" : "bg-muted text-foreground border-border/60"
                  )} variant="outline">
                    {folderCount}
                  </Badge>
                </div>

                <div className="w-full">
                  <span className="text-sm font-bold block truncate">{folder.label}</span>
                  <span className={cn(
                    "text-[10px] font-medium mt-0.5 block truncate",
                    isSelected ? "text-white/80" : "text-muted-foreground"
                  )}>
                    {folder.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Toolbar & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-2xl bg-card/60 backdrop-blur border border-border/50 p-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search file name or OCR text inside vault..."
              className="flex h-10 w-full rounded-xl border border-border/60 bg-background/80 pl-10 pr-8 text-sm focus-visible:outline-none focus-visible:border-primary placeholder:text-muted-foreground shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearchQuery("")}>
                ×
              </button>
            )}
          </div>

          {/* Status Filter Dropdown Pill */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {STATUS_FILTERS.slice(1).map((sf) => (
              <button
                key={sf.value}
                onClick={() => setStatusFilter(statusFilter === sf.value ? "" : sf.value)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border",
                  statusFilter === sf.value
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-background/80 text-muted-foreground hover:text-foreground border-border/60"
                )}
              >
                {sf.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 justify-end shrink-0">
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/40">
            <button
              onClick={() => setViewMode("grid")}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5", viewMode === "grid" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              <Grid3X3 className="h-3.5 w-3.5" /> Vault Cards
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5", viewMode === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              <List className="h-3.5 w-3.5" /> Audit List
            </button>
          </div>

          <button 
            className="flex items-center justify-between min-w-[130px] h-10 px-3.5 rounded-xl border border-border/60 bg-background/80 hover:bg-muted/30 transition-colors text-xs font-bold"
            onClick={() => {
              const options: SortOption[] = ["newest", "oldest", "name", "size"];
              const idx = options.indexOf(sortBy);
              setSortBy(options[(idx + 1) % options.length]);
            }}
          >
            <span className="flex items-center gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 text-blue-500" />
              {sortBy === 'newest' ? 'Newest First' : sortBy === 'oldest' ? 'Oldest First' : sortBy === 'name' ? 'By Name' : 'By Size'}
            </span>
          </button>
        </div>
      </div>

      {/* Document Grid/List */}
      {isLoading ? (
        <PageSkeleton type="documents" />
      ) : isError ? (
        <Card className="rounded-3xl border-destructive/20">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-3" />
            <h3 className="font-bold text-lg">Failed to load vault documents</h3>
            <p className="text-sm text-muted-foreground mt-1">Please check your connection and try again</p>
            <Button variant="outline" size="sm" className="mt-6 rounded-full px-6 font-semibold" onClick={() => queryClient.invalidateQueries({ queryKey: ["documents"] })}>
              Retry Loading Vault
            </Button>
          </CardContent>
        </Card>
      ) : sortedDocs.length === 0 ? (
        <Card className="rounded-3xl border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500/10 to-blue-500/5">
              <FolderOpen className="h-10 w-10 text-blue-500/60" />
            </div>
            <h3 className="text-xl font-bold">No Records Found in this Vault Folder</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">
              {typeFilter || statusFilter || searchQuery
                ? "No files match your current filter selection. Try selecting 'All Vault Files' above."
                : "Your Digital Vault is ready! Upload your medical records and let AI organize them automatically."}
            </p>
            <Button 
              className="mt-8 rounded-full px-6 font-semibold shadow-md bg-blue-600 hover:bg-blue-700 text-white" 
              onClick={() => { setShowUpload(true); setTypeFilter(""); setStatusFilter(""); setSearchQuery(""); }}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload First Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className={cn(
          viewMode === "grid"
            ? "grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
            : "space-y-3"
        )}>
          {sortedDocs.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              viewMode={viewMode}
              onDelete={handleDelete}
              onDownload={handleDownload}
            />
          ))}
        </div>
      )}
    </div>
  );
}

