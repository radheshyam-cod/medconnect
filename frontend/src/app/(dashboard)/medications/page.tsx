"use client";
import Link from "next/link";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Pill,
  Loader2,
  AlertCircle,
  Plus,
  Calendar,
  Clock,
  Sparkles,
} from "lucide-react";
import { MedicationCard } from "@/components/premium/medication-card";
import { PageSkeleton } from "@/components/premium/page-skeleton";
import { cn } from "@/lib/utils";

const FILTERS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Past" },
  { value: "ALL", label: "All" },
] as const;

export default function MedicationsPage() {
  const [filter, setFilter] = useState<"ACTIVE" | "INACTIVE" | "ALL">("ACTIVE");
  const queryClient = useQueryClient();
  
  const { data: medications, isLoading, isError } = useQuery({
    queryKey: ["medications", filter],
    queryFn: () => api.medications.list({ isActive: filter === "ALL" ? undefined : filter === "ACTIVE" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      api.medications.update(id, { isActive }),
    onSuccess: () => {
      // Invalidate medications queries so they refetch the correct lists
      queryClient.invalidateQueries({ queryKey: ["medications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });

  const handleToggle = (id: string, isActive: boolean) => {
    toggleMutation.mutate({ id, isActive });
  };

  const activeMeds = useMemo(() => 
    medications?.filter(m => m.isActive) ?? [], 
    [medications]
  );
  
  const pastMeds = useMemo(() => 
    medications?.filter(m => !m.isActive) ?? [], 
    [medications]
  );

  const displayMeds = filter === "ACTIVE" 
    ? activeMeds 
    : filter === "INACTIVE" 
      ? pastMeds 
      : medications ?? [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Medications</h1>
          <p className="text-muted-foreground text-sm">Manage your current and past prescriptions</p>
        </div>
      </div>

      {/* Stats */}
      {!isLoading && medications && medications.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{medications.length} total</span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {activeMeds.length} active
          </span>
          {pastMeds.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
              {pastMeds.length} past
            </span>
          )}
        </div>
      )}

      {/* Filter pills */}
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <Badge
            key={f.value}
            variant={filter === f.value ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
            {f.value === "ACTIVE" && activeMeds.length > 0 && (
              <span className="ml-1.5 text-[10px] opacity-70">({activeMeds.length})</span>
            )}
          </Badge>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <PageSkeleton type="list" />
      ) : isError ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-10 w-10 text-destructive mb-3" />
            <p className="font-semibold">Failed to load medications</p>
          </CardContent>
        </Card>
      ) : !medications || medications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
              <Pill className="h-8 w-8 text-emerald-500/60" />
            </div>
            <h3 className="text-lg font-semibold">No Medications Found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              We couldn&apos;t find any medications matching your filter. Upload prescriptions to add them automatically via AI.
            </p>
            <div className="flex gap-2 mt-4">
              <Badge variant="outline">Upload Prescription</Badge>
              <Badge variant="outline">Add Manually</Badge>
            </div>
            <Button variant="outline" className="mt-6" asChild>
              <Link href="/documents">Upload Prescription</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        >
          {displayMeds.map((med) => (
            <MedicationCard 
              key={med.id} 
              medication={med} 
              onToggle={handleToggle} 
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}


