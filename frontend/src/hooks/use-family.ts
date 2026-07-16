import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useFamilyGroups() {
  return useQuery({
    queryKey: ["family", "groups"],
    queryFn: () => api.family.listGroups(),
  });
}

export function useCreateFamilyGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => api.family.createGroup(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family", "groups"] });
    },
  });
}

export function useInviteFamilyMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, email, relation }: { groupId: string; email: string; relation: string }) =>
      api.family.inviteMember(groupId, email, relation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family", "groups"] });
    },
  });
}
