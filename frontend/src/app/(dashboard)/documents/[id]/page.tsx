"use client";

import { useParams, useRouter } from "next/navigation";
import { useDocument, useDeleteDocument } from "@/hooks/use-documents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, ArrowLeft, Trash2, Download, FileText, AlertCircle } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";

function SecureImage({ id, alt, className }: { id: string; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    api.documents.getDownloadUrl(id).then((res) => {
      if (res.url) setUrl(res.url);
    });
  }, [id]);

  if (!url) {
    return <div className={`flex items-center justify-center bg-muted/30 ${className}`}><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} className={className} />
  );
}

function SecurePdfButton({ id, publicUrl }: { id: string, publicUrl: string }) {
  const [url, setUrl] = useState<string>(publicUrl);
  
  useEffect(() => {
    api.documents.getDownloadUrl(id).then((res) => {
      if (res.url) setUrl(res.url);
    });
  }, [id]);

  return (
    <Button variant="outline" asChild>
      <a href={url} target="_blank" rel="noopener noreferrer">
        Open PDF
      </a>
    </Button>
  );
}

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: document, isLoading, error } = useDocument(id);
  const deleteMutation = useDeleteDocument();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">Document not found</p>
        <p className="text-sm text-muted-foreground mb-4">
          This document may have been deleted or you don't have access.
        </p>
        <Button onClick={() => router.push("/documents")}>
          Back to Documents
        </Button>
      </div>
    );
  }

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this document?")) {
      await deleteMutation.mutateAsync(id);
      router.push("/documents");
    }
  };

  const handleDownload = async () => {
    try {
      const res = await api.documents.getDownloadUrl(id);
      if (res.url) {
        window.open(res.url, "_blank");
      }
    } catch (e) {
      console.error("Failed to download document", e);
    }
  };

  const statusVariant: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
    PENDING: "secondary",
    PROCESSING: "warning",
    COMPLETED: "success",
    FAILED: "destructive",
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/documents")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight truncate max-w-lg">
              {document.fileName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Uploaded {formatDateTime(document.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={statusVariant[document.status] || "secondary"}>
              {document.status}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Type</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {document.documentType
                ? document.documentType.replace(/_/g, " ")
                : "Not specified"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Size</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {document.fileSize
                ? `${(document.fileSize / (1024 * 1024)).toFixed(1)} MB`
                : "Unknown"}
            </p>
          </CardContent>
        </Card>
      </div>

      {document.fileType?.startsWith('image/') && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <SecureImage 
              id={document.id}
              alt={document.fileName} 
              className="w-full h-auto min-h-[300px] max-h-[600px] object-contain bg-muted/30" 
            />
          </CardContent>
        </Card>
      )}

      {document.fileType === 'application/pdf' && (
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="font-medium">PDF Document</p>
                <p className="text-sm text-muted-foreground">Preview not available in-app</p>
              </div>
            </div>
            <SecurePdfButton id={document.id} publicUrl={document.publicUrl || ''} />
          </CardContent>
        </Card>
      )}

      {document.extraction && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle>Extracted Information</CardTitle>
              <CardDescription>
                Data extracted via OCR with{" "}
                {document.ocrConfidence
                  ? `${(document.ocrConfidence * 100).toFixed(0)}% confidence`
                  : "pending confidence"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {document.extraction.diseases?.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Diseases & Conditions</h3>
                  <div className="flex flex-wrap gap-2">
                    {document.extraction.diseases.map((d: any, i: number) => (
                      <Badge key={i} variant="secondary">
                        {d.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {document.extraction.medicines?.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Medicines</h3>
                  <div className="space-y-2">
                    {document.extraction.medicines.map((m: any, i: number) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium">{m.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {[m.dosage, m.frequency, m.duration].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {document.extraction.labValues?.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Lab Values</h3>
                  <div className="space-y-2">
                    {document.extraction.labValues.map((l: any, i: number) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium">{l.testName}</p>
                          <p className="text-sm text-muted-foreground">{l.category}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-mono font-medium ${l.isAbnormal ? "text-destructive" : ""}`}>
                            {l.value} {l.unit}
                          </p>
                          {l.referenceRange && (
                            <p className="text-xs text-muted-foreground">
                              Range: {l.referenceRange}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {document.extraction.doctors?.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Doctors</h3>
                  <div className="flex flex-wrap gap-2">
                    {document.extraction.doctors.map((d: any, i: number) => (
                      <Badge key={i} variant="outline">
                        {d.name}
                        {d.specialization && ` (${d.specialization})`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
