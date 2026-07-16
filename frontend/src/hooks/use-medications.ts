import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useMedications(params?: { isActive?: boolean }) {
  return useQuery({
    queryKey: ["medications", params],
    queryFn: () => api.medications.list(params),
  });
}

export function useMedication(id: string) {
  return useQuery({
    queryKey: ["medication", id],
    queryFn: () => api.medications.get(id),
    enabled: !!id,
  });
}

export function useCreateMedication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof api.medications.create>[0]) => api.medications.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] });
    },
  });
}

export function useUpdateMedication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.medications.update>[1] }) =>
      api.medications.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["medication", id] });
      queryClient.invalidateQueries({ queryKey: ["medications"] });
    },
  });
}

export function useDeleteMedication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.medications.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] });
    },
  });
}
