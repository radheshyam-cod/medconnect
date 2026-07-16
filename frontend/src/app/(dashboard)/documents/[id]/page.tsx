"use client";

import { useParams, useRouter } from "next/navigation";
import { useDocument } from "@/hooks/use-documents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  ArrowLeft,
  Trash2,
  Download,
  FileText,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  FileSearch,
  Brain,
  Share2,
  Clock,
  RefreshCw,
  Eye,
  FileImage,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { useEffect, useState } from "react";
import { api, type DocumentDetail } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const { data: document, isLoading, error } = useDocument(id);

  const handleDelete = async () => {
    try {
      await api.documents.delete(id);
      toast.success("Document deleted");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      router.push("/documents");
    } catch {
      toast.error("Failed to delete document");
    }
  };

  const handleDownload = async () => {
    try {
      const res = await api.documents.getDownloadUrl(id);
      if (res.url) window.open(res.url, "_blank");
      else toast.error("Download URL not available");
    } catch {
      toast.error("Failed to get download link");
    }
  };

  const regenerateExtraction = async () => {
    toast.info("Extraction regeneration requested. This may take a moment.");
    // In a real app, this would call a backend endpoint to re-process
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Loading document...</p>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold">Document not found</h2>
        <p className="text-sm text-muted-foreground mb-6">This document may have been deleted or you don&apos;t have access.</p>
        <Button onClick={() => router.push("/documents")}>Back to Documents</Button>
      </div>
    );
  }

  const extraction = document.extraction;
  const isImage = document.fileType?.startsWith("image/");
  const isPdf = document.fileType === "application/pdf";
  const isCompleted = document.status === "COMPLETED";
  const isProcessing = document.status === "PROCESSING";

  // Parse extraction data
  const rawText = extraction?.rawText || "";
  const diseases = extraction?.diseases ? (Array.isArray(extraction.diseases) ? extraction.diseases : [extraction.diseases]) : [];
  const medicines = extraction?.medicines ? (Array.isArray(extraction.medicines) ? extraction.medicines : [extraction.medicines]) : [];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/documents")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{document.fileName}</h1>
              {isCompleted ? (
                <Badge variant="success" className="text-[10px]">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
                </Badge>
              ) : isProcessing ? (
                <Badge variant="warning" className="text-[10px]">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Processing
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px]">{document.status}</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Uploaded {formatDateTime(document.createdAt)}
              {document.fileSize && ` • ${(document.fileSize / 1024 / 1024).toFixed(1)} MB`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1.5" /> Download
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.info("Share coming soon")}>
            <Share2 className="h-4 w-4 mr-1.5" /> Share
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-1.5" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* File Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                Document Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center rounded-lg border bg-gradient-to-br from-muted/30 to-muted/10 min-h-[200px]">
                {isImage ? (
                  <SecureImage id={document.id} alt={document.fileName} />
                ) : (
                  <div className="flex flex-col items-center gap-3 p-8">
                    <FileText className="h-16 w-16 text-primary/30" />
                    <p className="text-sm text-muted-foreground">PDF Preview not available inline</p>
                    <Button variant="outline" size="sm" onClick={handleDownload}>
                      <Eye className="h-4 w-4 mr-1.5" /> Open PDF
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* OCR Text */}
          {rawText && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileSearch className="h-4 w-4 text-emerald-500" />
                  OCR Text
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-xs text-muted-foreground leading-relaxed font-mono bg-muted/50 rounded-lg p-4 max-h-[300px] overflow-y-auto">
                  {rawText}
                </pre>
                {document.ocrConfidence !== undefined && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Confidence:</span>
                    <div className="flex-1 max-w-[200px] h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${document.ocrConfidence}%` }}
                      />
                    </div>
                    <span className="tabular-nums">{document.ocrConfidence}%</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* AI Extraction */}
          {extraction && (
            <Card className="border-primary/10">
              <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  AI Extraction
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {/* Diseases */}
                {diseases.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Identified Conditions</p>
                    <div className="flex flex-wrap gap-1.5">
                      {diseases.map((d: any, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {typeof d === "string" ? d : d.name || d.condition || JSON.stringify(d)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Medicines */}
                {medicines.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Extracted Medicines</p>
                    <div className="flex flex-wrap gap-1.5">
                      {medicines.map((m: any, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {typeof m === "string" ? m : m.name || m.medicine || JSON.stringify(m)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Other extracted data */}
                {extraction.doctors && Array.isArray(extraction.doctors) && extraction.doctors.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Doctors</p>
                    <div className="flex flex-wrap gap-1.5">
                      {extraction.doctors.map((d: any, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">{typeof d === "string" ? d : d.name || JSON.stringify(d)}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {extraction.hospitals && Array.isArray(extraction.hospitals) && extraction.hospitals.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Hospitals</p>
                    <div className="flex flex-wrap gap-1.5">
                      {extraction.hospitals.map((h: any, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">{typeof h === "string" ? h : h.name || JSON.stringify(h)}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {extraction.confidence !== undefined && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Sparkles className="h-3 w-3 text-primary" />
                      <span>AI Confidence: {Math.round(extraction.confidence * 100)}%</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Processing state */}
          {!isCompleted && !isProcessing && document.status === "PENDING" && (
            <Card>
              <CardContent className="flex items-center gap-3 py-6">
                <Clock className="h-8 w-8 text-muted-foreground/50" />
                <div>
                  <p className="text-sm font-medium">Waiting for processing</p>
                  <p className="text-xs text-muted-foreground">The document is queued for OCR and extraction.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {isProcessing && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex items-center gap-3 py-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div>
                  <p className="text-sm font-medium">Processing your document...</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-xs text-muted-foreground">OCR in progress</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                    <span className="text-xs text-muted-foreground/50">Extraction queued</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Document Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">{document.documentType || "Document"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Format</span>
                <span className="font-medium">{document.fileType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Size</span>
                <span className="font-medium">{(document.fileSize / 1024 / 1024).toFixed(1)} MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={isCompleted ? "success" : isProcessing ? "warning" : "secondary"} className="text-[9px] h-4">
                  {document.status}
                </Badge>
              </div>
              {document.documentDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Document Date</span>
                  <span className="font-medium">{formatDateTime(document.documentDate)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" /> Download
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={regenerateExtraction}>
                <RefreshCw className="h-4 w-4 mr-2" /> Regenerate Extraction
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => toast.info("Timeline generation coming soon")}>
                <Sparkles className="h-4 w-4 mr-2" /> Generate Timeline
              </Button>
              <Button variant="destructive" size="sm" className="w-full justify-start" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" /> Delete Document
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Secure Image Component ───

function SecureImage({ id, alt }: { id: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    api.documents.getDownloadUrl(id).then((res) => {
      if (res.url) setUrl(res.url);
    });
  }, [id]);

  if (!url) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className="max-w-full max-h-[500px] object-contain rounded-lg" />;
}
