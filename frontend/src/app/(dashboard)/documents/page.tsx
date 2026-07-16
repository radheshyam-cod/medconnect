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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground text-sm">
            Manage your medical records and lab reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(showFilters && "border-primary")}
          >
            <Filter className="h-4 w-4 mr-1.5" />
            Filters
            {(typeFilter || statusFilter) && (
              <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-medium text-primary-foreground">
                1
              </span>
            )}
          </Button>
          <Button onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4 mr-1.5" />
            Upload
          </Button>
        </div>
      </div>

      {/* Upload Dialog */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">Upload Medical Document</h3>
                    <p className="text-sm text-muted-foreground">PDF, JPEG, PNG, WebP, TIFF (max 20MB)</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setShowUpload(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <DocumentUploader
                  onUpload={handleUpload}
                  isUploading={uploadMutation.isPending}
                />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats bar */}
      {!isLoading && documents.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{total} total</span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            {completedCount} completed
          </span>
          {processingCount > 0 && (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
              {processingCount} processing
            </span>
          )}
        </div>
      )}

      {/* Search + View Toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documents..."
            className="flex h-9 w-full rounded-lg border border-input bg-transparent pl-9 pr-8 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-0.5">
          <button
            onClick={() => setViewMode("grid")}
            className={cn("rounded-md p-1.5 transition-colors", viewMode === "grid" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn("rounded-md p-1.5 transition-colors", viewMode === "list" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => {
            const options: SortOption[] = ["newest", "oldest", "name", "size"];
            const idx = options.indexOf(sortBy);
            setSortBy(options[(idx + 1) % options.length]);
          }}>
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
          </Button>
        </div>
      </div>

      {/* Filter chips */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-wrap gap-4"
          >
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider self-center mr-1">Type:</span>
              {DOCUMENT_TYPE_FILTERS.map((f) => (
                <Badge
                  key={f.value}
                  variant={typeFilter === f.value ? "default" : "outline"}
                  className="cursor-pointer text-[10px]"
                  onClick={() => setTypeFilter(f.value)}
                >
                  {f.label}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider self-center mr-1">Status:</span>
              {STATUS_FILTERS.map((f) => (
                <Badge
                  key={f.value}
                  variant={statusFilter === f.value ? "default" : "outline"}
                  className="cursor-pointer text-[10px]"
                  onClick={() => setStatusFilter(f.value)}
                >
                  {f.label}
                </Badge>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Grid/List */}
      {isLoading ? (
        <PageSkeleton type="documents" />
      ) : isError ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-10 w-10 text-destructive mb-3" />
            <h3 className="font-semibold">Failed to load documents</h3>
            <p className="text-sm text-muted-foreground mt-1">Please try again later</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ["documents"] })}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : sortedDocs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-primary/5">
              <FileText className="h-8 w-8 text-primary/60" />
            </div>
            <h3 className="text-lg font-semibold">Upload First Medical Record</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Upload your prescriptions, lab reports, or medical documents. Our AI will analyze and organize them automatically.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant="outline">PDF</Badge>
              <Badge variant="outline">JPEG</Badge>
              <Badge variant="outline">PNG</Badge>
              <Badge variant="outline">WebP</Badge>
              <Badge variant="outline">TIFF</Badge>
            </div>
            <Button onClick={() => setShowUpload(true)} className="mt-6">
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className={cn(
          viewMode === "grid"
            ? "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : "space-y-2"
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
