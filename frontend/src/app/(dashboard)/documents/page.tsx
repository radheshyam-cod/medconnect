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
  ChevronDown
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

const DOCUMENT_TYPE_FILTERS = [
  { value: "", label: "All Types" },
  { value: "PRESCRIPTION", label: "Prescriptions" },
  { value: "LAB_REPORT", label: "Lab Reports" },
  { value: "DISCHARGE_SUMMARY", label: "Discharge" },
  { value: "IMAGING", label: "Imaging" },
  { value: "OTHER", label: "Other" },
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
  const [showFilters, setShowFilters] = useState(false);

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

  const handleUpload = async (file: File) => {
    try {
      await uploadMutation.mutateAsync({ file });
      toast.success("Document uploaded successfully");
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
  const completedCount = documents.filter(d => d.status === "COMPLETED").length;
  const processingCount = documents.filter(d => d.status === "PROCESSING").length;
  const failedCount = documents.filter(d => d.status === "FAILED").length;

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground text-sm">
            Upload, manage and extract insights from your medical records
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="rounded-full font-semibold h-9 px-4 border-border/60 hover:bg-muted transition-colors"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-3.5 w-3.5 mr-2" />
            Filters
          </Button>
          <Button 
            className="rounded-full font-semibold h-9 px-5 bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 transition-all"
            onClick={() => setShowUpload(!showUpload)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Inline Uploader (toggled by button) */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="relative">
              <button 
                onClick={() => setShowUpload(false)} 
                className="absolute top-3 right-3 z-10 p-1 rounded-full bg-background/80 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              <DocumentUploader
                onUpload={handleUpload}
                isUploading={uploadMutation.isPending}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compact Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Documents */}
        <div className="surface-card rounded-2xl border border-border/50 p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total</p>
            <div className="text-xl font-black leading-tight">{total}</div>
            <p className="text-[9px] font-bold text-emerald-500">+12 this month</p>
          </div>
        </div>

        {/* Processing */}
        <div className="surface-card rounded-2xl border border-border/50 p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 shrink-0">
            <PieChart className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Processing</p>
            <div className="text-xl font-black leading-tight">{processingCount}</div>
            <button className="text-[9px] font-bold text-orange-500 hover:underline">View progress</button>
          </div>
        </div>

        {/* Extracted */}
        <div className="surface-card rounded-2xl border border-border/50 p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 shrink-0">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Extracted</p>
            <div className="text-xl font-black leading-tight">{completedCount}</div>
            <p className="text-[9px] font-bold text-emerald-500">90.7% success</p>
          </div>
        </div>

        {/* Failed */}
        <div className="surface-card rounded-2xl border border-border/50 p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 shrink-0">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Failed</p>
            <div className="text-xl font-black leading-tight">{failedCount}</div>
            <p className={`text-[9px] font-bold ${failedCount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
              {failedCount > 0 ? 'Needs attention' : 'All clear'}
            </p>
          </div>
        </div>
      </div>

      {/* Filter chips (Collapsible) */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider self-center mr-1">Type:</span>
                {DOCUMENT_TYPE_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors",
                      typeFilter === f.value ? "bg-primary text-primary-foreground" : "bg-muted/50 text-foreground hover:bg-muted"
                    )}
                    onClick={() => setTypeFilter(f.value)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider self-center mr-1">Status:</span>
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors",
                      statusFilter === f.value ? "bg-primary text-primary-foreground" : "bg-muted/50 text-foreground hover:bg-muted"
                    )}
                    onClick={() => setStatusFilter(f.value)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search + View Toggle */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <div className="relative flex-1 w-full max-w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documents..."
            className="flex h-11 w-full rounded-2xl border border-border/60 bg-transparent pl-11 pr-8 text-sm transition-colors focus-visible:outline-none focus-visible:border-primary placeholder:text-muted-foreground"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery ? (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 rounded-xl border border-border/60 p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={cn("rounded-lg p-2 transition-colors", viewMode === "grid" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn("rounded-lg p-2 transition-colors", viewMode === "list" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <button 
            className="flex items-center justify-between min-w-[120px] h-10 px-3 rounded-xl border border-border/60 bg-transparent hover:bg-muted/30 transition-colors text-xs font-bold"
            onClick={() => {
              const options: SortOption[] = ["newest", "oldest", "name", "size"];
              const idx = options.indexOf(sortBy);
              setSortBy(options[(idx + 1) % options.length]);
            }}
          >
            <span>{sortBy === 'newest' ? 'Newest First' : sortBy === 'oldest' ? 'Oldest First' : sortBy === 'name' ? 'By Name' : 'By Size'}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-2" />
          </button>
        </div>
      </div>

      {/* Document Grid/List */}
      {isLoading ? (
        <PageSkeleton type="documents" />
      ) : isError ? (
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-10 w-10 text-destructive mb-3" />
            <h3 className="font-semibold">Failed to load documents</h3>
            <p className="text-sm text-muted-foreground mt-1">Please try again later</p>
            <Button variant="outline" size="sm" className="mt-4 rounded-full" onClick={() => queryClient.invalidateQueries({ queryKey: ["documents"] })}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : sortedDocs.length === 0 ? (
        <Card className="rounded-2xl border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-primary/5">
              <FileText className="h-10 w-10 text-primary/60" />
            </div>
            <h3 className="text-lg font-bold">No Documents Found</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              You haven&apos;t uploaded any medical documents yet. Drag and drop your first file in the box above!
            </p>
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
