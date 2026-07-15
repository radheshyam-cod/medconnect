"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FlaskConical, AlertTriangle, CheckCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function LabsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["labs", { page }],
    queryFn: () => api.labs.list({ page, limit: 10 }),
  });

  const labs = Array.isArray(data) ? data : (data as any)?.results || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lab Reports</h1>
          <p className="text-muted-foreground">Track your biomarkers and test results over time</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !labs || labs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FlaskConical className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No lab results found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Upload your lab reports and our AI will automatically extract and track your biomarkers here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {labs.map((lab: any) => (
            <Card key={lab.id} className={`overflow-hidden hover:shadow-md transition-shadow ${lab.isAbnormal ? 'border-red-200 bg-red-50/10' : ''}`}>
              <CardContent className="p-0">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold">{lab.testName}</h3>
                    {lab.isAbnormal ? (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                    )}
                  </div>
                  
                  <div className="flex items-end gap-2 mb-2">
                    <span className={`text-2xl font-bold ${lab.isAbnormal ? 'text-red-600' : ''}`}>
                      {lab.value}
                    </span>
                    {lab.unit && (
                      <span className="text-muted-foreground mb-1">{lab.unit}</span>
                    )}
                  </div>
                  
                  {lab.referenceRange && (
                    <p className="text-xs text-muted-foreground">
                      Reference: {lab.referenceRange}
                    </p>
                  )}
                </div>
                <div className="bg-muted/30 px-4 py-2 text-xs border-t text-muted-foreground flex justify-between">
                  <span>{formatDate(lab.date)}</span>
                  {lab.category && <span>{lab.category}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
