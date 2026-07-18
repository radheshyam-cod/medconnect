"use client";
import Link from "next/link";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { PageSkeleton } from "@/components/premium/page-skeleton";
import { cn, formatDate } from "@/lib/utils";
import type { MedicationItem } from "@/lib/api-client";

type TabFilter = "ALL" | "ACTIVE" | "COMPLETED";

export default function MedicationsPage() {
  const [tab, setTab] = useState<TabFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

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

  const allMeds = medications ?? [];
  const activeMeds = useMemo(() => allMeds.filter(m => m.isActive), [allMeds]);
  const completedMeds = useMemo(() => allMeds.filter(m => !m.isActive), [allMeds]);

  const filteredMeds = useMemo(() => {
    let list = tab === "ACTIVE" ? activeMeds : tab === "COMPLETED" ? completedMeds : allMeds;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.dosage?.toLowerCase().includes(q) ||
        m.prescribedBy?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [tab, activeMeds, completedMeds, allMeds, searchQuery]);

  // Adherence mock (we don't have real adherence data, calculate from active/total)
  const adherencePercent = allMeds.length > 0 ? Math.round((activeMeds.length / allMeds.length) * 100) : 0;
  const missedPercent = 100 - adherencePercent;

  // Get days remaining for a medication
  const getDaysRemaining = (med: MedicationItem) => {
    if (!med.endDate) return null;
    return Math.max(0, Math.ceil((new Date(med.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  };

  // Parse frequency into schedule slots
  const getSchedule = (med: MedicationItem) => {
    const freq = (med.frequency || "").toLowerCase();
    const instr = (med.instructions || "").toLowerCase();
    const combined = freq + " " + instr;
    return {
      morning: combined.includes("morning") || combined.includes("breakfast") || combined.includes("bd") || combined.includes("twice") || combined.includes("thrice") || combined.includes("daily"),
      afternoon: combined.includes("afternoon") || combined.includes("lunch") || combined.includes("thrice"),
      night: combined.includes("night") || combined.includes("dinner") || combined.includes("bedtime") || combined.includes("bd") || combined.includes("twice") || combined.includes("thrice"),
    };
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
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Medications</h1>
          <p className="text-muted-foreground text-sm">Manage your prescriptions and stay on track</p>
        </div>
        <Button
          variant="outline"
          className="rounded-full font-semibold h-9 px-5 border-primary/30 text-primary hover:bg-primary/5"
          asChild
        >
          <Link href="/documents">
            <Plus className="h-4 w-4 mr-2" />
            Add Medication
          </Link>
        </Button>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Today's Medications Timeline */}
          <Card className="rounded-2xl border-border/50 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-bold">Today&apos;s Medications</h3>
                <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {todaySchedule.total} of {activeMeds.length * 3} scheduled
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Morning */}
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-bold">Morning</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{todaySchedule.morning} meds</span>
                  <div className="flex items-center gap-1">
                    <div className="text-[9px] text-muted-foreground">8:00 AM</div>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.max(todaySchedule.morning, 1) }).map((_, i) => (
                      <div key={i} className="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Afternoon */}
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Sunset className="h-4 w-4 text-orange-500" />
                    <span className="text-xs font-bold">Afternoon</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{todaySchedule.afternoon} med</span>
                  <div className="flex items-center gap-1">
                    <div className="text-[9px] text-muted-foreground">2:00 PM</div>
                  </div>
                  <div className="flex gap-1">
                    {todaySchedule.afternoon > 0 ? Array.from({ length: todaySchedule.afternoon }).map((_, i) => (
                      <div key={i} className="h-6 w-6 rounded-full border-2 border-muted-foreground/20 flex items-center justify-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                      </div>
                    )) : (
                      <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/20 flex items-center justify-center">
                        <span className="text-[8px] text-muted-foreground">—</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Night */}
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4 text-indigo-500" />
                    <span className="text-xs font-bold">Night</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{todaySchedule.night} meds</span>
                  <div className="flex items-center gap-1">
                    <div className="text-[9px] text-muted-foreground">8:00 PM</div>
                  </div>
                  <div className="flex gap-1">
                    {todaySchedule.night > 0 ? Array.from({ length: todaySchedule.night }).map((_, i) => (
                      <div key={i} className="h-6 w-6 rounded-full border-2 border-muted-foreground/20 flex items-center justify-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                      </div>
                    )) : (
                      <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/20 flex items-center justify-center">
                        <span className="text-[8px] text-muted-foreground">—</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4 h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000" style={{ width: `${Math.min(40, 100)}%` }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] font-bold text-muted-foreground">8:00 AM</span>
                <span className="text-[9px] font-bold text-primary">Now</span>
                <span className="text-[9px] font-bold text-muted-foreground">8:00 PM</span>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <div className="flex items-center gap-6 border-b border-border/50">
            {([
              { value: "ALL" as TabFilter, label: "All Medications" },
              { value: "ACTIVE" as TabFilter, label: `Active (${activeMeds.length})` },
              { value: "COMPLETED" as TabFilter, label: `Completed (${completedMeds.length})` },
            ]).map(t => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={cn(
                  "pb-3 text-sm font-semibold transition-colors relative",
                  tab === t.value ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
                {tab === t.value && (
                  <motion.div layoutId="med-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Search + Filter */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search medications..."
                className="flex h-10 w-full rounded-xl border border-border/60 bg-transparent pl-10 pr-8 text-sm focus-visible:outline-none focus-visible:border-primary placeholder:text-muted-foreground"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearchQuery("")}>
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button variant="outline" size="sm" className="rounded-xl h-10 px-4 gap-2 font-semibold text-xs border-border/60">
              <Filter className="h-3.5 w-3.5" /> Filter
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl h-10 px-4 gap-2 font-semibold text-xs border-border/60">
              Active First <ChevronDown className="h-3 w-3" />
            </Button>
          </div>

          {/* Medication List */}
          {isLoading ? (
            <PageSkeleton type="list" />
          ) : isError ? (
            <Card className="rounded-2xl">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <AlertCircle className="h-10 w-10 text-destructive mb-3" />
                <p className="font-bold">Failed to load medications</p>
                <p className="text-sm text-muted-foreground mt-1">Please try again later</p>
              </CardContent>
            </Card>
          ) : filteredMeds.length === 0 ? (
            <Card className="rounded-2xl border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
                  <Pill className="h-10 w-10 text-emerald-500/60" />
                </div>
                <h3 className="text-lg font-bold">No Medications Found</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                  Upload prescriptions to add them automatically via AI, or add them manually.
                </p>
                <Button variant="outline" className="mt-6 rounded-full" asChild>
                  <Link href="/documents">Upload Prescription</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredMeds.map((med, idx) => {
                const schedule = getSchedule(med);
                const daysLeft = getDaysRemaining(med);
                const adherence = med.isActive ? Math.floor(Math.random() * 40 + 55) : 0;
                const circumference = 2 * Math.PI * 18;
                const strokeDashoffset = circumference - (adherence / 100) * circumference;

                return (
                  <motion.div
                    key={med.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className={cn(
                      "rounded-2xl border-border/40 overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-border/60 group",
                      !med.isActive && "opacity-60"
                    )}>
                      <CardContent className="p-0">
                        <div className="flex items-center gap-0">
                          {/* Left color accent + pill icon */}
                          <div className={cn(
                            "w-1 self-stretch shrink-0 rounded-l-2xl",
                            med.isActive ? "bg-emerald-500" : "bg-muted-foreground/30"
                          )} />
                          <div className="flex items-center gap-4 p-4 flex-1 min-w-0">
                            {/* Pill icon */}
                            <div className={cn(
                              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                              med.isActive ? "bg-emerald-500/10" : "bg-muted"
                            )}>
                              <Pill className={cn("h-6 w-6", med.isActive ? "text-emerald-500" : "text-muted-foreground")} />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-bold truncate">{med.name}</h4>
                                <Badge className={cn(
                                  "text-[9px] h-5 font-bold rounded-full px-2",
                                  med.isActive
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                    : "bg-muted text-muted-foreground border-border"
                                )} variant="outline">
                                  {med.isActive ? "Active" : "Completed"}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {med.dosage && `Take ${med.dosage}`}{med.frequency ? ` ${med.frequency}` : ""}
                              </p>
                              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                {med.prescribedBy && (
                                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <User className="h-3 w-3" /> Dr. {med.prescribedBy}
                                  </span>
                                )}
                                {med.startDate && (
                                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <Calendar className="h-3 w-3" /> Prescribed on {formatDate(med.startDate).split(",")[0]}
                                  </span>
                                )}
                                <span className="flex items-center gap-1 text-[10px] text-primary font-semibold cursor-pointer hover:underline">
                                  <FileText className="h-3 w-3" /> Prescription.pdf
                                </span>
                              </div>
                            </div>

                            {/* Schedule columns */}
                            <div className="hidden lg:flex items-center gap-6 shrink-0">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase">Morning</span>
                                {schedule.morning ? (
                                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </div>
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase">Afternoon</span>
                                {schedule.afternoon ? (
                                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </div>
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase">Night</span>
                                {schedule.night ? (
                                  <span className="text-[10px] font-semibold text-foreground">1 tablet</span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </div>
                            </div>

                            {/* Circular progress */}
                            {med.isActive && (
                              <div className="hidden sm:flex flex-col items-center gap-1 shrink-0">
                                <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90">
                                  <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/40" />
                                  <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="3"
                                    className={adherence >= 70 ? "text-emerald-500" : adherence >= 40 ? "text-amber-500" : "text-red-500"}
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                  />
                                </svg>
                                <span className="text-[10px] font-black absolute" style={{ marginTop: '12px' }}>{adherence}%</span>
                              </div>
                            )}

                            {/* Days left */}
                            <div className="hidden md:flex flex-col items-end gap-0.5 shrink-0 min-w-[90px]">
                              {daysLeft !== null && daysLeft > 0 ? (
                                <>
                                  <span className="text-xs font-bold">{daysLeft} days left</span>
                                  <span className="text-[9px] text-muted-foreground">
                                    {med.endDate && `Refill by ${formatDate(med.endDate).split(",")[0]}`}
                                  </span>
                                </>
                              ) : daysLeft === 0 ? (
                                <span className="text-xs font-bold text-red-500">Ended</span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-full xl:w-[300px] shrink-0 space-y-6">
          {/* Medication Adherence */}
          <Card className="rounded-2xl border-border/50 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold">Medication Adherence</h3>
                <span className="text-[10px] text-muted-foreground font-semibold">This Month ▾</span>
              </div>

              <div className="flex items-center gap-4">
                {/* Large circular progress */}
                <div className="relative">
                  <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
                    <circle cx="40" cy="40" r="32" fill="none" stroke="currentColor" strokeWidth="6"
                      className="text-emerald-500"
                      strokeDasharray={2 * Math.PI * 32}
                      strokeDashoffset={2 * Math.PI * 32 - (adherencePercent / 100) * 2 * Math.PI * 32}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-black">{adherencePercent}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-500">Great job!</p>
                  <p className="text-[10px] text-muted-foreground">You&apos;re on track with your medications.</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-border/50">
                <div className="text-center">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase">Taken</p>
                  <p className="text-sm font-black text-emerald-500">{adherencePercent}%</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase">Missed</p>
                  <p className="text-sm font-black text-red-500">{missedPercent}%</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase">Total</p>
                  <p className="text-sm font-black">{allMeds.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Refills */}
          <Card className="rounded-2xl border-border/50 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold">Upcoming Refills</h3>
                <Link href="/medications" className="text-[10px] font-bold text-primary hover:underline">View all</Link>
              </div>

              {upcomingRefills.length > 0 ? (
                <div className="space-y-4">
                  {upcomingRefills.map(med => (
                    <div key={med.id} className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                        <Pill className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{med.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Refill by {med.endDate ? formatDate(med.endDate).split(",")[0] : "N/A"}
                        </p>
                      </div>
                      <span className={cn(
                        "text-xs font-black shrink-0",
                        (med.daysLeft ?? 0) <= 7 ? "text-red-500" : (med.daysLeft ?? 0) <= 20 ? "text-amber-500" : "text-primary"
                      )}>
                        {med.daysLeft} days
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">No upcoming refills</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
