"use client";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Pill,
  Loader2,
  AlertCircle,
  Plus,
  Calendar,
  Clock,
  Search,
  Filter,
  ChevronDown,
  Sun,
  Sunset,
  Moon,
  CheckCircle2,
  User,
  FileText,
  RefreshCw,
  X,
  Sparkles,
  ShieldAlert,
  SlidersHorizontal,
  Check,
  RotateCcw,
} from "lucide-react";
import { PageSkeleton } from "@/components/premium/page-skeleton";
import { cn, formatDate } from "@/lib/utils";
import type { MedicationItem } from "@/lib/api-client";
import { useUploadDocument } from "@/hooks/use-documents";
import { PrescriptionRxUploader } from "@/components/medications/prescription-uploader";

type TabFilter = "ALL" | "ACTIVE" | "COMPLETED";
type TimeFilter = "ALL_TIMES" | "MORNING" | "AFTERNOON" | "NIGHT";

export default function MedicationsPage() {
  const [tab, setTab] = useState<TabFilter>("ACTIVE");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("ALL_TIMES");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const uploadMutation = useUploadDocument();
  const queryClient = useQueryClient();

  const handleUpload = async (file: File, metadata: any) => {
    await uploadMutation.mutateAsync({ file, metadata });
    setShowUpload(false);
  };

  const { data: medications, isLoading, isError } = useQuery({
    queryKey: ["medications"],
    queryFn: () => api.medications.list({}),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.medications.update(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });

  const handleToggle = (id: string, isActive: boolean) => {
    toggleMutation.mutate({ id, isActive });
  };

  const allMeds = useMemo(() => medications ?? [], [medications]);
  const activeMeds = useMemo(() => allMeds.filter(m => m.isActive), [allMeds]);
  const completedMeds = useMemo(() => allMeds.filter(m => !m.isActive), [allMeds]);

  // Parse frequency into schedule slots
  const getSchedule = (med: MedicationItem) => {
    const freq = (med.frequency || "").toLowerCase();
    const instr = (med.instructions || "").toLowerCase();
    const combined = freq + " " + instr;
    return {
      morning: combined.includes("morning") || combined.includes("breakfast") || combined.includes("bd") || combined.includes("twice") || combined.includes("thrice") || combined.includes("daily") || combined.includes("once"),
      afternoon: combined.includes("afternoon") || combined.includes("lunch") || combined.includes("thrice"),
      night: combined.includes("night") || combined.includes("dinner") || combined.includes("bedtime") || combined.includes("bd") || combined.includes("twice") || combined.includes("thrice"),
    };
  };

  const filteredMeds = useMemo(() => {
    let list = tab === "ACTIVE" ? activeMeds : tab === "COMPLETED" ? completedMeds : allMeds;

    if (timeFilter !== "ALL_TIMES") {
      list = list.filter((m) => {
        const s = getSchedule(m);
        if (timeFilter === "MORNING") return s.morning;
        if (timeFilter === "AFTERNOON") return s.afternoon;
        if (timeFilter === "NIGHT") return s.night;
        return true;
      });
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.dosage?.toLowerCase().includes(q) ||
        m.prescribedBy?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [tab, timeFilter, activeMeds, completedMeds, allMeds, searchQuery]);

  const adherencePercent = allMeds.length > 0 ? Math.round((activeMeds.length / allMeds.length) * 100) : 0;
  const missedPercent = 100 - adherencePercent;

  // Get days remaining for a medication
  const getDaysRemaining = (med: MedicationItem) => {
    if (!med.endDate) return null;
    return Math.max(0, Math.ceil((new Date(med.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  };

  // Upcoming refills (active meds with end dates, sorted by nearest)
  const upcomingRefills = useMemo(() =>
    activeMeds
      .filter(m => m.endDate)
      .map(m => ({ ...m, daysLeft: getDaysRemaining(m) }))
      .filter(m => m.daysLeft !== null && m.daysLeft > 0)
      .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0))
      .slice(0, 4),
    [activeMeds]
  );

  // Today's schedule counts
  const todaySchedule = useMemo(() => {
    let morning = 0, afternoon = 0, night = 0;
    activeMeds.forEach(m => {
      const s = getSchedule(m);
      if (s.morning) morning++;
      if (s.afternoon) afternoon++;
      if (s.night) night++;
    });
    return { morning, afternoon, night, total: morning + afternoon + night };
  }, [activeMeds]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Regimen Command Hub Header */}
      <div className="relative rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-background to-teal-500/10 p-6 sm:p-8 shadow-sm">
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Pill className="h-3.5 w-3.5 animate-pulse" />
              Daily Regimen Tracker
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Prescription Medications</h1>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Organize your daily intake schedule, receive automatic refill reminders, and track adherence across all your active prescriptions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setShowUpload(!showUpload)}
              className="rounded-full h-11 px-6 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              {showUpload ? "Close Studio" : "Add New Prescription"}
            </Button>
          </div>
        </div>

        {/* Time-of-Day Quick Filter Bar inside Header */}
        {!isLoading && activeMeds.length > 0 && (
          <div className="relative z-10 mt-8 pt-6 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => { setTimeFilter("ALL_TIMES"); setTab("ACTIVE"); }}
              className={cn(
                "rounded-2xl p-4 sm:p-5 border text-left transition-all duration-200 group flex items-center justify-between gap-3 min-h-[88px]",
                timeFilter === "ALL_TIMES" && tab === "ACTIVE"
                  ? "bg-emerald-500 text-white border-emerald-500 shadow-md scale-[1.02]"
                  : "bg-background/80 hover:bg-background border-border/60 hover:border-emerald-500/40"
              )}
            >
              <div className="min-w-0 flex-1">
                <span className={cn("text-[11px] font-extrabold uppercase tracking-wider block truncate", timeFilter === "ALL_TIMES" ? "text-white/80" : "text-muted-foreground")}>All Scheduled</span>
                <span className="text-xl font-black mt-1 block truncate">{activeMeds.length} Active Meds</span>
              </div>
              <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0", timeFilter === "ALL_TIMES" ? "bg-white/20 text-white" : "bg-emerald-500/10 text-emerald-500")}>
                <Pill className="h-5 w-5" />
              </div>
            </button>

            <button
              onClick={() => { setTimeFilter("MORNING"); setTab("ACTIVE"); }}
              className={cn(
                "rounded-2xl p-4 sm:p-5 border text-left transition-all duration-200 group flex items-center justify-between gap-3 min-h-[88px]",
                timeFilter === "MORNING" && tab === "ACTIVE"
                  ? "bg-amber-500 text-white border-amber-500 shadow-md scale-[1.02]"
                  : "bg-background/80 hover:bg-background border-border/60 hover:border-amber-500/40"
              )}
            >
              <div className="min-w-0 flex-1">
                <span className={cn("text-[11px] font-extrabold uppercase tracking-wider block truncate", timeFilter === "MORNING" ? "text-white/80" : "text-amber-600 dark:text-amber-400")}>Morning (8:00 AM)</span>
                <span className="text-xl font-black mt-1 block truncate">{todaySchedule.morning} Meds</span>
              </div>
              <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0", timeFilter === "MORNING" ? "bg-white/20 text-white" : "bg-amber-500/10 text-amber-500")}>
                <Sun className="h-5 w-5" />
              </div>
            </button>

            <button
              onClick={() => { setTimeFilter("AFTERNOON"); setTab("ACTIVE"); }}
              className={cn(
                "rounded-2xl p-4 sm:p-5 border text-left transition-all duration-200 group flex items-center justify-between gap-3 min-h-[88px]",
                timeFilter === "AFTERNOON" && tab === "ACTIVE"
                  ? "bg-orange-500 text-white border-orange-500 shadow-md scale-[1.02]"
                  : "bg-background/80 hover:bg-background border-border/60 hover:border-orange-500/40"
              )}
            >
              <div className="min-w-0 flex-1">
                <span className={cn("text-[11px] font-extrabold uppercase tracking-wider block truncate", timeFilter === "AFTERNOON" ? "text-white/80" : "text-orange-600 dark:text-orange-400")}>Afternoon (2:00 PM)</span>
                <span className="text-xl font-black mt-1 block truncate">{todaySchedule.afternoon} Meds</span>
              </div>
              <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0", timeFilter === "AFTERNOON" ? "bg-white/20 text-white" : "bg-orange-500/10 text-orange-500")}>
                <Sunset className="h-5 w-5" />
              </div>
            </button>

            <button
              onClick={() => { setTimeFilter("NIGHT"); setTab("ACTIVE"); }}
              className={cn(
                "rounded-2xl p-4 sm:p-5 border text-left transition-all duration-200 group flex items-center justify-between gap-3 min-h-[88px]",
                timeFilter === "NIGHT" && tab === "ACTIVE"
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md scale-[1.02]"
                  : "bg-background/80 hover:bg-background border-border/60 hover:border-indigo-500/40"
              )}
            >
              <div className="min-w-0 flex-1">
                <span className={cn("text-[11px] font-extrabold uppercase tracking-wider block truncate", timeFilter === "NIGHT" ? "text-white/80" : "text-indigo-600 dark:text-indigo-400")}>Night (8:00 PM)</span>
                <span className="text-xl font-black mt-1 block truncate">{todaySchedule.night} Meds</span>
              </div>
              <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0", timeFilter === "NIGHT" ? "bg-white/20 text-white" : "bg-indigo-500/10 text-indigo-500")}>
                <Moon className="h-5 w-5" />
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Embedded Prescription Rx Uploader Studio */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <PrescriptionRxUploader
              onUpload={handleUpload}
              isUploading={uploadMutation.isPending}
              onCancel={() => setShowUpload(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">
        {/* Left/Main Column: Prescriptions List (3 columns wide on xl) */}
        <div className="xl:col-span-3 space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-2xl bg-card/60 backdrop-blur border border-border/50 p-4">
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/40 shrink-0">
              {([
                { value: "ACTIVE" as TabFilter, label: `Active (${activeMeds.length})` },
                { value: "COMPLETED" as TabFilter, label: `History (${completedMeds.length})` },
                { value: "ALL" as TabFilter, label: "All Prescriptions" },
              ]).map(t => (
                <button
                  key={t.value}
                  onClick={() => { setTab(t.value); setTimeFilter("ALL_TIMES"); }}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                    tab === t.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter prescriptions by medicine name, dosage, doctor..."
                className="flex h-10 w-full rounded-xl border border-border/60 bg-background/80 pl-10 pr-8 text-sm focus-visible:outline-none focus-visible:border-primary placeholder:text-muted-foreground shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearchQuery("")}>
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Time Filter Active Notice */}
          {timeFilter !== "ALL_TIMES" && (
            <div className="flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 p-3 px-4 text-xs font-bold text-primary">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" /> Showing prescriptions scheduled for <span className="uppercase">{timeFilter}</span> intake
              </span>
              <button onClick={() => setTimeFilter("ALL_TIMES")} className="hover:underline">Show all time slots ×</button>
            </div>
          )}

          {/* Prescription Tickets List */}
          {isLoading ? (
            <PageSkeleton type="list" />
          ) : isError ? (
            <Card className="rounded-3xl border-destructive/20">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <AlertCircle className="h-10 w-10 text-destructive mb-3" />
                <p className="font-bold text-lg">Failed to load prescriptions</p>
                <p className="text-sm text-muted-foreground mt-1">Please refresh the page to try again</p>
              </CardContent>
            </Card>
          ) : filteredMeds.length === 0 ? (
            <Card className="rounded-3xl border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
                  <Pill className="h-10 w-10 text-emerald-500/60" />
                </div>
                <h3 className="text-xl font-bold">No Medications in this Regimen</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                  {timeFilter !== "ALL_TIMES"
                    ? `You do not have any prescriptions assigned specifically to the ${timeFilter.toLowerCase()} slot.`
                    : "Upload your doctor's prescriptions and AI will automatically build your regimen."}
                </p>
                <Button onClick={() => setShowUpload(true)} className="mt-6 rounded-full px-6 font-semibold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
                  Upload Prescription PDF
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredMeds.map((med, idx) => {
                const schedule = getSchedule(med);
                const daysLeft = getDaysRemaining(med);
                const isLowRefill = daysLeft !== null && daysLeft <= 7 && daysLeft > 0;

                return (
                  <motion.div
                    key={med.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                  >
                    <div className={cn(
                      "group relative rounded-3xl border bg-card/90 backdrop-blur transition-all duration-200 hover:shadow-xl overflow-hidden",
                      med.isActive ? "border-border/60 hover:border-emerald-500/40" : "opacity-75 border-border/30 bg-muted/20"
                    )}>
                      {/* Left Accent Bar */}
                      <div className={cn(
                        "absolute top-0 bottom-0 left-0 w-2",
                        !med.isActive ? "bg-slate-400" : isLowRefill ? "bg-amber-500" : "bg-emerald-500"
                      )} />

                      <div className="p-6 pl-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        {/* Rx Info */}
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className={cn(
                            "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-sm border",
                            med.isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-muted text-muted-foreground border-border"
                          )}>
                            <Pill className="h-7 w-7" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <h3 className="text-lg font-bold truncate text-foreground">{med.name}</h3>
                              <Badge className={cn(
                                "text-[10px] font-extrabold rounded-full px-2.5 py-0.5",
                                med.isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                              )} variant="outline">
                                {med.isActive ? "ACTIVE REGIMEN" : "COMPLETED / HISTORY"}
                              </Badge>
                              {isLowRefill && (
                                <Badge variant="destructive" className="text-[10px] font-bold rounded-full px-2.5 py-0.5 animate-pulse">
                                  ⚠️ Low Refill: {daysLeft} Days Left
                                </Badge>
                              )}
                            </div>

                            <p className="text-sm font-semibold text-muted-foreground mt-1">
                              {med.dosage ? `Dosage: ${med.dosage}` : "Standard dosage"} {med.frequency ? `• ${med.frequency}` : ""}
                            </p>

                            {med.instructions && (
                              <p className="text-xs text-foreground/80 mt-2 bg-muted/50 p-2 rounded-xl border border-border/40 italic">
                                &quot;{med.instructions}&quot;
                              </p>
                            )}

                            <div className="flex items-center gap-4 mt-3 flex-wrap text-xs text-muted-foreground font-medium">
                              {med.prescribedBy && (
                                <span className="flex items-center gap-1.5">
                                  <User className="h-3.5 w-3.5 text-primary" /> Dr. {med.prescribedBy}
                                </span>
                              )}
                              {med.startDate && (
                                <span className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 text-primary" /> Started: {formatDate(med.startDate).split(",")[0]}
                                </span>
                              )}
                              {med.endDate && (
                                <span className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 text-amber-500" /> Ends: {formatDate(med.endDate).split(",")[0]}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Schedule Badges & Status Actions */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between lg:justify-end gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 border-border/40 shrink-0">
                          {/* Schedule Pills */}
                          <div className="flex items-center gap-2 bg-muted/40 p-2 rounded-2xl border border-border/40">
                            <div className={cn("flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-colors", schedule.morning ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30" : "opacity-30 text-muted-foreground")}>
                              <Sun className="h-3.5 w-3.5" /> Morn
                            </div>
                            <div className={cn("flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-colors", schedule.afternoon ? "bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30" : "opacity-30 text-muted-foreground")}>
                              <Sunset className="h-3.5 w-3.5" /> Aftn
                            </div>
                            <div className={cn("flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-colors", schedule.night ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30" : "opacity-30 text-muted-foreground")}>
                              <Moon className="h-3.5 w-3.5" /> Night
                            </div>
                          </div>

                          {/* Quick Toggle Button */}
                          <Button
                            variant={med.isActive ? "outline" : "secondary"}
                            size="sm"
                            className={cn(
                              "rounded-xl font-bold text-xs h-10 px-4 transition-all gap-2",
                              med.isActive ? "hover:border-destructive hover:text-destructive" : "hover:bg-emerald-600 hover:text-white"
                            )}
                            onClick={() => handleToggle(med.id, !med.isActive)}
                            disabled={toggleMutation.isPending}
                          >
                            {med.isActive ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-500" /> Mark Completed
                              </>
                            ) : (
                              <>
                                <RotateCcw className="h-3.5 w-3.5" /> Reactivate Rx
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Sidebar: Adherence & Pharmacy Refill Alerts */}
        <div className="xl:col-span-1 space-y-6">
          {/* Adherence Panel */}
          <Card className="rounded-3xl border-border/60 bg-gradient-to-b from-card to-card/60 shadow-sm overflow-hidden">
            <CardContent className="p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Adherence Score</h3>
              
              <div className="flex flex-col items-center justify-center text-center py-4">
                <div className="relative flex items-center justify-center">
                  <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
                    <circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/30" />
                    <circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" strokeWidth="10"
                      className="text-emerald-500 transition-all duration-1000"
                      strokeDasharray={2 * Math.PI * 48}
                      strokeDashoffset={2 * Math.PI * 48 - (adherencePercent / 100) * 2 * Math.PI * 48}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-foreground">{adherencePercent}%</span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">On Schedule</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                  You are tracking <span className="font-bold text-foreground">{activeMeds.length} active prescriptions</span> with excellent overall adherence.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t border-border/50 text-center">
                <div className="bg-muted/40 rounded-2xl p-3 border border-border/40">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Taken Daily</span>
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{todaySchedule.total} Doses</p>
                </div>
                <div className="bg-muted/40 rounded-2xl p-3 border border-border/40">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Completed Rx</span>
                  <p className="text-lg font-black text-foreground mt-0.5">{completedMeds.length} Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Refills Alert Card */}
          <Card className="rounded-3xl border-border/60 shadow-sm overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" /> Refill Reminders
                </h3>
              </div>

              {upcomingRefills.length > 0 ? (
                <div className="space-y-3">
                  {upcomingRefills.map((med) => (
                    <div key={med.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/40 hover:bg-muted/60 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <Pill className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate text-foreground">{med.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {med.endDate ? formatDate(med.endDate).split(",")[0] : "N/A"}
                          </p>
                        </div>
                      </div>
                      <Badge variant={med.daysLeft !== null && med.daysLeft <= 7 ? "destructive" : "outline"} className="text-[10px] font-bold shrink-0 ml-2">
                        {med.daysLeft}d left
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-xs">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                  No immediate refill actions required.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

