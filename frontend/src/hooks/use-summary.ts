import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function usePatientSummary() {
  return useQuery({
    queryKey: ["summary", "patient"],
    queryFn: () => api.summary.getPatient(),
  });
}

export function useDoctorSummary() {
  return useQuery({
    queryKey: ["summary", "doctor"],
    queryFn: () => api.summary.getDoctor(),
  });
}
