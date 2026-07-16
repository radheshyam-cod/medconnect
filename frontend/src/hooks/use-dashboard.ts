"use client";

import { useQuery } from "@tanstack/react-query";
import { api, type DashboardStats } from "@/lib/api-client";

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.dashboard.getStats(),
  });
}

export function useTimelineAISummary() {
  return useQuery({
    queryKey: ["timeline-ai-summary"],
    queryFn: () => api.timeline.getAISummary(),
    staleTime: 2 * 60 * 1000,
  });
}
