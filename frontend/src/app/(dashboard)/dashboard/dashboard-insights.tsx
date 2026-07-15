"use client";

import { Sparkles, Lightbulb, TrendingUp, AlertCircle, Calendar, ChevronRight } from "lucide-react";
import { useTimelineAISummary } from "@/hooks/use-timeline";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

function InsightsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-muted/60" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-muted/60" />
        <div className="h-3 w-4/6 animate-pulse rounded bg-muted/60" />
      </div>
      <div className="flex gap-2 pt-1">
        <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
        <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}

function InsightsEmpty() {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
        <Calendar className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">
          No events in the last month to analyze.
        </p>
        <p className="text-xs text-muted-foreground/60 mt-0.5">
          Upload documents to build your health timeline and get AI insights.
        </p>
      </div>
    </div>
  );
}

export function DashboardTimelineInsights() {
  const { data, isLoading, isError, refetch } = useTimelineAISummary();

  if (isLoading) return <InsightsSkeleton />;

  if (isError) {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-4 w-4 text-destructive" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-destructive font-medium">AI insights unavailable</p>
          <button
            onClick={() => refetch()}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Tap to retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.totalEventsInPeriod === 0) return <InsightsEmpty />;

  return (
    <div className="space-y-4">
      {/* AI Summary Narrative */}
      <div className="relative rounded-lg bg-gradient-to-br from-primary/5 via-primary/3 to-background border p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                AI Health Summary
              </span>
              <Badge variant="outline" className="text-[9px] px-1.5 h-4 font-normal">
                {data.totalEventsInPeriod} event{data.totalEventsInPeriod !== 1 ? "s" : ""}
              </Badge>
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">
              {data.summary}
            </p>
            <p className="text-[10px] text-muted-foreground/50 mt-2">
              {new Date(data.periodStart).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}{" "}
              –{" "}
              {new Date(data.periodEnd).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Key Events */}
      {data.keyEvents.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Key Events
            </span>
          </div>
          <div className="space-y-1.5">
            {data.keyEvents.slice(0, 4).map((event, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 rounded-md border border-transparent px-2 py-1.5 transition-colors hover:border-border hover:bg-muted/30"
              >
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <ChevronRight className="h-2.5 w-2.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium">{event.title}</span>
                    <span className="text-[9px] text-muted-foreground/60">
                      {new Date(event.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/70 leading-snug mt-0.5">
                    {event.significance}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trends & Recommendations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.trends.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Trends
              </span>
            </div>
            <ul className="space-y-1">
              {data.trends.map((trend, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="mt-1.5 block h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                  <span>{trend}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {data.recommendations.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Lightbulb className="h-3 w-3 text-amber-500" />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Recommendations
              </span>
            </div>
            <ul className="space-y-1">
              {data.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="mt-1.5 block h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
