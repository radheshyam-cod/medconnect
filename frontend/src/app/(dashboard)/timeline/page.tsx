"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Download,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FlaskConical,
  Hospital,
  Pill,
  Microscope,
  Syringe,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TimelineCard } from "@/components/premium/timeline-card";
import { PageSkeleton } from "@/components/premium/page-skeleton";
import { motion } from "framer-motion";

const EVENT_TYPES = [
  { value: "", label: "All Events" },
  { value: "VISIT", label: "Visits" },
  { value: "DIAGNOSIS", label: "Diagnoses" },
  { value: "MEDICATION", label: "Medications" },
  { value: "LAB_TEST", label: "Lab Tests" },
  { value: "PROCEDURE", label: "Procedures" },
] as const;

const MORE_EVENT_TYPES = [
  { value: "IMAGING", label: "Imaging" },
  { value: "VACCINATION", label: "Vaccinations" },
  { value: "ALLERGY", label: "Allergies" },
  { value: "HOSPITALIZATION", label: "Hospitalizations" },
  { value: "SURGERY", label: "Surgeries" },
  { value: "OTHER", label: "Other" },
] as const;

// Simple SVG sparkline component
const Sparkline = ({ color, data }: { color: string; data: number[] }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((val - min) / range) * 100;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="w-full h-8 mt-4 overflow-hidden relative">
       <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full absolute inset-0">
         <defs>
           <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
             <stop offset="0%" stopColor={color} stopOpacity="0.2" />
             <stop offset="100%" stopColor={color} stopOpacity="0" />
           </linearGradient>
         </defs>
         <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
         <polygon points={`0,100 ${points} 100,100`} fill={`url(#grad-${color})`} />
       </svg>
    </div>
  );
};

