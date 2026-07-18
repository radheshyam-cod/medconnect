"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Stethoscope, Pill, FlaskConical, Syringe, AlertTriangle, Activity, Calendar, Hospital, Microscope, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { TimelineEvent } from "@/lib/api-client";

interface TimelineCardProps {
  event: TimelineEvent;
  isLoading?: boolean;
  isLast?: boolean;
}

const eventTypeConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  VISIT: { icon: Hospital, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20", label: "Visit" },
  DIAGNOSIS: { icon: Stethoscope, color: "text-red-500", bg: "bg-red-500/10 border-red-500/20", label: "Diagnosis" },
  MEDICATION: { icon: Pill, color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/20", label: "Medication" },
  LAB_TEST: { icon: FlaskConical, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", label: "Lab Test" },
  PROCEDURE: { icon: Microscope, color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20", label: "Procedure" },
  IMAGING: { icon: Activity, color: "text-cyan-500", bg: "bg-cyan-500/10 border-cyan-500/20", label: "Imaging" },
  VACCINATION: { icon: Syringe, color: "text-green-500", bg: "bg-green-500/10 border-green-500/20", label: "Vaccination" },
  ALLERGY: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20", label: "Allergy" },
  HOSPITALIZATION: { icon: Hospital, color: "text-rose-500", bg: "bg-rose-500/10 border-rose-500/20", label: "Hospitalization" },
  SURGERY: { icon: Microscope, color: "text-red-600", bg: "bg-red-500/10 border-red-500/20", label: "Surgery" },
  OTHER: { icon: Calendar, color: "text-muted-foreground", bg: "bg-muted border-border/50", label: "Other" },
};

export function TimelineCard({ event, isLoading, isLast }: TimelineCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  if (isLoading) {
    return (
      <div className="flex gap-4 md:gap-6 w-full">
        <div className="w-10 shrink-0" />
        <div className="skeleton h-8 w-8 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-24 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const config = eventTypeConfig[event.eventType] || eventTypeConfig.OTHER;
  const Icon = config.icon;
  
  const date = new Date(event.eventDate);
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('default', { month: 'short' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex gap-4 md:gap-6 group w-full"
    >
      {/* Left Date Column */}
      <div className="w-8 md:w-10 shrink-0 flex flex-col items-center pt-2">
        <span className="text-sm md:text-base font-extrabold text-foreground leading-none">{day}</span>
        <span className="text-[10px] md:text-xs font-semibold text-muted-foreground mt-1">{month}</span>
      </div>

      {/* Center Icon & Connector */}
      <div className="relative flex flex-col items-center">
        <div className={cn(
          "relative z-10 flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-full border transition-transform duration-300 group-hover:scale-110",
          config.bg
        )}>
          <Icon className={cn("h-3.5 w-3.5 md:h-4 md:w-4", config.color)} />
        </div>
        {!isLast && (
          <div className="absolute top-10 bottom-0 w-[2px] bg-border/40 group-hover:bg-border transition-colors duration-500 -mb-6" />
        )}
      </div>

      {/* Right Card Content */}
      <div className="flex-1 pb-6">
        <div 
          onClick={() => setExpanded(!expanded)}
          className="surface-card rounded-2xl border border-border/50 p-4 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 cursor-pointer hover:border-border/80"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border", config.bg, config.color)}>
                  {config.label}
                </span>
                
                {event.severity && (
                  <Badge variant="outline" className={cn(
                    "text-[9px] h-5 px-2 border",
                    event.severity === "CRITICAL" || event.severity === "SEVERE" ? "border-red-500/30 text-red-500 bg-red-500/5" :
                    event.severity === "MODERATE" ? "border-amber-500/30 text-amber-500 bg-amber-500/5" :
                    "border-emerald-500/30 text-emerald-500 bg-emerald-500/5" // Use emerald for Active/Normal
                  )}>
                    {event.severity}
                  </Badge>
                )}
              </div>

              <h3 className="text-sm font-bold text-foreground leading-snug">{event.title}</h3>

              {event.description && (
                <p className={cn(
                  "text-xs text-muted-foreground mt-1.5 leading-relaxed transition-all",
                  !expanded && "line-clamp-2"
                )}>
                  {event.description}
                </p>
              )}

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 pt-3 border-t border-border/40">
                      {event.facility && (
                        <div className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                          <span className="font-semibold text-foreground">Facility:</span> {event.facility}
                        </div>
                      )}
                      {event.doctorName && (
                        <div className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                          <span className="font-semibold text-foreground">Doctor:</span> Dr. {event.doctorName}
                        </div>
                      )}
                      {event.diseases && event.diseases.length > 0 && (
                        <div className="text-xs text-muted-foreground font-medium">
                          <span className="font-semibold text-foreground">Diagnoses:</span> {event.diseases.join(", ")}
                        </div>
                      )}
                      {event.medicines && event.medicines.length > 0 && (
                        <div className="text-xs text-muted-foreground font-medium">
                          <span className="font-semibold text-foreground">Medicines:</span> {event.medicines.join(", ")}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Expand indicator chevron */}
            <div className="shrink-0 p-1 text-muted-foreground transition-colors">
              <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
                <ChevronDown className="h-4 w-4" />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
