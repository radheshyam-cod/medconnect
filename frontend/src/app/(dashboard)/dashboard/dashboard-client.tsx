"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Pill, FlaskConical, Activity, ArrowRight, Sparkles,
  AlertCircle, Clock, TrendingUp, ChevronRight, Upload, Bot,
  X, MessageSquare, CheckCircle2, HeartPulse, ShieldAlert,
  Calendar, Sun, Droplets, Footprints, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardStats, useTimelineAISummary } from "@/hooks/use-dashboard";
import { useTimeline } from "@/hooks/use-timeline";
import { cn, formatDate } from "@/lib/utils";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { HealthScoreCard } from "@/components/premium/health-score-card";
import { EmergencyCard } from "@/components/premium/emergency-card";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useState } from "react";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 50;
  const h = 20;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });
  
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0 overflow-visible">
      <path d={`M ${points.join(" L ")}`} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MetricCard({
  title, value, subtitle, subtitleColor = "text-emerald-500", icon: Icon, colorClass, trendData, trendColor
}: any) {
  return (
    <div className="surface-card p-4 rounded-[1.2rem] flex flex-col justify-between h-[110px] relative overflow-hidden group cursor-pointer border border-border/40">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-lg", colorClass.bg)}>
            <Icon className={cn("h-4 w-4", colorClass.text)} />
          </div>
          <span className="text-sm font-semibold text-muted-foreground">{title}</span>
        </div>
      </div>
      <div className="flex items-end justify-between mt-2">
        <div>
          <div className="text-3xl font-bold text-foreground tabular-nums leading-none mb-1">{value}</div>
          <div className={cn("text-[10px] font-bold", subtitleColor)}>{subtitle}</div>
        </div>
        {trendData && <MiniSparkline data={trendData} color={trendColor} />}
      </div>
    </div>
  );
}


