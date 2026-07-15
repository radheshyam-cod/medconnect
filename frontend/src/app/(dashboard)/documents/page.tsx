"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, Upload, Trash2, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function SecureThumbnail({ id, alt }: { id: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    api.documents.getDownloadUrl(id).then((res) => {
      if (res.url) setUrl(res.url);
    });
  }, [id]);

  if (!url) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} className="h-full w-full object-cover" />
  );
}

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => api.documents.list(),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.documents.upload(file, { documentType: "OTHER" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.documents.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      uploadMutation.mutate(file);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'FAILED': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'PROCESSING': return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">Manage your medical records and lab reports</p>
        </div>
        <div>
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept=".pdf,image/*"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
          <label htmlFor="file-upload">
            <Button asChild disabled={isUploading} className="cursor-pointer">
              <span>
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload Document
              </span>
            </Button>
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !documents || documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No documents yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Upload your medical records, prescriptions, or lab reports to have our AI analyze and extract your health data.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc: any) => (
            <Card key={doc.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="p-4 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                    {doc.fileType?.startsWith('image/') ? (
                      <SecureThumbnail id={doc.id} alt={doc.fileName} />
                    ) : (
                      <FileText className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" title={doc.fileName}>{doc.fileName}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(doc.fileSize / 1024 / 1024).toFixed(2)} MB • {doc.documentType || 'Document'}
                    </p>
                  </div>
                </div>
                <div className="bg-muted/30 px-4 py-3 text-xs border-t flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-medium">
                    {getStatusIcon(doc.status)}
                    <span className={
                      doc.status === 'COMPLETED' ? 'text-emerald-700' :
                      doc.status === 'FAILED' ? 'text-red-700' :
                      doc.status === 'PROCESSING' ? 'text-blue-700' :
                      'text-muted-foreground'
                    }>
                      {doc.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground" title={new Date(doc.createdAt).toLocaleString()}>
                      {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                    </span>
                    <button 
                      onClick={() => deleteMutation.mutate(doc.id)}
                      disabled={deleteMutation.isPending}
                      className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
