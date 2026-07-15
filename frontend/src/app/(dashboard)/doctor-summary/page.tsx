"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Activity, AlertCircle, Pill, ClipboardList, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DoctorSummaryPage() {
  const { data: summary, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["doctor-summary"],
    queryFn: () => api.summary.getDoctor(),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse">Generating your AI clinical summary...</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] max-w-md mx-auto text-center space-y-4">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">No Summary Available</h2>
        <p className="text-muted-foreground">
          We need some medical records (documents, timeline events, or medications) to generate a clinical summary. 
          Upload some documents and check back later!
        </p>
      </div>
    );
  }

  // Helper to parse the JSON arrays safely
  const parseList = (json: any) => {
    if (!json) return [];
    if (Array.isArray(json)) return json;
    try {
      return JSON.parse(json) || [];
    } catch {
      return [];
    }
  };

  const conditions = parseList(summary.currentConditions);
  const medications = parseList(summary.currentMedicines);
  const allergies = parseList(summary.allergies);
  const labs = parseList(summary.recentLabs);
  const imaging = parseList(summary.recentImaging);
  const surgeries = parseList(summary.pastSurgeries);
  const vitals = parseList(summary.vitalSigns);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Clinical Summary
            <Badge variant="secondary" className="ml-2 font-normal text-xs">
              <Sparkles className="h-3 w-3 mr-1" /> AI Generated
            </Badge>
          </h1>
          <p className="text-muted-foreground">
            A comprehensive overview of your medical history, automatically synthesized from your records.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => refetch()} 
          disabled={isRefetching}
        >
          {isRefetching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Activity className="h-4 w-4 mr-2" />}
          Refresh Summary
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Conditions & Allergies */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Current Conditions & Allergies
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Conditions</h4>
                {conditions.length > 0 ? (
                  <ul className="space-y-2">
                    {conditions.map((c: any, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        <span>{typeof c === 'string' ? c : (c.condition || c.name || JSON.stringify(c))}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground italic">None reported.</p>
                )}
              </div>
              
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Allergies</h4>
                {allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {allergies.map((a: any, i: number) => (
                      <Badge key={i} variant="destructive">
                        {typeof a === 'string' ? a : (a.allergen || a.name || JSON.stringify(a))}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No known allergies.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-blue-500" />
                Recent Lab Results
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {labs.length > 0 ? (
                <ul className="space-y-3">
                  {labs.map((l: any, i: number) => (
                    <li key={i} className="flex flex-col gap-1 text-sm border-b pb-3 last:border-0">
                      <div className="flex justify-between items-start">
                        <span className="font-medium">{l.testName || l.test || JSON.stringify(l)}</span>
                        {l.date && <span className="text-xs text-muted-foreground">{l.date}</span>}
                      </div>
                      {(l.value || l.result) && (
                        <div className="text-muted-foreground">
                          Result: <span className="font-medium text-foreground">{l.value || l.result}</span>
                          {l.abnormal && <Badge variant="destructive" className="ml-2 text-[10px] h-4">Abnormal</Badge>}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground italic">No recent lab results available.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Medications & History */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Pill className="h-5 w-5 text-emerald-500" />
                Current Medications
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {medications.length > 0 ? (
                <ul className="space-y-3">
                  {medications.map((m: any, i: number) => (
                    <li key={i} className="flex flex-col gap-1 text-sm border-b pb-3 last:border-0">
                      <span className="font-medium text-primary">{m.name || m.medication || JSON.stringify(m)}</span>
                      {m.dosage && <span className="text-muted-foreground">{m.dosage} {m.frequency ? `• ${m.frequency}` : ''}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground italic">No current medications on file.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-500" />
                Past Surgeries & Procedures
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {surgeries.length > 0 ? (
                <ul className="space-y-3">
                  {surgeries.map((s: any, i: number) => (
                    <li key={i} className="flex flex-col gap-1 text-sm border-b pb-3 last:border-0">
                      <span className="font-medium">{s.procedure || s.name || JSON.stringify(s)}</span>
                      {s.date && <span className="text-xs text-muted-foreground">{s.date}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground italic">No major surgeries or procedures recorded.</p>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      <div className="text-xs text-center text-muted-foreground pt-8">
        <p>Disclaimer: This summary is generated by AI based on your uploaded health records.</p>
        <p>Always consult with a qualified healthcare provider for medical advice.</p>
      </div>

    </div>
  );
}
