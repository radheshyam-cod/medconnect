"use client";

import {
  Stethoscope,
  Pill,
  FlaskConical,
  Syringe,
  AlertTriangle,
  Activity,
  Calendar,
  Hospital,
  Microscope,
  ArrowRight,
} from "lucide-react";
import { useTimeline } from "@/hooks/use-timeline";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import Link from "next/link";

const eventTypeConfig: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; bg: string; label: string }
> = {
  VISIT: { icon: Hospital, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-950/50", label: "Visit" },
  DIAGNOSIS: { icon: Stethoscope, color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-950/50", label: "Diagnosis" },
  MEDICATION: { icon: Pill, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-950/50", label: "Medication" },
  LAB_TEST: { icon: FlaskConical, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-950/50", label: "Lab Test" },
  PROCEDURE: { icon: Microscope, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-950/50", label: "Procedure" },
  IMAGING: { icon: Activity, color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-100 dark:bg-cyan-950/50", label: "Imaging" },
  VACCINATION: { icon: Syringe, color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-950/50", label: "Vaccination" },
  ALLERGY: { icon: AlertTriangle, color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-100 dark:bg-yellow-950/50", label: "Allergy" },
  HOSPITALIZATION: { icon: Hospital, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-100 dark:bg-rose-950/50", label: "Hospitalization" },
  SURGERY: { icon: Microscope, color: "text-red-700 dark:text-red-400", bg: "bg-red-200 dark:bg-red-950/50", label: "Surgery" },
  OTHER: { icon: Calendar, color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-100 dark:bg-gray-950/50", label: "Other" },
};

const severityBadgeVariant = (severity: string) => {
  switch (severity) {
    case "CRITICAL":
    case "SEVERE":
      return "destructive" as const;
    case "MODERATE":
      return "warning" as const;
    default:
      return "secondary" as const;
  }
};

function TimelineSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted/60" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Calendar className="h-6 w-6 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-medium">No timeline events yet</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Upload and process documents to build your health timeline
      </p>
    </div>
  );
}

interface TimelineEvent {
  id: string;
  eventType: string;
  title: string;
  description?: string;
  severity?: string;
  eventDate: string;
  facility?: string;
  doctorName?: string;
}

export function DashboardTimeline() {
  const { data, isLoading, isError } = useTimeline({ limit: 6 });

  // The timeline.list endpoint returns { events: [...], total: number }
  const rawData = data as { events?: TimelineEvent[] } | undefined;
  const events = rawData?.events ?? [];

  if (isLoading) return <TimelineSkeleton />;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertTriangle className="mb-2 h-6 w-6 text-destructive" />
        <p className="text-sm text-destructive">Failed to load timeline</p>
        <p className="text-xs text-muted-foreground mt-1">Please try again later</p>
      </div>
    );
  }

  if (events.length === 0) return <TimelineEmpty />;

  return (
    <div className="relative">
      {/* Vertical connecting line */}
      <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-border" />

      <div className="space-y-0">
        {events.map((event, index) => {
          const config = eventTypeConfig[event.eventType] || eventTypeConfig.OTHER;
          const Icon = config.icon;
          const isLast = index === events.length - 1;

          return (
            <div key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
              {/* Timeline dot + icon */}
              <div
                className={cn(
                  "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-background",
                  config.bg,
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", config.color)} />
              </div>

              {/* Event card */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {config.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">
                    {formatDate(event.eventDate)}
                  </span>
                  {event.severity && (
                    <Badge
                      variant={severityBadgeVariant(event.severity)}
                      className="shrink-0 text-[9px] h-4 px-1.5"
                    >
                      {event.severity}
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-medium leading-snug mt-0.5">{event.title}</p>
                {event.facility && (
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {event.facility}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* View all link */}
      <div className="mt-2 border-t pt-3">
        <Link
          href="/timeline"
          className="group inline-flex items-center gap-1.5 text-xs font-medium text-primary transition-colors hover:text-primary/80"
        >
          View full timeline
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
