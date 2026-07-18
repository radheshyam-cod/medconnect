"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type DocumentItem, type DocumentDetail } from "@/lib/api-client";

export function useDocuments(params?: {
  page?: number;
  limit?: number;
  documentType?: string;
  status?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["documents", params],
    queryFn: () => api.documents.list(params),
  });
}

export function useDocument(id: string) {
  return useQuery<DocumentDetail>({
    queryKey: ["document", id],
    queryFn: () => api.documents.get(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ["PENDING", "PROCESSING", "EXTRACTING"].includes(status) ? 2000 : false;
    },
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { file: File; metadata?: { documentType?: string; documentDate?: string } }) =>
      api.documents.upload(params.file, params.metadata),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.documents.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}
