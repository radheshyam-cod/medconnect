import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useGlobalSearch(query: string) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: () => api.search.query(query),
    enabled: query.length > 2,
  });
}
