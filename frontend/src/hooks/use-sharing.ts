import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useSharingLinks() {
  return useQuery({
    queryKey: ["sharing", "links"],
    queryFn: () => api.sharing.listLinks(),
  });
}

export function useCreateSharingLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof api.sharing.createLink>[0]) => api.sharing.createLink(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sharing", "links"] });
    },
  });
}

export function useRevokeSharingLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.sharing.revokeLink(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sharing", "links"] });
    },
  });
}
