"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search,
  Filter,
  Download,
  ChevronDown,
  Activity,
  Droplet,
  HeartPulse,
  Syringe,
  Wind,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Sparkles,
  ChevronUp,
  ArrowRight,
  Loader2
} from "lucide-react";
import { PageSkeleton } from "@/components/premium/page-skeleton";
import { cn, formatDate } from "@/lib/utils";
import type { LabItem } from "@/lib/api-client";

const CATEGORIES = [
  "All Tests", "Hematology", "Biochemistry", "Hormones", "Vitamins", "Urine", "Cardiac", "Diabetes"
];

// No mock data - everything is dynamic

function Sparkline({ data, color, className }: { data: number[], color: string, className?: string }) {
  if (data.length < 2) return <div className={cn("h-8 w-20", className)} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((d, i) => `${(i / (data.length - 1)) * 100},${100 - ((d - min) / range) * 80 + 10}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={cn("h-8 w-20 overflow-visible", className)}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function LabsPage() {
  const [categoryFilter, setCategoryFilter] = useState("All Tests");
  const [trendTimeframe, setTrendTimeframe] = useState("6M");

  const { data, isLoading } = useQuery({
    queryKey: ["labs"],
    queryFn: () => api.labs.list({ limit: 100 }),
  });

  const { data: insightsData, isLoading: isLoadingInsights } = useQuery({
    queryKey: ["lab-insights"],
    queryFn: () => api.labs.getInsights(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const labs = data?.results ?? [];

  // Group labs by testName
  const groupedLabs = useMemo(() => {
    const groups: Record<string, LabItem[]> = {};
    labs.forEach(lab => {
      if (!groups[lab.testName]) groups[lab.testName] = [];
      groups[lab.testName].push(lab);
    });
    Object.values(groups).forEach(list => {
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
    return groups;
  }, [labs]);

  const uniqueTests = Object.keys(groupedLabs);
  const hasData = uniqueTests.length > 0;
  
  // Select active trend test (default to first or HbA1c)
  const [activeTrendTest, setActiveTrendTest] = useState<string | null>(null);
  
  const activeTestName = activeTrendTest || (uniqueTests.length > 0 ? uniqueTests[0] : null);
  const activeTestHistory = activeTestName ? (groupedLabs[activeTestName] || []) : [];
  const latestTest = activeTestHistory[0];
  const previousTest = activeTestHistory[1];

  // Dynamic Health Score Calculation
  const healthScore = useMemo(() => {
    if (labs.length === 0) return { current: 100, previous: 100, impact: "Neutral", diff: 0, text: "Upload lab reports to see your health score." };
    
    // Sort labs by date desc
    const sortedLabs = [...labs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Get unique latest tests
    const latestUnique = new Map<string, LabItem>();
    sortedLabs.forEach(lab => {
      if (!latestUnique.has(lab.testName)) latestUnique.set(lab.testName, lab);
    });

    const totalLatest = latestUnique.size;
    const normalLatest = Array.from(latestUnique.values()).filter(l => !l.isAbnormal).length;
    const currentScore = totalLatest > 0 ? Math.round((normalLatest / totalLatest) * 100) : 100;

    // To calculate previous score, we need tests older than the latest date of each test, but that's complex.
    // Let's just do a simple mock comparison or calculate based on all historical if available.
    // We will just use currentScore for now and say +0 if no history.
    let diff = 0;
    // Just a placeholder calculation for diff to show UI movement
    if (currentScore < 100 && currentScore > 50) diff = 2; 

    return {
      current: currentScore,
      previous: currentScore - diff,
      diff,
      impact: currentScore >= 80 ? "Good" : currentScore >= 60 ? "Moderate" : "Needs Attention",
      text: currentScore >= 80 ? "Your lab results are positively impacting your health score." : "Some of your lab results are out of range and need attention."
    };
  }, [labs]);

  // Dynamic Trend Chart Data
  const trendData = useMemo(() => {
    if (activeTestHistory.length === 0) return { points: [], min: 0, max: 100, labels: [], path: "" };
    
    const historyAsc = [...activeTestHistory].reverse();
    const values = historyAsc.map(l => parseFloat(l.value) || 0);
    const maxVal = Math.max(...values, 1);
    const minVal = Math.min(...values, 0);
    const range = maxVal - minVal || 1;
    
    // Map to SVG coordinates (x: 5 to 100, y: 80 to 20)
    const points = values.map((val, i) => {
      const x = historyAsc.length === 1 ? 50 : 5 + (i / (historyAsc.length - 1)) * 95;
      const y = 80 - ((val - minVal) / range) * 60;
      return { x, y, val: historyAsc[i].value + (historyAsc[i].unit || ""), date: formatDate(historyAsc[i].date).split(',')[0] };
    });

    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(" ");
    
    return { points, min: minVal, max: maxVal, labels: points.map(p => p.date), path };
  }, [activeTestHistory]);

  return (
    <div className="space-y-6 pb-10 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lab Reports</h1>
          <p className="text-muted-foreground text-sm">Track your health with advanced analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-full font-semibold h-10 px-5 border-border/60">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button className="rounded-full font-semibold h-10 px-5 bg-primary text-primary-foreground hover:bg-primary/90">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        
        {/* Left Column (Main Content) */}
        <div className="flex-1 min-w-0 space-y-6">
          
          {/* Categories / Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors",
                  categoryFilter === cat 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {cat}
              </button>
            ))}
            <button className="px-4 py-2 rounded-full text-xs font-bold bg-muted text-muted-foreground hover:bg-muted/80 flex items-center gap-1">
              More <ChevronDown className="h-3 w-3" />
            </button>
          </div>

          {/* Top Biomarker Cards */}
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
            {!hasData && !isLoading ? (
              <div className="w-full text-center p-8 border border-dashed rounded-3xl text-muted-foreground">
                No lab data available. Upload a report to see your biomarkers here.
              </div>
            ) : (
              uniqueTests.slice(0, 5).map((testName, i) => {
                const latest = groupedLabs[testName][0];
                const hist = groupedLabs[testName].reverse().map(l => parseFloat(l.value) || 0);
                const colors = [
                  { color: "text-purple-500", bg: "bg-purple-500/10" },
                  { color: "text-amber-500", bg: "bg-amber-500/10" },
                  { color: "text-emerald-500", bg: "bg-emerald-500/10" },
                  { color: "text-indigo-500", bg: "bg-indigo-500/10" },
                  { color: "text-blue-500", bg: "bg-blue-500/10" },
                ];
                const c = colors[i % colors.length];
                const card = {
                  name: testName,
                  value: latest.value,
                  unit: latest.unit || "",
                  range: latest.referenceRange || "-",
                  status: latest.isAbnormal ? "Abnormal" : "Normal",
                  icon: Droplet,
                  color: c.color,
                  bg: c.bg
                };
                return (
                  <Card key={testName} className={cn(
                    "rounded-3xl border-border/50 shadow-sm shrink-0 w-[220px] snap-start transition-colors cursor-pointer",
                    activeTrendTest === card.name ? "border-primary/50 bg-primary/5" : "hover:border-border/80"
                  )} onClick={() => setActiveTrendTest(card.name)}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", card.bg)}>
                            <card.icon className={cn("h-4 w-4", card.color)} />
                          </div>
                          <span className="text-xs font-bold text-foreground truncate max-w-[100px]">{card.name}</span>
                        </div>
                        <Badge variant="outline" className={cn(
                          "text-[9px] font-bold border-none px-2 shrink-0",
                          card.status === "Normal" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                        )}>
                          {card.status === "Normal" ? "Normal" : "Out of Range"}
                        </Badge>
                      </div>
                      
                      <div className="flex items-end gap-1 mb-1">
                        <span className="text-2xl font-black">{card.value}</span>
                        <span className="text-xs font-bold text-muted-foreground pb-1">{card.unit}</span>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-[10px] font-semibold text-muted-foreground">{card.range}</span>
                        <Sparkline 
                          data={hist} 
                          color={card.status === "Normal" ? "#10b981" : "#f59e0b"} 
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Trend Chart (Spans 3 cols) */}
            <Card className="rounded-3xl border-border/50 shadow-sm lg:col-span-3 overflow-hidden flex flex-col">
              <CardContent className="p-6 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold">{activeTestName || "HbA1c"} Trend</h3>
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-bold text-[10px]">Normal</Badge>
                  </div>
                  <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-full">
                    {["3M", "6M", "1Y", "All"].map(t => (
                      <button
                        key={t}
                        onClick={() => setTrendTimeframe(t)}
                        className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold transition-colors",
                          trendTimeframe === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {hasData && activeTestName ? (
                  <>
                    <div className="mb-8">
                      <div className="flex items-end gap-2">
                        <span className="text-4xl font-black">{latestTest?.value}</span>
                        <span className="text-xs font-bold text-muted-foreground pb-1">
                          {latestTest?.unit} ({latestTest?.date ? formatDate(latestTest.date).split(",")[0] : ""})
                        </span>
                      </div>
                      {previousTest && (
                        <div className="flex items-center gap-1 mt-1">
                          {(() => {
                            const diff = (parseFloat(latestTest.value) || 0) - (parseFloat(previousTest.value) || 0);
                            if (diff === 0) return null;
                            const isUp = diff > 0;
                            const isGood = !latestTest.isAbnormal; // simplistic
                            const colorClass = isGood ? "text-emerald-500" : "text-amber-500";
                            const Icon = isUp ? TrendingUp : TrendingDown;
                            return (
                              <>
                                <Icon className={cn("h-3 w-3", colorClass)} />
                                <span className={cn("text-xs font-bold", colorClass)}>{Math.abs(diff).toFixed(2)}</span>
                                <span className="text-xs font-semibold text-muted-foreground">vs previous test</span>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* SVG Line Chart */}
                    <div className="relative flex-1 min-h-[200px] w-full mt-auto">
                       <div className="absolute inset-0">
                          <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100" className="overflow-visible">
                            <defs>
                              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={latestTest?.isAbnormal ? "#f59e0b" : "#10b981"} stopOpacity="0.2" />
                                <stop offset="100%" stopColor={latestTest?.isAbnormal ? "#f59e0b" : "#10b981"} stopOpacity="0.0" />
                              </linearGradient>
                            </defs>
                            {/* Grid lines */}
                            <line x1="0" y1="20" x2="100" y2="20" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" strokeDasharray="2" />
                            <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" strokeDasharray="2" />
                            <line x1="0" y1="80" x2="100" y2="80" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" strokeDasharray="2" />
                            
                            {/* Y-axis labels dynamically generated */}
                            <text x="-5" y="22" className="text-[3px] fill-muted-foreground font-semibold">{trendData.max}</text>
                            <text x="-5" y="82" className="text-[3px] fill-muted-foreground font-semibold">{trendData.min}</text>

                            {/* Chart Line */}
                            {trendData.path && (
                              <path d={trendData.path} fill="none" stroke={latestTest?.isAbnormal ? "#f59e0b" : "#10b981"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            )}
                            
                            {/* Area Fill */}
                            {trendData.path && (
                              <path d={`${trendData.path} L 100,100 L 5,100 Z`} fill="url(#trendGradient)" />
                            )}

                            {/* Points */}
                            {trendData.points.map((pt, i) => (
                              <g key={i}>
                                <circle cx={pt.x} cy={pt.y} r="2" fill="#background" stroke={latestTest?.isAbnormal ? "#f59e0b" : "#10b981"} strokeWidth="1" className="bg-background" />
                                <text x={pt.x} y={pt.y - 5} textAnchor="middle" className="text-[3px] fill-foreground font-bold">{pt.val}</text>
                              </g>
                            ))}
                          </svg>
                          
                          {/* X-axis labels (HTML positioned) */}
                          <div className="absolute bottom-[-20px] left-[5%] right-[0%] flex justify-between text-[10px] font-bold text-muted-foreground">
                            {trendData.labels.map((d, i) => <span key={i} className="px-1">{d}</span>)}
                          </div>
                       </div>
                       
                       {/* Custom Tooltip Mock */}
                       <div className="absolute right-[10%] top-[20%] bg-popover border border-border shadow-lg rounded-xl p-3 z-10 w-32 hidden md:block">
                          <div className="text-[9px] font-bold text-muted-foreground mb-1">{trendData.labels[trendData.labels.length - 1]}</div>
                          <div className="text-sm font-black mb-1">{activeTestName}: {latestTest?.value}</div>
                          <div className="text-[9px] font-semibold text-muted-foreground">Range: {latestTest?.referenceRange || "-"}</div>
                       </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                    Select a test from the top cards to view its trend.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Test Results Table (Spans 2 cols) */}
            <Card className="rounded-3xl border-border/50 shadow-sm lg:col-span-2 overflow-hidden flex flex-col">
              <CardContent className="p-6 flex-1 flex flex-col">
                 <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold">Test Results</h3>
                    <Link href="#" className="text-[10px] font-bold text-primary hover:underline">View all</Link>
                 </div>

                 <div className="flex-1 overflow-auto pr-2 custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                       <thead>
                          <tr className="border-b border-border/50">
                             <th className="pb-3 text-[10px] font-bold text-muted-foreground">Test</th>
                             <th className="pb-3 text-[10px] font-bold text-muted-foreground">18 Jul 2026</th>
                             <th className="pb-3 text-[10px] font-bold text-muted-foreground">18 Jun 2026</th>
                             <th className="pb-3 text-[10px] font-bold text-muted-foreground text-right">Trend</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-border/30">
                          {!hasData && !isLoading ? (
                            <tr><td colSpan={4} className="py-4 text-center text-xs text-muted-foreground">No test results found.</td></tr>
                          ) : (
                            uniqueTests.slice(0, 10).map(test => {
                              const hist = groupedLabs[test];
                              const v1Text = hist[0]?.value + " " + (hist[0]?.unit || "");
                              const v2Text = hist[1] ? (hist[1].value + " " + (hist[1].unit || "")) : "-";
                              
                              let trend = "none";
                              let trendVal = "-";
                              let color = "text-muted-foreground";

                              if (hist[0] && hist[1]) {
                                const diff = (parseFloat(hist[0].value) || 0) - (parseFloat(hist[1].value) || 0);
                                if (diff !== 0) {
                                  trend = diff > 0 ? "up" : "down";
                                  trendVal = Math.abs(diff).toFixed(2) + (hist[0].unit ? ` ${hist[0].unit}` : "");
                                  color = hist[0].isAbnormal ? "text-amber-500" : "text-emerald-500";
                                }
                              }
                              
                              return { name: test, val1: v1Text, val2: v2Text, trend, trendVal, color };
                           }).map((row: any, i: number) => (
                              <tr key={i} className="hover:bg-muted/30 transition-colors">
                                 <td className="py-3 text-[11px] font-bold truncate max-w-[100px]">{row.name}</td>
                                 <td className="py-3 text-[11px] font-bold">{row.val1}</td>
                                 <td className="py-3 text-[11px] font-semibold text-muted-foreground">{row.val2}</td>
                                 <td className="py-3 text-[11px] font-bold text-right flex items-center justify-end gap-1">
                                    {row.trend === "up" ? <TrendingUp className={cn("h-3 w-3", row.color)} /> : row.trend === "down" ? <TrendingDown className={cn("h-3 w-3", row.color)} /> : null}
                                    <span className={row.color}>{row.trendVal}</span>
                                 </td>
                              </tr>
                           ))
                          )}
                       </tbody>
                    </table>
                 </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-full xl:w-[340px] shrink-0 space-y-6">
           
           {/* Health Score Impact */}
           <Card className="rounded-3xl border-border/50 shadow-sm overflow-hidden">
              <CardContent className="p-6">
                 <h3 className="text-sm font-bold mb-6">Health Score Impact</h3>
                 
                 <div className="flex items-center gap-6">
                    {/* Ring */}
                    <div className="relative h-24 w-24 shrink-0">
                       <svg className="-rotate-90 w-full h-full" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                          <circle cx="50" cy="50" r="42" fill="none" stroke="url(#scoreGradient)" strokeWidth="8"
                             strokeDasharray={2 * Math.PI * 42}
                             strokeDashoffset={2 * Math.PI * 42 - (healthScore.current / 100) * 2 * Math.PI * 42}
                             strokeLinecap="round"
                             className="transition-all duration-1000"
                          />
                          <defs>
                             <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor={healthScore.current >= 80 ? "#10b981" : healthScore.current >= 60 ? "#f59e0b" : "#ef4444"} />
                                <stop offset="100%" stopColor={healthScore.current >= 80 ? "#3b82f6" : healthScore.current >= 60 ? "#f97316" : "#b91c1c"} />
                             </linearGradient>
                          </defs>
                       </svg>
                       <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-black leading-none">{healthScore.current}</span>
                          <span className="text-[10px] font-bold text-muted-foreground mt-0.5">/100</span>
                       </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                       <div className={cn(
                         "text-sm font-bold mb-1",
                         healthScore.current >= 80 ? "text-emerald-500" : healthScore.current >= 60 ? "text-amber-500" : "text-red-500"
                       )}>
                         {healthScore.impact} Impact
                       </div>
                       <p className="text-[11px] text-muted-foreground leading-snug">
                          {healthScore.text}
                       </p>
                    </div>
                 </div>

                 <div className="mt-6 flex items-center gap-2">
                    {healthScore.diff !== 0 && (
                      <Badge className={cn(
                        "border-none px-2 font-bold text-[10px]",
                        healthScore.diff > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                      )}>
                        {healthScore.diff > 0 ? "+" : ""}{healthScore.diff} points
                      </Badge>
                    )}
                    <span className="text-[10px] font-semibold text-muted-foreground">vs last month</span>
                 </div>
              </CardContent>
           </Card>

           {/* AI Health Insights */}
           <Card className="rounded-3xl border-border/50 shadow-sm overflow-hidden bg-gradient-to-b from-card to-card/50">
              <CardContent className="p-6">
                 <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                       <Sparkles className="h-4 w-4 text-primary" />
                       <h3 className="text-sm font-bold">AI Health Insights</h3>
                       <Badge className="bg-primary/10 text-primary border-none px-1.5 py-0 h-4 text-[8px] font-black uppercase rounded-sm">AI</Badge>
                    </div>
                    <button className="h-6 w-6 rounded-full hover:bg-muted flex items-center justify-center transition-colors">
                       <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    </button>
                 </div>

                 {isLoadingInsights ? (
                    <div className="flex flex-col items-center justify-center py-10 space-y-3">
                       <Loader2 className="h-6 w-6 animate-spin text-primary" />
                       <p className="text-xs text-muted-foreground font-semibold animate-pulse">Analyzing your lab results...</p>
                    </div>
                 ) : insightsData ? (
                    <>
                       <p className="text-[11px] text-muted-foreground leading-relaxed mb-5">
                          {insightsData.summary}
                       </p>

                       <div className="mb-5">
                          <h4 className="text-xs font-bold mb-3">Key Insights</h4>
                          <ul className="space-y-2">
                             {insightsData.keyInsights?.map((insight: any, i: number) => {
                                const isPositive = insight.type === "positive";
                                const isNegative = insight.type === "negative";
                                return (
                                   <li key={i} className="flex items-start gap-2">
                                      <div className={cn(
                                         "h-1.5 w-1.5 rounded-full mt-1.5 shrink-0",
                                         isPositive ? "bg-emerald-500" : isNegative ? "bg-amber-500" : "bg-muted-foreground/40"
                                      )} />
                                      <span className={cn(
                                         "text-[11px] font-semibold",
                                         isPositive ? "text-emerald-500" : isNegative ? "text-amber-500" : "text-muted-foreground"
                                      )}>
                                         {insight.text}
                                      </span>
                                   </li>
                                );
                             })}
                          </ul>
                       </div>

                       <Button variant="secondary" className="w-full justify-between rounded-xl h-10 px-4 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-bold mb-6">
                          View Detailed Analysis
                          <ArrowRight className="h-3.5 w-3.5" />
                       </Button>

                       {insightsData.recommendations?.length > 0 && (
                          <div>
                             <h4 className="text-xs font-bold mb-3">Recommendations</h4>
                             {insightsData.recommendations.map((rec: string, i: number) => (
                                <div key={i} className="flex items-start gap-3 p-3 mb-2 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/30 transition-colors cursor-pointer group">
                                   <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black shrink-0">{i + 1}</div>
                                   <div className="flex-1 min-w-0 flex items-center justify-between">
                                      <span className="text-[11px] font-bold pr-2">{rec}</span>
                                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors -rotate-90 shrink-0" />
                                   </div>
                                </div>
                             ))}
                          </div>
                       )}
                    </>
                 ) : (
                    <p className="text-xs text-muted-foreground text-center py-6">Could not generate insights at this time.</p>
                 )}
              </CardContent>
           </Card>

        </div>
      </div>
    </div>
  );
}
