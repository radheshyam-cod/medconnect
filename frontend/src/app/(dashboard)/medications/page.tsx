"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pill, CheckCircle2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function MedicationsPage() {
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
  
  const { data: medications, isLoading } = useQuery({
    queryKey: ["medications", filter],
    queryFn: () => api.medications.list({ isActive: filter === 'ALL' ? undefined : filter === 'ACTIVE' }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Medications</h1>
          <p className="text-muted-foreground">Manage your current and past prescriptions</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <Badge
          variant={filter === 'ACTIVE' ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setFilter('ACTIVE')}
        >
          Active
        </Badge>
        <Badge
          variant={filter === 'INACTIVE' ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setFilter('INACTIVE')}
        >
          Past
        </Badge>
        <Badge
          variant={filter === 'ALL' ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setFilter('ALL')}
        >
          All
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !medications || medications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Pill className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No medications found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              We couldn't find any medications matching your filter. Upload prescriptions to add them automatically via AI.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {medications.map((med: any) => (
            <Card key={med.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{med.name}</h3>
                    {med.isActive ? (
                      <Badge variant="default" className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border-emerald-200">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Past</Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2 mt-4 text-sm">
                    {med.dosage && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dosage</span>
                        <span className="font-medium">{med.dosage}</span>
                      </div>
                    )}
                    {med.frequency && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Frequency</span>
                        <span className="font-medium">{med.frequency}</span>
                      </div>
                    )}
                    {med.prescribedBy && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Prescribed By</span>
                        <span className="font-medium">Dr. {med.prescribedBy}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-muted/30 px-4 py-3 text-xs border-t text-muted-foreground">
                  Added {formatDistanceToNow(new Date(med.createdAt), { addSuffix: true })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
