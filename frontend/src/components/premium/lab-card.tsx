"use client";

import { motion } from "framer-motion";
import { FlaskConical, TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import type { LabItem } from "@/lib/api-client";

interface LabCardProps {
  lab: LabItem;
  previousValue?: string;
  isLoading?: boolean;
  className?: string;
  showGraph?: boolean;
}

function getTrend(current: string, previous?: string): "up" | "down" | "stable" | "unknown" {
  if (!previous) return "unknown";
  const curr = parseFloat(current);
  const prev = parseFloat(previous);
  if (isNaN(curr) || isNaN(prev)) return "unknown";
  if (curr > prev) return "up";
  if (curr < prev) return "down";
  return "stable";
}

export function LabCard({ lab, previousValue, isLoading, className, showGraph }: LabCardProps) {
  const trend = getTrend(lab.value, previousValue);

  if (isLoading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="skeleton h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-5 w-2/3" />
              <div className="skeleton h-8 w-20" />
              <div className="skeleton h-3 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = lab.isAbnormal ? "text-red-500" : trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <Card className={cn(
        "overflow-hidden transition-all duration-200 hover:shadow-md",
        lab.isAbnormal ? "border-red-200 dark:border-red-900/50 bg-gradient-to-br from-background to-red-50/30 dark:to-red-950/10" : "hover:border-primary/20",
        className,
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  lab.isAbnormal ? "bg-red-100 dark:bg-red-950/50" : "bg-primary/10"
                )}>
                  <FlaskConical className={cn("h-4 w-4", lab.isAbnormal ? "text-red-500" : "text-primary")} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold truncate">{lab.testName}</h4>
                  {lab.category && <p className="text-[10px] text-muted-foreground">{lab.category}</p>}
                </div>
              </div>

              {/* Value display */}
              <div className="flex items-end gap-2">
                <span className={cn(
                  "text-2xl font-bold tabular-nums leading-none",
                  lab.isAbnormal ? "text-red-600 dark:text-red-400" : ""
                )}>
                  {lab.value}
                </span>
                {lab.unit && (
                  <span className="text-xs text-muted-foreground mb-0.5">{lab.unit}</span>
                )}
                {trend !== "unknown" && (
                  <div className={cn("flex items-center gap-0.5 mb-0.5", trendColor)}>
                    <TrendIcon className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>

              {/* Reference range */}
              {lab.referenceRange && (
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    Ref: {lab.referenceRange}
                  </span>
                  {lab.isAbnormal ? (
                    <Badge variant="destructive" className="text-[9px] h-4 px-1">Abnormal</Badge>
                  ) : (
                    <Badge variant="success" className="text-[9px] h-4 px-1">Normal</Badge>
                  )}
                </div>
              )}

              {/* Date */}
              <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground/60">
                <span>{formatDate(lab.date)}</span>
                {previousValue && (
                  <>
                    <span>•</span>
                    <span>Prev: {previousValue}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
