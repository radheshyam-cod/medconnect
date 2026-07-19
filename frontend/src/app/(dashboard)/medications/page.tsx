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
  AlertCircle,
  Plus,
  Calendar,
  Search,
  Filter,
  ChevronDown,
  Sun,
  Moon,
  Check,
  User,
  FileText,
  X,
  MoreVertical,
  Wand2,
} from "lucide-react";
import { PageSkeleton } from "@/components/premium/page-skeleton";
import { cn, formatDate } from "@/lib/utils";
import type { MedicationItem } from "@/lib/api-client";

type TabFilter = "ALL" | "ACTIVE" | "COMPLETED";

const MED_COLORS = [
  { bg: "bg-blue-500/10 dark:bg-blue-500/20", text: "text-blue-500", fill: "bg-blue-500" },
  { bg: "bg-emerald-500/10 dark:bg-emerald-500/20", text: "text-emerald-500", fill: "bg-emerald-500" },
  { bg: "bg-orange-500/10 dark:bg-orange-500/20", text: "text-orange-500", fill: "bg-orange-500" },
];

export default function MedicationsPage() {
  const [tab, setTab] = useState<TabFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [takenDoses, setTakenDoses] = useState<Record<string, Record<string, boolean>>>({});
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
    setOpenMenuId(null);
  };

  const toggleDose = (medId: string, time: 'morning' | 'afternoon' | 'night') => {
    setTakenDoses(prev => ({
      ...prev,
      [medId]: {
        ...prev[medId],
        [time]: !prev[medId]?.[time]
      }
    }));
  };

  const handleTimelineClick = (time: 'morning' | 'afternoon' | 'night') => {
    // Find the first untaken medication for this time, or if all taken, un-take the last one
    const eligibleMeds = activeMeds.filter(m => getSchedule(m)[time]);
    if (eligibleMeds.length === 0) return;

    const untakenMeds = eligibleMeds.filter(m => !takenDoses[m.id]?.[time]);
    if (untakenMeds.length > 0) {
      // Take the first untaken
      toggleDose(untakenMeds[0].id, time);
    } else {
      // Untake the last taken
      const takenMeds = eligibleMeds.filter(m => takenDoses[m.id]?.[time]);
      if (takenMeds.length > 0) {
        toggleDose(takenMeds[takenMeds.length - 1].id, time);
      }
    }
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

  const getDaysRemaining = (med: MedicationItem) => {
    if (!med.endDate) return null;
    return Math.max(0, Math.ceil((new Date(med.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  };

  const getSchedule = (med: MedicationItem) => {
    const freq = (med.frequency || "").toLowerCase();
    const instr = (med.instructions || "").toLowerCase();
    const combined = freq + " " + instr;
    
    let morning = combined.includes("morning") || combined.includes("breakfast") || combined.includes("bd") || combined.includes("twice") || combined.includes("thrice") || combined.includes("daily") || combined.includes("am");
    const afternoon = combined.includes("afternoon") || combined.includes("lunch") || combined.includes("thrice");
    const night = combined.includes("night") || combined.includes("dinner") || combined.includes("bedtime") || combined.includes("bd") || combined.includes("twice") || combined.includes("thrice") || combined.includes("pm");
    
    // Default to morning if no specific schedule could be parsed so it can be ticked
    if (!morning && !afternoon && !night) {
      morning = true;
    }
    
    return { morning, afternoon, night };
  };

  const upcomingRefills = useMemo(() =>
    activeMeds
      .filter(m => m.endDate)
      .map(m => ({ ...m, daysLeft: getDaysRemaining(m) }))
      .filter(m => m.daysLeft !== null && m.daysLeft > 0)
      .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0))
      .slice(0, 4),
    [activeMeds]
  );

  const todaySchedule = useMemo(() => {
    let morning = { total: 0, taken: 0 };
    let afternoon = { total: 0, taken: 0 };
    let night = { total: 0, taken: 0 };
    
    activeMeds.forEach(m => {
      const s = getSchedule(m);
      if (s.morning) {
        morning.total++;
        if (takenDoses[m.id]?.morning) morning.taken++;
      }
      if (s.afternoon) {
        afternoon.total++;
        if (takenDoses[m.id]?.afternoon) afternoon.taken++;
      }
      if (s.night) {
        night.total++;
        if (takenDoses[m.id]?.night) night.taken++;
      }
    });
    return { 
      morning, 
      afternoon, 
      night, 
      total: morning.total + afternoon.total + night.total,
      takenTotal: morning.taken + afternoon.taken + night.taken
    };
  }, [activeMeds, takenDoses]);

  const adherencePercent = todaySchedule.total > 0 ? Math.round((todaySchedule.takenTotal / todaySchedule.total) * 100) : 0;
  const missedPercent = todaySchedule.total > 0 ? 100 - adherencePercent : 0;

  return (
    <div className="space-y-6 pb-10 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Medications</h1>
          <p className="text-muted-foreground text-sm">Manage your prescriptions and stay on track</p>
        </div>
        <Button
          variant="outline"
          className="rounded-full font-semibold h-9 px-5 border-primary/20 text-primary hover:bg-primary/5"
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
          <Card className="rounded-3xl border-border/50 overflow-hidden shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-10">
                <h3 className="text-sm font-bold">Today&apos;s Medications</h3>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {todaySchedule.takenTotal} of {todaySchedule.total} taken
                </span>
              </div>

              <div className="relative mt-12 mb-6">
                {/* Horizontal Dashed Line */}
                <div className="absolute top-1/2 left-4 right-4 h-[2px] bg-border border-dashed border-t-2 -translate-y-1/2 z-0 opacity-50" />
                
                <div className="flex justify-between relative z-10">
                  {/* Morning */}
                  <div className="flex flex-col relative w-1/3 pl-4">
                    <div className="absolute -top-12 left-4 flex gap-2 items-center">
                      <Sun className="text-blue-500 h-5 w-5" />
                      <div>
                        <div className="text-xs font-bold leading-tight">Morning</div>
                        <div className="text-[10px] text-muted-foreground">{todaySchedule.morning.total} meds</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-12 relative">
                      <div className="text-[9px] font-bold text-blue-500 absolute -left-8 -bottom-0 translate-y-1/2">8:00 AM</div>
                      <div className="flex gap-4">
                        {Array.from({ length: Math.max(todaySchedule.morning.total, 1) }).map((_, i) => {
                          const isTaken = i < todaySchedule.morning.taken;
                          const isClickable = todaySchedule.morning.total > 0;
                          return (
                            <button 
                              key={i} 
                              type="button"
                              onClick={() => isClickable && handleTimelineClick('morning')}
                              className={cn(
                                "h-4 w-4 rounded-full flex items-center justify-center ring-4 ring-background relative z-10 transition-colors",
                                isTaken ? "bg-blue-500 text-white" : "bg-background border-2 border-border",
                                isClickable ? "cursor-pointer hover:scale-110" : ""
                              )}
                            >
                              {isTaken && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Afternoon */}
                  <div className="flex flex-col relative w-1/3 items-center">
                    <div className="absolute -top-12 flex gap-2 items-center -ml-12">
                      <Sun className="text-amber-500 h-5 w-5" />
                      <div>
                        <div className="text-xs font-bold leading-tight">Afternoon</div>
                        <div className="text-[10px] text-muted-foreground">{todaySchedule.afternoon.total} med</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-12 relative -ml-12">
                      <div className="text-[9px] font-bold text-amber-500 absolute -left-10 -bottom-0 translate-y-1/2">2:00 PM</div>
                      <div className="flex gap-4">
                        {todaySchedule.afternoon.total > 0 ? Array.from({ length: todaySchedule.afternoon.total }).map((_, i) => {
                          const isTaken = i < todaySchedule.afternoon.taken;
                          return (
                            <button 
                              key={i} 
                              type="button"
                              onClick={() => handleTimelineClick('afternoon')}
                              className={cn(
                                "h-4 w-4 rounded-full flex items-center justify-center ring-4 ring-background relative z-10 transition-colors cursor-pointer hover:scale-110",
                                isTaken ? "bg-amber-500 text-white" : "bg-background border-2 border-border"
                              )}
                            >
                              {isTaken && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                            </button>
                          );
                        }) : (
                          <div className="h-4 w-4 rounded-full bg-background border-2 border-border ring-4 ring-background relative z-10" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Night */}
                  <div className="flex flex-col relative w-1/3 items-end pr-4">
                    <div className="absolute -top-12 right-12 flex gap-2 items-center">
                      <Moon className="text-purple-500 h-5 w-5" />
                      <div>
                        <div className="text-xs font-bold leading-tight">Night</div>
                        <div className="text-[10px] text-muted-foreground">{todaySchedule.night.total} meds</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-12 relative right-12">
                      <div className="text-[9px] font-bold text-purple-500 absolute -left-10 -bottom-0 translate-y-1/2">8:00 PM</div>
                      <div className="flex gap-4">
                        {todaySchedule.night.total > 0 ? Array.from({ length: todaySchedule.night.total }).map((_, i) => {
                          const isTaken = i < todaySchedule.night.taken;
                          return (
                            <button 
                              key={i} 
                              type="button"
                              onClick={() => handleTimelineClick('night')}
                              className={cn(
                                "h-4 w-4 rounded-full flex items-center justify-center ring-4 ring-background relative z-10 transition-colors cursor-pointer hover:scale-110",
                                isTaken ? "bg-purple-500 text-white" : "bg-background border-2 border-border"
                              )}
                            >
                              {isTaken && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                            </button>
                          );
                        }) : (
                          <div className="h-4 w-4 rounded-full bg-background border-2 border-border ring-4 ring-background relative z-10" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <div className="flex items-center gap-8 border-b border-border/50 px-2">
            {([
              { value: "ALL" as TabFilter, label: "All Medications" },
              { value: "ACTIVE" as TabFilter, label: `Active (${activeMeds.length})` },
              { value: "COMPLETED" as TabFilter, label: `Completed (${completedMeds.length})` },
            ]).map(t => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={cn(
                  "pb-4 text-sm font-semibold transition-colors relative",
                  tab === t.value ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
                {tab === t.value && (
                  <motion.div layoutId="med-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
                )}
              </button>
            ))}
            
            {/* Search + Filter - Pushed to right */}
            <div className="ml-auto flex items-center gap-3 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search medications..."
                  className="flex h-9 w-[220px] rounded-full border border-border/60 bg-transparent pl-9 pr-8 text-xs focus-visible:outline-none focus-visible:border-primary placeholder:text-muted-foreground"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" className="rounded-full h-9 px-4 gap-2 font-semibold text-xs border-border/60 text-muted-foreground">
                <Filter className="h-3.5 w-3.5" /> Filter
              </Button>
              <Button variant="outline" size="sm" className="rounded-full h-9 px-4 gap-2 font-semibold text-xs border-border/60 text-muted-foreground">
                Active First <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Medication List */}
          {isLoading ? (
            <PageSkeleton type="list" />
          ) : isError ? (
            <Card className="rounded-3xl">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <AlertCircle className="h-10 w-10 text-destructive mb-3" />
                <p className="font-bold">Failed to load medications</p>
                <p className="text-sm text-muted-foreground mt-1">Please try again later</p>
              </CardContent>
            </Card>
          ) : filteredMeds.length === 0 ? (
            <Card className="rounded-3xl border-dashed border-2">
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
            <div className="space-y-4">
              {filteredMeds.map((med, idx) => {
                const schedule = getSchedule(med);
                const daysLeft = getDaysRemaining(med);
                
                let medTotalDoses = 0;
                let medTakenDoses = 0;
                if (schedule.morning) {
                  medTotalDoses++;
                  if (takenDoses[med.id]?.morning) medTakenDoses++;
                }
                if (schedule.afternoon) {
                  medTotalDoses++;
                  if (takenDoses[med.id]?.afternoon) medTakenDoses++;
                }
                if (schedule.night) {
                  medTotalDoses++;
                  if (takenDoses[med.id]?.night) medTakenDoses++;
                }
                
                const adherence = medTotalDoses > 0 ? Math.round((medTakenDoses / medTotalDoses) * 100) : 0;
                const circumference = 2 * Math.PI * 18;
                const strokeDashoffset = circumference - (adherence / 100) * circumference;
                const colorConfig = MED_COLORS[idx % MED_COLORS.length];

                return (
                  <motion.div
                    key={med.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className={cn(
                      "rounded-3xl border-border/40 overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md hover:border-border/60",
                      !med.isActive && "opacity-60"
                    )}>
                      <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-6">
                        
                        {/* Info Section */}
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          {/* Icon */}
                          <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shrink-0", colorConfig.bg)}>
                            <Pill className={cn("h-7 w-7", colorConfig.text)} />
                          </div>
                          
                          {/* Text */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-sm font-bold text-foreground truncate">{med.name}</h3>
                              <Badge className={cn(
                                "text-[9px] h-5 font-bold rounded-full px-2 border-none",
                                med.isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                              )}>
                                {med.isActive ? "Active" : "Completed"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              Take {med.dosage || "1 dose"} {med.frequency || ""} {med.instructions || ""}
                            </p>
                            <div className="flex items-center gap-4 mt-2.5 flex-wrap">
                              {med.prescribedBy && (
                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                                  <User className="h-3 w-3" /> Dr. {med.prescribedBy}
                                </span>
                              )}
                              {med.startDate && (
                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                                  <Calendar className="h-3 w-3" /> Prescribed on {formatDate(med.startDate).split(",")[0]}
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-[10px] text-blue-500 font-bold cursor-pointer hover:underline">
                                <FileText className="h-3 w-3" /> Prescription.pdf
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Schedule Section */}
                        <div className="flex items-center gap-6 shrink-0 md:border-l md:border-border md:pl-6">
                          {/* Morning */}
                          <div 
                            className={cn("flex items-center gap-2", schedule.morning && med.isActive && "cursor-pointer group")}
                            onClick={() => schedule.morning && med.isActive && toggleDose(med.id, 'morning')}
                          >
                            {schedule.morning ? (
                              <button 
                                type="button"
                                disabled={!med.isActive}
                                className={cn(
                                  "h-5 w-5 rounded-full flex items-center justify-center shrink-0 transition-colors",
                                  takenDoses[med.id]?.morning 
                                    ? "bg-blue-500 text-white"
                                    : "bg-blue-100 dark:bg-blue-900/30 text-transparent group-hover:border group-hover:border-blue-500"
                                )}
                              >
                                {takenDoses[med.id]?.morning && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                              </button>
                            ) : (
                              <div className="h-5 w-5 rounded-full border border-border shrink-0" />
                            )}
                            <div className="flex flex-col">
                               <span className="text-[10px] font-bold">Morning</span>
                               <span className={cn("text-[9px] font-bold", schedule.morning ? "text-blue-500" : "text-muted-foreground")}>
                                 {schedule.morning ? "1 tablet" : "-"}
                               </span>
                            </div>
                          </div>
                          
                          {/* Afternoon */}
                          <div 
                            className={cn("flex items-center gap-2", schedule.afternoon && med.isActive && "cursor-pointer group")}
                            onClick={() => schedule.afternoon && med.isActive && toggleDose(med.id, 'afternoon')}
                          >
                            {schedule.afternoon ? (
                              <button 
                                type="button"
                                disabled={!med.isActive}
                                className={cn(
                                  "h-5 w-5 rounded-full flex items-center justify-center shrink-0 transition-colors",
                                  takenDoses[med.id]?.afternoon 
                                    ? "bg-amber-500 text-white"
                                    : "bg-amber-100 dark:bg-amber-900/30 text-transparent group-hover:border group-hover:border-amber-500"
                                )}
                              >
                                {takenDoses[med.id]?.afternoon && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                              </button>
                            ) : (
                              <div className="h-5 w-5 rounded-full border border-border shrink-0" />
                            )}
                            <div className="flex flex-col">
                               <span className="text-[10px] font-bold">Afternoon</span>
                               <span className={cn("text-[9px] font-bold", schedule.afternoon ? "text-amber-500" : "text-muted-foreground")}>
                                 {schedule.afternoon ? "1 tablet" : "-"}
                               </span>
                            </div>
                          </div>
                          
                          {/* Night */}
                          <div 
                            className={cn("flex items-center gap-2", schedule.night && med.isActive && "cursor-pointer group")}
                            onClick={() => schedule.night && med.isActive && toggleDose(med.id, 'night')}
                          >
                            {schedule.night ? (
                              <button 
                                type="button"
                                disabled={!med.isActive}
                                className={cn(
                                  "h-5 w-5 rounded-full flex items-center justify-center shrink-0 transition-colors",
                                  takenDoses[med.id]?.night 
                                    ? "bg-purple-500 text-white"
                                    : "bg-purple-100 dark:bg-purple-900/30 text-transparent group-hover:border group-hover:border-purple-500"
                                )}
                              >
                                {takenDoses[med.id]?.night && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                              </button>
                            ) : (
                              <div className="h-5 w-5 rounded-full border border-border shrink-0" />
                            )}
                            <div className="flex flex-col">
                               <span className="text-[10px] font-bold">Night</span>
                               <span className={cn("text-[9px] font-bold", schedule.night ? "text-purple-500" : "text-muted-foreground")}>
                                 {schedule.night ? "1 tablet" : "-"}
                               </span>
                            </div>
                          </div>
                        </div>

                        {/* Progress and Details Section */}
                        <div className="flex items-center justify-between md:justify-start gap-4 shrink-0 md:border-l md:border-border md:pl-6 relative md:w-[220px]">
                          {/* Ring */}
                          <div className="relative h-11 w-11 flex items-center justify-center shrink-0">
                            <svg className="-rotate-90 w-full h-full" viewBox="0 0 44 44">
                              <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/30" />
                              <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="4"
                                className={med.isActive ? "text-blue-500" : "text-muted"}
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="absolute text-[10px] font-bold">{med.isActive ? `${adherence}%` : '0%'}</span>
                          </div>
                          
                          {/* Text info */}
                          <div className="flex flex-col justify-center min-w-0">
                            {daysLeft !== null && daysLeft > 0 ? (
                              <>
                                <span className="text-xs font-bold truncate">{daysLeft} days left</span>
                                <span className="text-[9px] text-muted-foreground font-medium truncate">
                                  {daysLeft * 2} of {(daysLeft + 20) * 2} pills
                                </span>
                                {med.endDate && (
                                  <span className="text-[9px] text-amber-500 font-bold mt-0.5 truncate">
                                    Refill by {formatDate(med.endDate).split(",")[0]}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-xs font-bold text-muted-foreground">Completed</span>
                            )}
                          </div>
                          
                          {/* More options menu */}
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 md:relative md:top-auto md:translate-y-0 md:ml-auto">
                             <div className="relative">
                               <button 
                                 onClick={() => setOpenMenuId(openMenuId === med.id ? null : med.id)}
                                 className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted/50 transition-colors"
                               >
                                 <MoreVertical className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer" />
                               </button>
                               {openMenuId === med.id && (
                                 <div className="absolute right-0 top-full mt-1 w-40 bg-popover rounded-xl shadow-lg border border-border/50 py-1 z-50 overflow-hidden">
                                    <button 
                                      className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-muted/50 transition-colors"
                                      onClick={() => handleToggle(med.id, !med.isActive)}
                                    >
                                      {med.isActive ? "Mark Completed" : "Mark Active"}
                                    </button>
                                 </div>
                               )}
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
        <div className="w-full xl:w-[320px] shrink-0 space-y-6">
          {/* Medication Adherence */}
          <Card className="rounded-3xl border-border/50 overflow-hidden shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold">Medication Adherence</h3>
                <span className="text-[10px] text-muted-foreground font-bold px-2 py-1 bg-muted rounded-full cursor-pointer hover:bg-muted/80">This Month ▾</span>
              </div>

              <div className="flex items-center gap-5">
                {/* Large circular progress */}
                <div className="relative shrink-0">
                  <svg width="90" height="90" viewBox="0 0 90 90" className="-rotate-90">
                    <circle cx="45" cy="45" r="36" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                    <circle cx="45" cy="45" r="36" fill="none" stroke="currentColor" strokeWidth="8"
                      className="text-primary"
                      strokeDasharray={2 * Math.PI * 36}
                      strokeDashoffset={2 * Math.PI * 36 - (adherencePercent / 100) * 2 * Math.PI * 36}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-black">{adherencePercent}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground mb-1">Great job!</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">You&apos;re on track with your medications.</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-border/50">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-muted-foreground mb-1">Taken</p>
                  <p className="text-sm font-black text-emerald-500">{adherencePercent}%</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-muted-foreground mb-1">Missed</p>
                  <p className="text-sm font-black text-red-500">{missedPercent}%</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-muted-foreground mb-1">Total</p>
                  <p className="text-sm font-black text-primary">{todaySchedule.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Refills */}
          <Card className="rounded-3xl border-border/50 overflow-hidden shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold">Upcoming Refills</h3>
                <Link href="/medications" className="text-[10px] font-bold text-primary hover:underline">View all</Link>
              </div>

              {upcomingRefills.length > 0 ? (
                <div className="space-y-5">
                  {upcomingRefills.map((med, idx) => {
                     const colorConfig = MED_COLORS[idx % MED_COLORS.length];
                     return (
                      <div key={med.id} className="flex items-center gap-3">
                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl shrink-0", colorConfig.bg)}>
                          <Pill className={cn("h-5 w-5", colorConfig.text)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{med.name}</p>
                          <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                            Refill by {med.endDate ? formatDate(med.endDate).split(",")[0] : "N/A"}
                          </p>
                        </div>
                        <span className={cn(
                          "text-[11px] font-bold shrink-0",
                          (med.daysLeft ?? 0) <= 7 ? "text-red-500" : (med.daysLeft ?? 0) <= 20 ? "text-emerald-500" : "text-blue-500"
                        )}>
                          {med.daysLeft} days
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">No upcoming refills</p>
              )}
            </CardContent>
          </Card>
          
          {/* Floating action button equivalent */}
          <div className="flex justify-end pt-4">
             <button className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                <Wand2 className="h-5 w-5" />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
