"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useTimeline(params?: {
  page?: number;
  limit?: number;
  eventType?: string;
  from?: string;
  to?: string;
}) {
  return useQuery({
    queryKey: ["timeline", params],
    queryFn: () => api.timeline.list(params),
  });
}

export function useTimelineSummary() {
  return useQuery({
    queryKey: ["timeline-summary"],
    queryFn: () => api.timeline.getSummary(),
  });
}

export function useDoctorSummary() {
  return useQuery({
    queryKey: ["doctor-summary"],
    queryFn: () => api.summary.getDoctor(),
  });
}

export function useTimelineAISummary() {
  return useQuery({
    queryKey: ["timeline-ai-summary"],
    queryFn: () => api.timeline.getAISummary(),
    staleTime: 2 * 60 * 1000, // 2 minutes - AI summary refreshes less often
  });
}