export default function TimelinePage() {
  const [eventFilter, setEventFilter] = useState("");
  const [page, setPage] = useState(1);
  const [insightsExpanded, setInsightsExpanded] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  
  // Calendar State
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const { data, isLoading, isError } = useQuery({
    queryKey: ["timeline", { eventType: eventFilter || undefined, page, limit: 50 }],
    queryFn: () => api.timeline.list({ eventType: eventFilter || undefined, page, limit: 50 }),
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["timeline-summary"],
    queryFn: () => api.timeline.getSummary(),
  });

  const { data: aiSummary, isLoading: aiSummaryLoading } = useQuery({
    queryKey: ["timeline-ai-summary"],
    queryFn: () => api.timeline.getAISummary(),
  });

  const events = data?.events ?? [];

  // Sort events newest first
  const filteredEvents = useMemo(() => {
    return [...events].sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
  }, [events]);

  // Group events by Year only
  const groupedTimeline = useMemo(() => {
    const grouped: Record<string, typeof events> = {};
    filteredEvents.forEach(event => {
      const year = new Date(event.eventDate).getFullYear().toString();
      if (!grouped[year]) grouped[year] = [];
      grouped[year].push(event);
    });
    return grouped;
  }, [filteredEvents]);

  const sortedYears = Object.keys(groupedTimeline).sort((a, b) => parseInt(b) - parseInt(a));

  // Calendar calculations
  const daysInMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay();
  const daysInPrevMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 0).getDate();
  
  const prevMonthPadding = Array.from({ length: firstDayOfMonth }, (_, i) => daysInPrevMonth - firstDayOfMonth + i + 1);
  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const monthName = calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const scrollToBottom = () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });

  return (
    <div className="max-w-[1400px] mx-auto pb-24 px-4 lg:px-8 flex flex-col xl:flex-row gap-8 relative">
      
      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-50">
        <button onClick={scrollToTop} className="h-10 w-10 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors rounded-full flex items-center justify-center shadow-sm">
          <ArrowUp className="h-5 w-5" />
        </button>
        <button onClick={scrollToBottom} className="h-12 w-12 bg-primary text-white hover:bg-primary/90 transition-colors rounded-full flex items-center justify-center shadow-lg">
          <ArrowDown className="h-6 w-6" />
        </button>
      </div>

      {/* Main Content (Left Column) */}
      <div className="flex-1 min-w-0 xl:max-w-4xl">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Health Timeline</h1>
            <p className="text-sm font-medium text-muted-foreground mt-1">
              Your complete medical journey in chronological order
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="rounded-xl h-9 border-border/60 shadow-sm text-xs font-semibold" onClick={() => window.print()}>
              <Download className="h-3.5 w-3.5 mr-2" /> Export
            </Button>
            <Button className="rounded-xl h-9 shadow-sm text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground">
              <Filter className="h-3.5 w-3.5 mr-2" /> Filters
            </Button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-none mb-4 items-center">
          {EVENT_TYPES.map((type) => (
             <button
               key={type.value}
               onClick={() => { setEventFilter(type.value); setPage(1); setIsMoreOpen(false); }}
               className={cn(
                 "px-4 py-2 rounded-full text-xs font-bold transition-colors whitespace-nowrap",
                 eventFilter === type.value 
                   ? "bg-primary text-primary-foreground" 
                   : "bg-muted/50 text-foreground hover:bg-muted"
               )}
             >
               {type.label}
             </button>
          ))}
          
          <div className="relative">
            <button 
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-1 transition-colors",
                MORE_EVENT_TYPES.some(t => t.value === eventFilter)
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted/50 text-foreground hover:bg-muted"
              )}
            >
              {MORE_EVENT_TYPES.find(t => t.value === eventFilter)?.label || "More"} <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {isMoreOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsMoreOpen(false)} />
                <div className="absolute top-full mt-2 left-0 z-50 w-48 rounded-xl border border-border/60 bg-background shadow-xl overflow-hidden py-1">
                  {MORE_EVENT_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => {
                        setEventFilter(type.value);
                        setPage(1);
                        setIsMoreOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-2 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                        eventFilter === type.value && "bg-primary/10 text-primary font-bold"
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="surface-card rounded-2xl border border-border/50 p-4 pt-5 flex flex-col justify-between overflow-hidden relative">
            <div>
              <div className="flex items-center gap-2 mb-3 text-primary">
                <Sparkles className="h-4 w-4" /> <span className="text-xs font-bold text-muted-foreground">Total Events</span>
              </div>
              <h3 className="text-3xl font-extrabold leading-none mb-1">83</h3>
              <p className="text-[10px] font-bold text-emerald-500">+12 this year</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0">
               <Sparkline color="#8b5cf6" data={[10, 15, 8, 25, 20, 35, 45]} />
            </div>
          </div>
          
          <div className="surface-card rounded-2xl border border-border/50 p-4 pt-5 flex flex-col justify-between overflow-hidden relative">
            <div>
              <div className="flex items-center gap-2 mb-3 text-blue-500">
                <FlaskConical className="h-4 w-4" /> <span className="text-xs font-bold text-muted-foreground">Lab Tests</span>
              </div>
              <h3 className="text-3xl font-extrabold leading-none mb-1">32</h3>
              <p className="text-[10px] font-bold text-emerald-500">+6 this year</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0">
               <Sparkline color="#3b82f6" data={[2, 5, 4, 8, 5, 9, 12]} />
            </div>
          </div>

          <div className="surface-card rounded-2xl border border-border/50 p-4 pt-5 flex flex-col justify-between overflow-hidden relative">
            <div>
              <div className="flex items-center gap-2 mb-3 text-emerald-500">
                <Pill className="h-4 w-4" /> <span className="text-xs font-bold text-muted-foreground">Medications</span>
              </div>
              <h3 className="text-3xl font-extrabold leading-none mb-1">18</h3>
              <p className="text-[10px] font-bold text-emerald-500">Ongoing</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0">
               <Sparkline color="#10b981" data={[15, 15, 18, 18, 18, 18]} />
            </div>
          </div>

          <div className="surface-card rounded-2xl border border-border/50 p-4 pt-5 flex flex-col justify-between overflow-hidden relative">
            <div>
              <div className="flex items-center gap-2 mb-3 text-orange-500">
                <Microscope className="h-4 w-4" /> <span className="text-xs font-bold text-muted-foreground">Procedures</span>
              </div>
              <h3 className="text-3xl font-extrabold leading-none mb-1">7</h3>
              <p className="text-[10px] font-bold text-muted-foreground">Lifetime</p>
            </div>
          </div>
        </div>

        {/* Timeline List */}
        <div className="relative">
          {isLoading ? (
            <PageSkeleton type="timeline" />
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">No events found.</div>
          ) : (
            <div className="space-y-10">
              {sortedYears.map((year) => (
                <div key={year} className="relative z-10">
                  {/* Year Header */}
                  <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">{year}</h2>
                    <span className="text-[10px] font-bold bg-muted px-2 py-1 rounded-md text-muted-foreground uppercase tracking-wider">
                      {groupedTimeline[year].length} events
                    </span>
                  </div>

                  {/* Year Events */}
                  <div className="space-y-0">
                    {groupedTimeline[year].map((event, index) => (
                      <TimelineCard
                        key={event.id}
                        event={event}
                        isLast={index === groupedTimeline[year].length - 1}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar (Desktop Only) */}
      <div className="hidden xl:flex w-[320px] shrink-0 flex-col gap-6">
        
        {/* AI Health Insights */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10" />
          <h3 className="text-sm font-bold flex items-center gap-2 mb-3 text-primary">
            <Sparkles className="h-4 w-4" /> AI Health Insights
          </h3>
          <p className={cn(
            "text-xs font-medium text-foreground/80 leading-relaxed mb-4 transition-all duration-300",
            !insightsExpanded && "line-clamp-3"
          )}>
            {aiSummaryLoading ? (
              <span className="flex gap-1 items-center text-primary/60 animate-pulse">
                <Sparkles className="h-3 w-3" /> Analyzing your timeline...
              </span>
            ) : aiSummary?.summary || "Your health journey is stable. Keep following your medication and lifestyle routine."}
          </p>
          <Button 
            variant="outline" 
            className="w-full rounded-xl h-9 text-xs font-bold border-primary/20 hover:bg-primary hover:text-white transition-colors"
            onClick={() => setInsightsExpanded(!insightsExpanded)}
          >
            {insightsExpanded ? "Show Less" : "Read Full Summary"} &rarr;
          </Button>
        </div>

        {/* Jump to Date (Calendar Mockup) */}
        <div className="surface-card rounded-2xl border border-border/50 p-5">
          <h3 className="text-sm font-bold mb-4">Jump to Date</h3>
          
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
              className="p-1 hover:bg-muted rounded-md text-muted-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold">{monthName}</span>
            <button 
              onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
              className="p-1 hover:bg-muted rounded-md text-muted-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['S','M','T','W','T','F','S'].map((d, index) => (
              <div key={`${d}-${index}`} className="text-[9px] font-bold text-muted-foreground mb-1">{d}</div>
            ))}
            {/* Pad days */}
            {prevMonthPadding.map(d => (
              <div key={`prev-${d}`} className="text-[10px] p-1 text-muted-foreground/30">{d}</div>
            ))}
            {/* Current month days */}
            {currentMonthDays.map(d => {
              const isSelected = selectedDate?.getDate() === d && 
                                 selectedDate?.getMonth() === calendarDate.getMonth() && 
                                 selectedDate?.getFullYear() === calendarDate.getFullYear();
              
              const isToday = new Date().getDate() === d &&
                              new Date().getMonth() === calendarDate.getMonth() &&
                              new Date().getFullYear() === calendarDate.getFullYear();

              return (
                <div 
                  key={`day-${d}`} 
                  onClick={() => {
                    const newDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), d);
                    setSelectedDate(newDate);
                    const elementId = `timeline-${newDate.getFullYear()}-${newDate.getMonth() + 1}-${d}`;
                    const element = document.getElementById(elementId);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                  className={cn(
                    "text-[10px] p-1 rounded-md font-medium cursor-pointer transition-colors",
                    isSelected ? "bg-primary text-white font-bold shadow-sm" : 
                    isToday ? "bg-primary/10 text-primary font-bold hover:bg-primary/20" : 
                    "text-foreground hover:bg-muted"
                  )}
                >
                  {d}
                </div>
              );
            })}
          </div>
        </div>

        {/* Event Types Breakdown */}
        <div className="surface-card rounded-2xl border border-border/50 p-5">
          <h3 className="text-sm font-bold mb-5">Event Types</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-500"><FlaskConical className="h-3.5 w-3.5" /></div>
                <span className="font-medium">Lab Tests</span>
              </div>
              <span className="font-bold tabular-nums">32</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-blue-500/10 text-blue-500"><Hospital className="h-3.5 w-3.5" /></div>
                <span className="font-medium">Visits</span>
              </div>
              <span className="font-bold tabular-nums">18</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-purple-500/10 text-purple-500"><Pill className="h-3.5 w-3.5" /></div>
                <span className="font-medium">Medications</span>
              </div>
              <span className="font-bold tabular-nums">18</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-orange-500/10 text-orange-500"><Microscope className="h-3.5 w-3.5" /></div>
                <span className="font-medium">Procedures</span>
              </div>
              <span className="font-bold tabular-nums">7</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-rose-500/10 text-rose-500"><Hospital className="h-3.5 w-3.5" /></div>
                <span className="font-medium">Hospitalizations</span>
              </div>
              <span className="font-bold tabular-nums">3</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-green-500/10 text-green-500"><Syringe className="h-3.5 w-3.5" /></div>
                <span className="font-medium">Vaccinations</span>
              </div>
              <span className="font-bold tabular-nums">5</span>
            </div>
          </div>
          <button className="text-xs font-bold text-primary mt-5 hover:underline">Show all</button>
        </div>

      </div>

    </div>
  );
}
