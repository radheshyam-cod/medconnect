"use client";

import { motion } from "framer-motion";
import { Stethoscope, Pill, FlaskConical, Syringe, AlertTriangle, Activity, Calendar, Hospital, Microscope, ChevronDown, ChevronUp, User, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { useState } from "react";
import type { TimelineEvent } from "@/lib/api-client";

interface TimelineCardProps {
  event: TimelineEvent;
  isLoading?: boolean;
  className?: string;
  isLast?: boolean;
}

const eventTypeConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
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
  OTHER: { icon: Calendar, color: "text-muted-foreground", bg: "bg-muted", label: "Other" },
};

const severityBadgeVariant = (severity: string) => {
  switch (severity) {
    case "CRITICAL": case "SEVERE": return "destructive" as const;
    case "MODERATE": return "warning" as const;
    default: return "secondary" as const;
  }
};

export function TimelineCard({ event, isLoading, className, isLast }: TimelineCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = eventTypeConfig[event.eventType] || eventTypeConfig.OTHER;
  const Icon = config.icon;

  if (isLoading) {
    return (
      <div className="flex gap-4">
        <div className="skeleton h-12 w-12 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-1/3" />
          <div className="skeleton h-5 w-3/4" />
          <div className="skeleton h-3 w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="relative flex gap-4 md:gap-6 group"
    >
      {/* Timeline dot + connecting line */}
      <div className="relative flex flex-col items-center">
        <div className={cn(
          "relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-background transition-all duration-200 group-hover:scale-110",
          config.bg
        )}>
          <Icon className={cn("h-5 w-5", config.color)} />
        </div>
        {!isLast && (
          <div className="absolute top-12 bottom-0 w-0.5 bg-gradient-to-b from-border to-border/20" />
        )}
      </div>

      {/* Content */}
      <Card className={cn(
        "flex-1 transition-all duration-200 hover:shadow-md cursor-pointer",
        expanded ? "shadow-md" : "",
        className
      )} onClick={() => setExpanded(!expanded)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Type & Date row */}
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <Badge variant="secondary" className="text-[10px] h-5 font-medium">
                  {config.label}
                </Badge>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {formatDate(event.eventDate)}
                </span>
                {event.severity && (
                  <Badge variant={severityBadgeVariant(event.severity)} className="text-[9px] h-4 px-1.5">
                    {event.severity}
                  </Badge>
                )}
              </div>

              {/* Title */}
              <h3 className="text-sm font-semibold leading-snug">{event.title}</h3>

              {/* Description (show first 100 chars if collapsed) */}
              {event.description && (
                <p className={cn(
                  "text-xs text-muted-foreground/80 mt-1 leading-relaxed transition-all",
                  !expanded && "line-clamp-2"
                )}>
                  {event.description}
                </p>
              )}

              {/* Expanded details */}
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-3 space-y-2 pt-3 border-t"
                >
                  {/* Facility & Doctor */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {event.facility && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 text-blue-500" />
                        <span>{event.facility}</span>
                      </div>
                    )}
                    {event.doctorName && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="h-3.5 w-3.5 text-primary" />
                        <span>Dr. {event.doctorName}</span>
                      </div>
                    )}
                  </div>

                  {/* Diseases & Medicines */}
                  {event.diseases && event.diseases.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Diagnoses</p>
                      <div className="flex flex-wrap gap-1">
                        {event.diseases.map((d, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">{d}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {event.medicines && event.medicines.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Medicines</p>
                      <div className="flex flex-wrap gap-1">
                        {event.medicines.map((m, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">{m}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {event.procedureName && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground">Procedure:</span>
                      <span className="font-medium">{event.procedureName}</span>
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Expand indicator */}
            {event.description && event.description.length > 100 && (
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
