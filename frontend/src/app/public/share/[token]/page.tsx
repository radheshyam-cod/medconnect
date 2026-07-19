"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { Loader2, AlertCircle, ShieldCheck, Clock, FileText, User, Activity, AlertTriangle, FileImage, Download, ChevronRight, Check, X, FileSearch } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import Image from "next/image";

// Helper to calculate age
function calculateAge(dob?: string | Date) {
  if (!dob) return "N/A";
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export default function PublicSharePage() {
  const params = useParams();
  const token = params.token as string;

  const { data: linkData, isLoading, isError } = useQuery({
    queryKey: ["public-share", token],
    queryFn: () => api.sharing.getPublicData(token),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-muted/20">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse">Loading secure health record...</p>
      </div>
    );
  }

  if (isError || !linkData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-muted/20 p-4">
        <Card className="max-w-md w-full border-destructive/20 shadow-lg">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground text-sm mb-6">
              This secure link is either invalid, has expired, or the patient has revoked access.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const {
    patientProfile,
    doctorSummary,
    timelineEvents,
    documents,
    labResults,
    medications,
  } = linkData.clinicalData || {};

  const generalDocs = documents?.filter((d: any) => d.documentType !== "SCAN_REPORT") || [];
  const imagingDocs = documents?.filter((d: any) => d.documentType === "SCAN_REPORT") || [];
  const rawConditions = doctorSummary?.currentConditions || [];
  const activeConditions = Array.isArray(rawConditions) && rawConditions.length > 0
    ? rawConditions.map((c: any) => typeof c === 'string' ? c : (c.name || c.condition || 'General Condition'))
    : ['General Health Maintenance (No active chronic diagnoses reported)'];
  const allergies = patientProfile?.allergies?.length > 0 ? patientProfile.allergies : doctorSummary?.allergies || [];

  const displayMedications = (medications?.length > 0
    ? medications
    : Array.isArray(doctorSummary?.currentMedicines)
      ? doctorSummary.currentMedicines
      : []
  ).map((med: any) => {
    const rawDosage = typeof med === 'object' && med?.dosage && med.dosage !== '-' ? med.dosage : 'As prescribed';
    const isMissingDosage = med?.isMissingDosage || rawDosage === 'As prescribed' || rawDosage === '-' || rawDosage.includes('Missing exact dosage');
    const dosageDisplay = isMissingDosage ? 'Missing exact dosage (Please update intake & timing, e.g. "1 tablet after meals")' : rawDosage;
    return {
      id: med.id || med.name || Math.random().toString(),
      name: typeof med === 'string' ? med : (med.name || med.medication || 'Prescription Medication'),
      dosage: dosageDisplay,
      isMissingDosage,
      frequency: typeof med === 'object' && med?.frequency && med.frequency !== '-' ? med.frequency : 'Daily',
      indication: typeof med === 'object' && med?.indication ? med.indication : '',
      displayText: typeof med === 'object' && med?.displayText ? med.displayText : '',
    };
  });

  const displayLabResults = (labResults?.length > 0
    ? labResults
    : Array.isArray(doctorSummary?.recentLabs)
      ? doctorSummary.recentLabs
      : []
  ).map((lab: any) => {
    const rawRef = typeof lab === 'object' && (lab?.referenceRange || lab?.range) && (lab.referenceRange || lab.range) !== '-' ? (lab.referenceRange || lab.range) : '';
    const refRange = (!rawRef || rawRef.toLowerCase().includes('standard reference range') || rawRef.toLowerCase().includes('within standard laboratory baseline')) ? '' : rawRef;
    return {
      id: lab.id || lab.testName || Math.random().toString(),
      date: lab.date || new Date(),
      testName: typeof lab === 'string' ? lab : (lab.testName || lab.test || 'Lab Test'),
      value: typeof lab === 'object' && lab?.value ? lab.value : 'Normal',
      unit: typeof lab === 'object' && lab?.unit ? lab.unit : '',
      referenceRange: refRange,
      isAbnormal: typeof lab === 'object' ? Boolean(lab.isAbnormal || lab.abnormal) : false,
      summaryText: typeof lab === 'object' && lab?.summaryText ? lab.summaryText : '',
    };
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans selection:bg-primary/20">
      {/* ─── Header ─── */}
      <header className="bg-background border-b px-4 py-3 sticky top-0 z-30 shadow-sm backdrop-blur-md bg-white/90">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <Image src="/logo.png" alt="Logo" width={24} height={24} className="object-contain" />
            </div>
            <span className="font-extrabold text-lg text-primary tracking-tight">MedConnect</span>
          </div>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 py-1 px-3">
            <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Secure View
          </Badge>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 mt-6 space-y-6">
        
        {/* 1. Patient Summary (Top Section) */}
        <Card className="border-t-4 border-t-primary shadow-md overflow-hidden">
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-3">
              <div className="p-6 bg-slate-50 md:border-r flex flex-col justify-center items-center md:items-start text-center md:text-left">
                <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                  <User className="h-8 w-8" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">{linkData.user?.fullName}</h1>
                <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                  <span>{calculateAge(patientProfile?.dateOfBirth)} yrs</span>
                  <span>•</span>
                  <span>{patientProfile?.gender || "Not specified"}</span>
                </p>
                {patientProfile?.bloodGroup && (
                  <Badge className="mt-3 bg-red-100 text-red-700 hover:bg-red-200 border-none">
                    Blood Group: {patientProfile.bloodGroup}
                  </Badge>
                )}
              </div>
              <div className="p-6 col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Key Highlights</h4>
                  <ul className="space-y-2 text-sm">
                    {activeConditions.slice(0, 3).map((cond: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-slate-700">
                        <Activity className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{cond}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Emergency Contact</h4>
                  <p className="text-sm font-medium text-slate-700">
                    {patientProfile?.emergencyContact || "Not provided"}
                  </p>
                  <p className="text-xs text-slate-500 mt-4 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Last updated {formatDate(patientProfile?.updatedAt || linkData.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 8. Allergies (Always Visible if present) */}
        {allergies.length > 0 ? (
          <Card className="bg-red-50 border-red-200 shadow-sm">
            <CardContent className="p-4 flex items-start sm:items-center gap-4">
              <div className="bg-red-100 p-2 rounded-full shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-red-800 uppercase tracking-wider">Known Allergies</h4>
                <div className="flex flex-wrap gap-2 mt-2">
                  {allergies.map((allergy: string, i: number) => (
                    <Badge key={i} variant="outline" className="bg-white text-red-700 border-red-300">
                      {allergy}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-emerald-50 border-emerald-200 shadow-sm">
            <CardContent className="p-4 flex items-center gap-4 text-emerald-800">
              <Check className="h-5 w-5 text-emerald-600 shrink-0" />
              <span className="font-medium text-sm">No Known Allergies</span>
            </CardContent>
          </Card>
        )}

        {/* 2. AI Medical Summary */}
        {doctorSummary && (
          <Card className="border-indigo-200 shadow-sm bg-gradient-to-br from-indigo-50/50 to-white">
            <CardHeader className="pb-3 border-b border-indigo-100 bg-indigo-50/30">
              <CardTitle className="text-lg flex items-center gap-2 text-indigo-900">
                <span className="bg-indigo-100 p-1.5 rounded-md text-indigo-600">
                  <FileText className="h-4 w-4" />
                </span>
                AI Medical Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-sm text-slate-700">
              {doctorSummary.summaryText && (
                <div className="p-3 bg-indigo-50/70 rounded-lg border border-indigo-100 text-indigo-950 font-medium mb-4">
                  {doctorSummary.summaryText}
                </div>
              )}
              <div className="space-y-2">
                <h5 className="font-semibold text-indigo-900 text-xs uppercase tracking-wider">Active Clinical Diagnoses</h5>
                {activeConditions.map((cond: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                    <span className="font-medium">{cond}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2 pt-2 border-t border-indigo-100/60">
                <h5 className="font-semibold text-indigo-900 text-xs uppercase tracking-wider">Medications & Indications</h5>
                {(Array.isArray(doctorSummary.currentMedicines) && doctorSummary.currentMedicines.length > 0 ? doctorSummary.currentMedicines : displayMedications).map((med: any, i: number) => {
                  const isMissing = med.isMissingDosage || (typeof med.dosage === 'string' && (med.dosage === 'As prescribed' || med.dosage.includes('Missing exact dosage')));
                  return (
                    <div key={i} className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                      <span>
                        {med.displayText ? (
                          <span className="font-medium">{med.displayText}</span>
                        ) : (
                          <>
                            Currently taking <span className="font-medium">{med.name}</span>
                            {isMissing ? (
                              <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded ml-1.5 text-xs border border-amber-200 font-medium">
                                ⚠️ Missing exact dosage (Please update intake & timing, e.g. "1 tablet after meals")
                              </span>
                            ) : (
                              ` (${med.dosage} • ${med.frequency})`
                            )}
                            {med.indication && !med.indication.includes('⚠️') ? ` - ${med.indication}` : ''}
                          </>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="space-y-2 pt-2 border-t border-indigo-100/60">
                <h5 className="font-semibold text-indigo-900 text-xs uppercase tracking-wider">Synthesized Lab Findings</h5>
                {(Array.isArray(doctorSummary.recentLabs) && doctorSummary.recentLabs.length > 0 ? doctorSummary.recentLabs : displayLabResults).map((lab: any, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <Activity className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span>
                      {lab.summaryText ? (
                        <span className="font-medium">{lab.summaryText}</span>
                      ) : (
                        <>
                          {lab.testName}: <span className="font-medium">{lab.value} {lab.unit}</span>
                          {lab.referenceRange ? ` (Baseline: ${lab.referenceRange})` : ''}
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 7. Diagnoses & 6. Current Medications Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Diagnoses */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-500" /> Active Diagnoses
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y text-sm">
                {activeConditions.map((cond: string, i: number) => (
                  <li key={i} className="p-4 flex items-center gap-3 bg-slate-50/50">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-medium text-slate-800">{cond}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Current Medications */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" /> Current Medications
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Medicine</TableHead>
                      <TableHead>Dosage</TableHead>
                      <TableHead>Freq</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayMedications.length > 0 ? (
                      displayMedications.map((med: any, idx: number) => {
                        const isMissing = med.isMissingDosage || med.dosage === 'As prescribed' || (typeof med.dosage === 'string' && med.dosage.includes('Missing exact dosage'));
                        return (
                          <TableRow key={med.id || idx}>
                            <TableCell className="font-medium">{med.name}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {isMissing ? (
                                <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-1 rounded text-xs border border-amber-200 font-medium">
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                  Missing exact dosage (Please update intake & timing, e.g. "1 tablet after meals")
                                </span>
                              ) : (
                                med.dosage
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{med.frequency}</TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center h-24 text-muted-foreground italic">
                          No active medications recorded.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 5. Lab Results */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <FileSearch className="h-4 w-4 text-slate-500" /> Recent Lab Results
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Date</TableHead>
                    <TableHead>Test Name</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Normal Range</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayLabResults.length > 0 ? (
                    displayLabResults.map((lab: any, idx: number) => (
                      <TableRow key={lab.id || idx}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {lab.date ? formatDate(lab.date) : "-"}
                        </TableCell>
                        <TableCell className="font-medium">{lab.testName}</TableCell>
                        <TableCell>{lab.value} <span className="text-xs text-muted-foreground">{lab.unit}</span></TableCell>
                        <TableCell className="text-muted-foreground text-sm">{lab.referenceRange || "-"}</TableCell>
                        <TableCell>
                          {lab.isAbnormal ? (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              <AlertTriangle className="h-3 w-3 mr-1" /> High/Low
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                              <Check className="h-3 w-3 mr-1" /> Normal
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24 text-muted-foreground italic">
                        No recent lab results recorded.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 3. Medical Timeline */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" /> Medical Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {timelineEvents?.length > 0 ? (
              <div className="relative border-l-2 border-slate-200 ml-3 space-y-8 pb-4">
                {timelineEvents.map((event: any, idx: number) => (
                  <div key={event.id} className="relative pl-6">
                    <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white bg-primary shadow-sm" />
                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 mb-1">
                      <h4 className="font-bold text-slate-800 text-sm">{event.title}</h4>
                      <time className="text-xs font-semibold text-primary/80 uppercase tracking-wider">
                        {formatDate(event.eventDate)}
                      </time>
                    </div>
                    {event.description && (
                      <p className="text-sm text-slate-600 mt-1.5 leading-relaxed max-w-2xl">{event.description}</p>
                    )}
                    {(event.facility || event.doctorName) && (
                      <div className="text-xs text-slate-400 mt-2 flex items-center gap-2">
                        {event.facility && <span className="bg-slate-100 px-2 py-0.5 rounded">{event.facility}</span>}
                        {event.doctorName && <span className="bg-slate-100 px-2 py-0.5 rounded">{event.doctorName}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground italic py-6">No timeline events recorded.</p>
            )}
          </CardContent>
        </Card>

        {/* 4. Reports & Documents */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-500" /> Clinical Documents & Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {generalDocs.length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                {generalDocs.map((doc: any, i: number) => (
                  <AccordionItem value={`item-${i}`} key={doc.id} className="border-b last:border-b-0 px-4">
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-center gap-4 text-left">
                        <div className="bg-slate-100 p-2 rounded-md shrink-0">
                          <FileText className="h-5 w-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{doc.fileName}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Badge variant="secondary" className="text-[10px] h-5">{doc.documentType}</Badge>
                            <span>{formatDate(doc.documentDate || doc.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-1 pl-16">
                      <div className="bg-slate-50 p-4 rounded-lg border text-sm text-slate-700">
                        <div className="font-medium text-slate-900 mb-2 flex items-center gap-1.5">
                          <Activity className="h-4 w-4 text-primary" /> AI Summary
                        </div>
                        <p className="leading-relaxed opacity-80">
                          {doc.documentType === 'PRESCRIPTION' ? 'Prescription containing medications.' : 
                           doc.documentType === 'LAB_REPORT' ? 'Lab report with test results.' : 
                           'Document processed successfully.'}
                        </p>
                        {doc.publicUrl && (
                          <Button variant="outline" size="sm" className="mt-4" asChild>
                            <a href={doc.publicUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="h-3.5 w-3.5 mr-2" /> View PDF Original
                            </a>
                          </Button>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <p className="text-center text-muted-foreground italic py-8">No clinical documents found.</p>
            )}
          </CardContent>
        </Card>

        {/* 9. Imaging */}
        {imagingDocs.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <FileImage className="h-4 w-4 text-slate-500" /> Imaging & Scans
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {imagingDocs.map((doc: any) => (
                  <div key={doc.id} className="border rounded-lg overflow-hidden group">
                    <div className="bg-slate-100 aspect-video flex items-center justify-center border-b">
                      <FileImage className="h-10 w-10 text-slate-300 group-hover:text-primary/50 transition-colors" />
                    </div>
                    <div className="p-3 bg-white">
                      <p className="font-medium text-sm truncate">{doc.fileName}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(doc.documentDate || doc.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 10. Share Information */}
        <div className="mt-12 bg-slate-100 rounded-xl p-6 text-sm text-slate-500 border border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <p><strong>Shared by:</strong> {linkData.user?.fullName}</p>
              <p><strong>Permission:</strong> {linkData.accessLevel || "Read Only"}</p>
            </div>
            <div className="space-y-1">
              <p><strong>Access expires:</strong> {formatDate(linkData.expiresAt)}</p>
              <p><strong>Last accessed:</strong> {formatDate(new Date())}</p>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-center text-slate-400">
            This is a securely generated view from MedConnect. Information here is for clinical reference only.
          </div>
        </div>

      </main>
    </div>
  );
}
