import Link from "next/link";
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TimelineCard } from "@/components/premium/timeline-card";
import { PageSkeleton } from "@/components/premium/page-skeleton";

const EVENT_TYPES = [
  { value: "", label: "All Events", color: "bg-primary" },
  { value: "VISIT", label: "Visits", color: "bg-blue-500" },
  { value: "DIAGNOSIS", label: "Diagnoses", color: "bg-red-500" },
  { value: "MEDICATION", label: "Medications", color: "bg-purple-500" },
  { value: "LAB_TEST", label: "Lab Tests", color: "bg-emerald-500" },
  { value: "PROCEDURE", label: "Procedures", color: "bg-orange-500" },
  { value: "IMAGING", label: "Imaging", color: "bg-cyan-500" },
  { value: "VACCINATION", label: "Vaccinations", color: "bg-green-500" },
  { value: "ALLERGY", label: "Allergies", color: "bg-yellow-500" },
  { value: "HOSPITALIZATION", label: "Hospitalizations", color: "bg-rose-500" },
  { value: "SURGERY", label: "Surgeries", color: "bg-red-700" },
] as const;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
] as const;

export default function TimelinePage() {
  const [eventFilter, setEventFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["timeline", { eventType: eventFilter || undefined, page, limit: 20 }],
    queryFn: () => api.timeline.list({ eventType: eventFilter || undefined, page, limit: 20 }),
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["timeline-summary"],
    queryFn: () => api.timeline.getSummary(),
  });

  const events = data?.events ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  // Sort events
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = new Date(a.eventDate).getTime();
    const dateB = new Date(b.eventDate).getTime();
    return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
  });

  // Group events by year
  const groupedByYear = sortedEvents.reduce((acc, event) => {
    const year = new Date(event.eventDate).getFullYear().toString();
    if (!acc[year]) acc[year] = [];
    acc[year].push(event);
    return acc;
  }, {} as Record<string, typeof events>);

  const sortedYears = Object.keys(groupedByYear).sort((a, b) =>
    sortOrder === "newest" ? parseInt(b) - parseInt(a) : parseInt(a) - parseInt(b)
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Health Timeline</h1>
        <p className="text-muted-foreground text-sm">
          Your complete medical journey in chronological order
        </p>
      </div>

      {/* Summary Cards */}
      {summary && !summaryLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {Object.entries(summary.byType).slice(0, 12).map(([type, count]) => {
            const config = EVENT_TYPES.find(t => t.value === type);
            return (
              <button
                key={type}
                onClick={() => { setEventFilter(type); setPage(1); }}
                className={cn(
                  "flex items-center gap-2 rounded-lg border p-3 transition-all hover:shadow-md text-left",
                  eventFilter === type ? "border-primary bg-primary/5" : "hover:border-primary/20"
                )}
              >
                <div className={cn("h-2 w-2 rounded-full shrink-0", config?.color || "bg-muted")} />
                <div className="min-w-0">
                  <p className="text-lg font-bold tabular-nums leading-none">{count as number}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{config?.label || type}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {EVENT_TYPES.map((type) => (
            <Badge
              key={type.value}
              variant={eventFilter === type.value ? "default" : "outline"}
              className={cn("cursor-pointer whitespace-nowrap transition-all", 
                eventFilter === type.value ? "" : "hover:border-primary/30"
              )}
              onClick={() => { setEventFilter(type.value); setPage(1); }}
            >
              {type.label}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-xs"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <PageSkeleton type="timeline" />
      ) : isError ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-10 w-10 text-destructive mb-3" />
            <p className="font-semibold">Failed to load timeline</p>
            <p className="text-sm text-muted-foreground mt-1">Please try again later</p>
          </CardContent>
        </Card>
      ) : sortedEvents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-primary/5">
              <Calendar className="h-8 w-8 text-primary/60" />
            </div>
            <h3 className="text-lg font-semibold">No Timeline Events Yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Upload and process documents to build your health timeline. Your medical history will appear here chronologically.
            </p>
            <div className="flex gap-2 mt-4">
              <Badge variant="outline">Upload Prescription</Badge>
              <Badge variant="outline">Add Lab Report</Badge>
              <Badge variant="outline">Enter Manual Event</Badge>
            </div>
            <Button variant="outline" className="mt-6" asChild>
              <Link href="/documents">Go to Documents</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Grouped by Year */}
          {sortedYears.map((year) => (
            <div key={year}>
              {/* Year header */}
              <div className="flex items-center gap-3 mb-4 sticky top-0 bg-background/80 backdrop-blur-sm z-10 pb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-lg font-bold tracking-tight">{year}</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
                <span className="text-xs text-muted-foreground tabular-nums">
                  {groupedByYear[year].length} event{groupedByYear[year].length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Events for this year */}
              <div className="space-y-4 pl-2">
                {groupedByYear[year].map((event, index) => (
                  <TimelineCard
                    key={event.id}
                    event={event}
                    isLast={index === groupedByYear[year].length - 1}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    "h-8 w-8 rounded-lg text-xs font-medium transition-colors",
                    page === pageNum
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent"
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* AI Summary Link */}
      <div className="flex justify-center pt-4">
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1" asChild>
          <Link href="/dashboard">
            <Sparkles className="h-3.5 w-3.5" />
            View AI Summary on Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
