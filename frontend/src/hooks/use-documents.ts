"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useDocuments(params?: {
  page?: number;
  limit?: number;
  documentType?: string;
}) {
  return useQuery({
    queryKey: ["documents", params],
    queryFn: () => api.documents.list(params),
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: ["document", id],
    queryFn: () => api.documents.get(id),
    enabled: !!id,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => api.documents.upload(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.documents.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useDocumentExtraction(id: string) {
  return useQuery({
    queryKey: ["document-extraction", id],
    queryFn: () => api.documents.getExtraction(id),
    enabled: !!id,
  });
}
