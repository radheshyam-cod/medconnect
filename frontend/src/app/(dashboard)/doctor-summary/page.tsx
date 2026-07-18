"use client";
import Link from "next/link";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Activity,
  AlertCircle,
  Pill,
  ClipboardList,
  Loader2,
  Sparkles,
  Download,
  Printer,
  Share2,
  Heart,
  AlertTriangle,
  Stethoscope,
  Syringe,
  TrendingUp,
  User,
  Shield,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { PageSkeleton } from "@/components/premium/page-skeleton";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function DoctorSummaryPage() {
  const { data: summary, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["doctor-summary"],
    queryFn: () => api.summary.getDoctor(),
  });

  const parseList = (json: any) => {
    if (!json) return [];
    if (Array.isArray(json)) return json;
    try { return JSON.parse(json) || []; } catch { return []; }
  };

  const conditions = parseList(summary?.currentConditions);
  const medications = parseList(summary?.currentMedicines);
  const allergies = parseList(summary?.allergies);
  const labs = parseList(summary?.recentLabs);
  const imaging = parseList(summary?.recentImaging);
  const surgeries = parseList(summary?.pastSurgeries);
  const vitals = parseList(summary?.vitalSigns);
  const riskFactors = parseList(summary?.riskFactors);
  const recommendations = parseList(summary?.recommendations);

  // Gemini returns a 'summary' narrative string; the frontend expects 'aiNotes'
  const aiNotes = (summary as any)?.aiNotes || (summary as any)?.summary || null;

  const handlePrint = () => window.print();
  const handleDownload = () => {
    // Generate a text version
    const text = [
      "MEDICAL SUMMARY\n",
      `Generated: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}\n\n`,
      `CONDITIONS:\n${conditions.map((c: any) => `- ${typeof c === 'string' ? c : c.name || c.condition}`).join("\n")}\n\n`,
      `MEDICATIONS:\n${medications.map((m: any) => `- ${m.name || m.medication}${m.dosage ? ` (${m.dosage})` : ""}`).join("\n")}\n\n`,
      `ALLERGIES:\n${allergies.map((a: any) => `- ${typeof a === 'string' ? a : a.name || a.allergen}`).join("\n")}`,
    ].join("");
    
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "medical-summary.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Summary downloaded");
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto">
        <PageSkeleton type="default" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] max-w-md mx-auto text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-2xl font-bold">Failed to Load Summary</h2>
        <p className="text-muted-foreground">Please try refreshing the summary.</p>
        <Button onClick={() => refetch()} disabled={isRefetching}>
          {isRefetching && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Retry
        </Button>
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
        <Button variant="outline" asChild>
          <Link href="/documents">Upload Documents</Link>
        </Button>
      </div>
    );
  }

  // Gemini returns raw JSON without DB timestamps — fall back to now
  const summaryDate = formatDate(summary.updatedAt || summary.createdAt || new Date().toISOString());

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10 print:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Clinical Summary
            <Badge variant="secondary" className="font-normal text-[10px]">
              <Sparkles className="h-3 w-3 mr-1" /> AI Generated
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground">
            Comprehensive overview of your medical history, synthesized from your records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1.5" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1.5" /> Download
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.info("Share coming soon")}>
            <Share2 className="h-4 w-4 mr-1.5" /> Share
          </Button>
          <Button size="sm" onClick={() => refetch()} disabled={isRefetching}>
            {isRefetching ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Activity className="h-4 w-4 mr-1.5" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* Generated date */}
      <div className="text-xs text-muted-foreground print:block hidden">
        Generated: {summaryDate}
      </div>

      {/* Summary Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Patient Overview */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Patient Overview
                </CardTitle>
                <CardDescription>Summary generated on {summaryDate}</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {aiNotes && (
                  <div className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed">
                    <p className="text-muted-foreground">{aiNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Conditions & Allergies */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card>
              <CardHeader className="bg-red-50/30 dark:bg-red-950/20 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Current Conditions & Allergies
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Conditions</h4>
                  {conditions.length > 0 ? (
                    <div className="space-y-2">
                      {conditions.map((c: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                          <span>{typeof c === 'string' ? c : (c.condition || c.name || JSON.stringify(c))}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">None reported.</p>
                  )}
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Allergies</h4>
                  {allergies.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {allergies.map((a: any, i: number) => (
                        <Badge key={i} variant="destructive" className="text-xs">
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
          </motion.div>

          {/* Risk Factors */}
          {riskFactors.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card>
                <CardHeader className="bg-amber-50/30 dark:bg-amber-950/20 pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-amber-500" />
                    Risk Factors
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <ul className="space-y-2">
                    {riskFactors.map((r: any, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <span>{typeof r === 'string' ? r : r.factor || r.name || JSON.stringify(r)}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Medications */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card>
              <CardHeader className="bg-emerald-50/30 dark:bg-emerald-950/20 pb-4">
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
                        <span className="font-semibold text-primary">
                          {m.name || m.medication || JSON.stringify(m)}
                        </span>
                        {m.dosage && (
                          <span className="text-xs text-muted-foreground">
                            {m.dosage}{m.frequency ? ` • ${m.frequency}` : ""}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No current medications on file.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Lab Results */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardHeader className="bg-purple-50/30 dark:bg-purple-950/20 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-purple-500" />
                  Recent Lab Results
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {labs.length > 0 ? (
                  <ul className="space-y-3">
                    {labs.map((l: any, i: number) => (
                      <li key={i} className="flex flex-col gap-1 text-sm border-b pb-3 last:border-0">
                        <div className="flex justify-between items-start">
                          <span className="font-medium">{l.testName || l.test || "Lab Test"}</span>
                          {l.date && <span className="text-[10px] text-muted-foreground">{l.date}</span>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Result: <span className="font-medium text-foreground">{l.value || l.result}</span></span>
                          {l.abnormal && <Badge variant="destructive" className="text-[9px] h-4">Abnormal</Badge>}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No recent lab results available.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Past Surgeries */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card>
              <CardHeader className="bg-orange-50/30 dark:bg-orange-950/20 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Syringe className="h-5 w-5 text-orange-500" />
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
          </motion.div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="border-primary/10">
                <CardHeader className="bg-primary/5 pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <ul className="space-y-2">
                    {recommendations.map((r: any, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{typeof r === 'string' ? r : r.recommendation || r.text || JSON.stringify(r)}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-xs text-center text-muted-foreground pt-8 space-y-1">
        <p>Disclaimer: This summary is generated by AI based on your uploaded health records.</p>
        <p>Always consult with a qualified healthcare provider for medical advice.</p>
      </div>
    </div>
  );
}
