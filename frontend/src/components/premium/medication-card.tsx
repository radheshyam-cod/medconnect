"use client";

import { motion } from "framer-motion";
import { Pill, Clock, Calendar, AlertCircle, CheckCircle2, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import type { MedicationItem } from "@/lib/api-client";

interface MedicationCardProps {
  medication: MedicationItem;
  isLoading?: boolean;
  className?: string;
  onToggle?: (id: string, isActive: boolean) => void;
}

export function MedicationCard({ medication, isLoading, className, onToggle }: MedicationCardProps) {
  if (isLoading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="skeleton h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-5 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
              <div className="skeleton h-3 w-2/3" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const daysRemaining = medication.endDate
    ? Math.max(0, Math.ceil((new Date(medication.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <Card
        className={cn(
          "overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer border",
          medication.isActive ? "hover:border-primary/20" : "opacity-75",
          className,
        )}
        onClick={() => onToggle?.(medication.id, !medication.isActive)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              medication.isActive ? "bg-emerald-100 dark:bg-emerald-950/50" : "bg-muted"
            )}>
              <Pill className={cn("h-5 w-5", medication.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")} />
            </div>

            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold">{medication.name}</h4>
                  {medication.dosage && (
                    <p className="text-xs text-muted-foreground">{medication.dosage}{medication.frequency ? ` • ${medication.frequency}` : ""}</p>
                  )}
                </div>
                {medication.isActive ? (
                  <Badge variant="success" className="shrink-0 text-[10px] h-5">Active</Badge>
                ) : (
                  <Badge variant="secondary" className="shrink-0 text-[10px] h-5">Past</Badge>
                )}
              </div>

              {/* Details */}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {medication.prescribedBy && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Dr. {medication.prescribedBy}
                  </span>
                )}
                {medication.startDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(medication.startDate)}
                  </span>
                )}
                {daysRemaining !== null && daysRemaining > 0 && (
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <Clock className="h-3 w-3" />
                    {daysRemaining}d remaining
                  </span>
                )}
                {daysRemaining === 0 && (
                  <span className="flex items-center gap-1 text-red-500">
                    <AlertCircle className="h-3 w-3" />
                    Ended
                  </span>
                )}
              </div>

              {/* Route / Instructions */}
              {(medication.route || medication.instructions) && (
                <div className="mt-2 rounded-lg bg-muted/50 px-2.5 py-1.5">
                  {medication.route && <p className="text-[10px] text-muted-foreground">Route: {medication.route}</p>}
                  {medication.instructions && <p className="text-[10px] text-muted-foreground">{medication.instructions}</p>}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
