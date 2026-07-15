"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

interface DashboardStats {
  documentsThisMonth: number;
  totalDocuments: number;
  activeMedications: number;
  totalLabResults: number;
  upcomingRemindersToday: number;
  recentDocuments: Array<{
    id: string;
    fileName: string;
    documentType: string | null;
    status: string;
    createdAt: string;
  }>;
  recentLabResults: Array<{
    id: string;
    testName: string;
    value: string;
    unit: string | null;
    isAbnormal: boolean;
    date: string;
  }>;
}

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.dashboard.getStats(),
  });
}
