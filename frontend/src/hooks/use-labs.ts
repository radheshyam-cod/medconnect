import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useLabs(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["labs", params],
    queryFn: () => api.labs.list(params),
  });
}

export function useLab(id: string) {
  return useQuery({
    queryKey: ["lab", id],
    queryFn: () => api.labs.get(id),
    enabled: !!id,
  });
}

export function useCreateLab() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof api.labs.create>[0]) => api.labs.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] });
    },
  });
}

export function useUpdateLab() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.labs.update>[1] }) =>
      api.labs.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["lab", id] });
      queryClient.invalidateQueries({ queryKey: ["labs"] });
    },
  });
}

export function useDeleteLab() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.labs.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] });
    },
  });
}