export function DashboardClient() {
  const { user } = useUser();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: aiSummary, isLoading: aiLoading } = useTimelineAISummary();
  const { data: timelineData } = useTimeline({ limit: 5 });
  const { data: medications } = useQuery({
    queryKey: ["medications", { isActive: true }],
    queryFn: () => api.medications.list({ isActive: true }),
    staleTime: 5 * 60 * 1000,
  });

  const events = (timelineData as any)?.events || [];
  const timelineEvents = Array.isArray(timelineData) ? timelineData : events;
  const patientProfile = (stats as any)?.patientProfile;
  const healthScore = (stats as any)?.healthScore ?? 0;
  const healthTrend = healthScore >= 80 ? "up" as const : healthScore >= 60 ? "stable" as const : "down" as const;

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } } };

  // AI Insights logic
  const recs = aiSummary?.recommendations || [];
  
  // Base generic positive recommendations if AI doesn't provide enough
  const genericRecs = [
    { title: "Keep it up", text: "Continue your current healthy routines.", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { title: "Stay active", text: "A 30-min daily walk improves cardiovascular health.", icon: Footprints, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Stay hydrated", text: "Drink adequate water throughout the day.", icon: Droplets, color: "text-cyan-500", bg: "bg-cyan-500/10" },
    { title: "Rest well", text: "Ensure 7-8 hours of sleep for optimal recovery.", icon: CheckCircle2, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  // Map AI recommendations and fallback to generic ones
  const insights = genericRecs.map((generic, i) => {
    if (recs[i]) {
      const text = recs[i];
      let icon = Sparkles;
      let color = "text-indigo-500";
      let bg = "bg-indigo-500/10";
      
      const lower = text.toLowerCase();
      if (lower.includes("water") || lower.includes("hydrat")) { icon = Droplets; color = "text-cyan-500"; bg = "bg-cyan-500/10"; }
      else if (lower.includes("walk") || lower.includes("exercis") || lower.includes("activ")) { icon = Footprints; color = "text-blue-500"; bg = "bg-blue-500/10"; }
      else if (lower.includes("sleep") || lower.includes("rest")) { icon = Sun; color = "text-purple-500"; bg = "bg-purple-500/10"; }
      else if (lower.includes("diet") || lower.includes("eat") || lower.includes("vitamin")) { icon = Activity; color = "text-amber-500"; bg = "bg-amber-500/10"; }
      else if (lower.includes("good") || lower.includes("normal") || lower.includes("continue")) { icon = CheckCircle2; color = "text-emerald-500"; bg = "bg-emerald-500/10"; }
      
      return {
        title: "AI Suggestion",
        text: text,
        icon, color, bg
      };
    }
    return generic;
  });

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-[1500px] mx-auto pb-24 px-2">
      {/* Header */}
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            {getGreeting()}, {user?.firstName || user?.fullName || "User"} <span className="text-2xl">👋</span>
          </h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Here&apos;s your health overview for today
          </p>
        </div>
        <Button variant="outline" className="rounded-xl h-10 border-primary/20 text-primary shadow-sm font-semibold hover:bg-primary/5 transition-colors" asChild>
          <Link href="/documents"><Upload className="h-4 w-4 mr-2" /> Upload Document</Link>
        </Button>
      </motion.div>

      {/* Row 1: Top Cards */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
        
        {/* Health Score */}
        <div className="lg:col-span-4 min-h-[260px]">
          <HealthScoreCard score={healthScore} trend={healthTrend} isLoading={statsLoading} />
        </div>

        {/* AI Health Summary */}
        <div className="lg:col-span-5 min-h-[260px] surface-card rounded-[1.5rem] border border-border/50 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-base font-bold text-foreground">AI Health Summary</h3>
              <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">AI Generated</span>
            </div>
            {aiLoading ? (
               <div className="space-y-2 mt-2"><div className="skeleton h-3 w-full"/><div className="skeleton h-3 w-5/6"/></div>
            ) : (
              <p className="text-sm text-foreground/80 leading-relaxed font-medium line-clamp-4">
                {aiSummary?.summary || "Your overall health is looking good! Your lab results are mostly in the normal range. Continue your current medications and maintain a healthy lifestyle."}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <div className="border border-border/40 rounded-lg px-3 py-1.5 bg-background">
              <p className="text-[10px] text-muted-foreground font-semibold">Blood Pressure</p>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Normal</p>
            </div>
            <div className="border border-border/40 rounded-lg px-3 py-1.5 bg-background">
              <p className="text-[10px] text-muted-foreground font-semibold">Blood Sugar</p>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Controlled</p>
            </div>
            <div className="border border-border/40 rounded-lg px-3 py-1.5 bg-background">
              <p className="text-[10px] text-muted-foreground font-semibold">Cholesterol</p>
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400">Borderline</p>
            </div>
          </div>
          <Link href="/timeline" className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mt-1">
            View full AI summary <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Emergency Access */}
        <div className="lg:col-span-3 min-h-[260px]">
          <EmergencyCard
            bloodGroup={patientProfile?.bloodGroup}
            allergies={patientProfile?.allergies}
          />
        </div>
      </motion.div>

      {/* Row 2: Metric Cards */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <MetricCard
          title="Documents" value={stats?.totalDocuments ?? 3} subtitle={`+${stats?.documentsThisMonth ?? 1} this month`}
          icon={FileText} colorClass={{ bg: "bg-blue-500/10", text: "text-blue-500" }}
          trendData={[1, 2, 2.5, 2, 4, 3]} trendColor="#3b82f6"
        />
        <MetricCard
          title="Active Medications" value={stats?.activeMedications ?? 5} subtitle={`${stats?.upcomingRemindersToday ?? 2} due today`} subtitleColor="text-amber-500"
          icon={Pill} colorClass={{ bg: "bg-emerald-500/10", text: "text-emerald-500" }}
          trendData={[5, 5, 4, 5, 5]} trendColor="#10b981"
        />
        <MetricCard
          title="Lab Results" value={stats?.totalLabResults ?? 27} subtitle="+3 this month"
          icon={FlaskConical} colorClass={{ bg: "bg-purple-500/10", text: "text-purple-500" }}
          trendData={[10, 15, 12, 18, 22, 27]} trendColor="#a855f7"
        />
      </motion.div>

      {/* Row 3: Complex Widgets */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        
        {/* Recent Labs */}
        <div className="surface-card rounded-[1.5rem] border border-border/50 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-foreground">Recent Labs</h3>
            <Link href="/labs" className="text-xs font-bold text-primary hover:underline">View all</Link>
          </div>
          <div className="flex-1 space-y-4">
            {statsLoading ? Array(4).fill(0).map((_,i) => <div key={i} className="skeleton h-10 w-full" />) : 
              (stats?.recentLabResults?.length ? stats.recentLabResults.slice(0, 4) : [
                { id: 1, testName: "HbA1c", date: "2026-07-18T00:00:00Z", value: "5.6", unit: "%", range: "4.0 - 5.6%", isAbnormal: false, sparkColor: "#10b981" },
                { id: 2, testName: "Fasting Blood Sugar", date: "2026-07-18T00:00:00Z", value: "92", unit: "mg/dL", range: "70 - 99", isAbnormal: false, sparkColor: "#10b981" },
                { id: 3, testName: "Cholesterol", date: "2026-07-18T00:00:00Z", value: "198", unit: "mg/dL", range: "< 200", isAbnormal: false, sparkColor: "#f59e0b" },
                { id: 4, testName: "Vitamin D", date: "2026-07-10T00:00:00Z", value: "28", unit: "ng/mL", range: "30 - 100", isAbnormal: true, sparkColor: "#ef4444" },
              ]).map((lab: any) => {
                const isWarning = lab.isAbnormal || lab.testName === "Cholesterol";
                const sparkColor = lab.sparkColor || (lab.isAbnormal ? "#ef4444" : "#10b981");
                const trendData = [
                   parseFloat(lab.value)*0.9, parseFloat(lab.value)*1.1, parseFloat(lab.value)*1.05, parseFloat(lab.value)
                ];
                return (
                  <div key={lab.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 w-1/2">
                      <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex flex-shrink-0 items-center justify-center">
                        <FlaskConical className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{lab.testName}</p>
                        <p className="text-[10px] text-muted-foreground font-medium">{formatDate(lab.date)}</p>
                      </div>
                    </div>
                    <div className="w-1/4">
                      <p className={cn("text-sm font-bold tabular-nums", lab.isAbnormal && "text-red-600 dark:text-red-400")}>
                        {lab.value} <span className="text-[10px] text-muted-foreground">{lab.unit}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium">{lab.referenceRange || lab.range || "Standard"}</p>
                    </div>
                    <div className="w-1/4 flex justify-end">
                      <MiniSparkline data={trendData} color={sparkColor} />
                    </div>
                  </div>
                );
              })
            }
          </div>
          <Link href="/labs" className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mt-6">
            View full lab reports <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Medication Reminders */}
        <div className="surface-card rounded-[1.5rem] border border-border/50 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-foreground">Medication Reminders</h3>
            <Link href="/medications" className="text-xs font-bold text-primary hover:underline">View all</Link>
          </div>
          
          <div className="flex-1 flex items-center gap-6">
            {/* Adherence Donut */}
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
              <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" className="opacity-30" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="8" strokeLinecap="round" strokeDasharray="251.2" strokeDashoffset={251.2 * 0.2} />
              </svg>
              <div className="relative z-10 flex flex-col items-center">
                <span className="text-xl font-extrabold text-foreground">80%</span>
              </div>
              <div className="absolute -bottom-4 text-center w-[120px]">
                 <span className="text-[10px] text-muted-foreground font-semibold">Adherence this week</span>
              </div>
            </div>

            {/* Checklist */}
            <div className="flex-1 space-y-4 pt-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Today&apos;s Schedule</p>
              
              <div className="flex items-start gap-3">
                <div className="mt-0.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /></div>
                <div>
                  <p className="text-sm font-bold text-foreground">Domperidone 10mg</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Before Breakfast</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="mt-0.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /></div>
                <div>
                  <p className="text-sm font-bold text-foreground">Metformin 500mg SR</p>
                  <p className="text-[10px] text-muted-foreground font-medium">After Lunch</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                <div>
                  <p className="text-sm font-bold text-foreground">Telmisartan 40mg</p>
                  <p className="text-[10px] text-muted-foreground font-medium">After Dinner</p>
                </div>
              </div>
            </div>
          </div>

          <Link href="/medications" className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mt-8 justify-center">
            View all medications <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Health Timeline Preview */}
        <div className="surface-card rounded-[1.5rem] border border-border/50 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-foreground">Health Timeline Preview</h3>
            <Link href="/timeline" className="text-xs font-bold text-primary hover:underline">View all</Link>
          </div>
          
          <div className="flex-1 relative">
            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-border/60" />
            
            <div className="space-y-6">
               <div className="relative flex gap-4">
                 <div className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center relative z-10 shrink-0">
                    <FlaskConical className="h-4 w-4 text-emerald-600" />
                 </div>
                 <div className="flex-1 pb-2">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                         <span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded-md">Lab Test</span>
                         <span className="text-[10px] text-muted-foreground font-medium">18 Jul 2026</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-start">
                       <p className="text-sm font-bold text-foreground">Electrolyte Panel Analysis</p>
                       <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">Normal</span>
                    </div>
                 </div>
               </div>

               <div className="relative flex gap-4">
                 <div className="h-8 w-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center relative z-10 shrink-0">
                    <FileText className="h-4 w-4 text-blue-600" />
                 </div>
                 <div className="flex-1 pb-2">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                         <span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded-md">Visit</span>
                         <span className="text-[10px] text-muted-foreground font-medium">18 Jul 2026</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-start">
                       <p className="text-sm font-bold text-foreground">Consultation for headache</p>
                       <span className="text-[10px] font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full">Mild</span>
                    </div>
                 </div>
               </div>

               <div className="relative flex gap-4">
                 <div className="h-8 w-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center relative z-10 shrink-0">
                    <Activity className="h-4 w-4 text-amber-600" />
                 </div>
                 <div className="flex-1 pb-2">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                         <span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded-md">Procedure</span>
                         <span className="text-[10px] text-muted-foreground font-medium">18 Jul 2026</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-start">
                       <p className="text-sm font-bold text-foreground">Recommended Follow-up Tests</p>
                       <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">Pending</span>
                    </div>
                 </div>
               </div>
            </div>
          </div>
          
          <Link href="/timeline" className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mt-4">
            View full timeline <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

      </motion.div>

      {/* Row 4: AI Insights */}
      <motion.div variants={item} className="surface-card rounded-[1.5rem] border border-border/50 p-6">
         <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">AI Insights</h3>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {insights.map((insight, i) => {
              const Icon = insight.icon;
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5", insight.bg)}>
                    <Icon className={cn("h-4 w-4", insight.color)} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground mb-1">{insight.title}</h4>
                    <p className="text-[11px] text-muted-foreground leading-snug pr-4">{insight.text}</p>
                  </div>
                </div>
              );
            })}
         </div>
      </motion.div>
      

    </motion.div>
  );
}
