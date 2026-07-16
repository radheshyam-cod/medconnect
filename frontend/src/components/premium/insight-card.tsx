"use client";

import { motion } from "framer-motion";
import { Sparkles, Lightbulb, AlertCircle, TrendingUp, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface InsightCardProps {
  title: string;
  description: string;
  type?: "insight" | "warning" | "trend" | "recommendation";
  timestamp?: string;
  actionLabel?: string;
  onAction?: () => void;
  isLoading?: boolean;
  className?: string;
}

const typeConfig = {
  insight: {
    icon: Lightbulb,
    color: "text-amber-500",
    bg: "bg-amber-100 dark:bg-amber-950/50",
    badgeColor: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  warning: {
    icon: AlertCircle,
    color: "text-red-500",
    bg: "bg-red-100 dark:bg-red-950/50",
    badgeColor: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
  },
  trend: {
    icon: TrendingUp,
    color: "text-emerald-500",
    bg: "bg-emerald-100 dark:bg-emerald-950/50",
    badgeColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  recommendation: {
    icon: Sparkles,
    color: "text-primary",
    bg: "bg-primary/10",
    badgeColor: "bg-primary/10 text-primary border-primary/20",
  },
};

export function InsightCard({
  title,
  description,
  type = "insight",
  timestamp,
  actionLabel,
  onAction,
  isLoading,
  className,
}: InsightCardProps) {
  const config = typeConfig[type];

  if (isLoading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="skeleton h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-5/6" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <Card
        className={cn(
          "overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer border-transparent hover:border-border",
          className,
        )}
        onClick={onAction}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", config.bg)}>
              <Icon className={cn("h-4 w-4", config.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold capitalize">{type}</span>
                {timestamp && (
                  <span className="text-[10px] text-muted-foreground/60">{timestamp}</span>
                )}
              </div>
              <p className="text-sm font-medium leading-snug">{title}</p>
              <p className="text-xs text-muted-foreground/80 mt-0.5 leading-relaxed">{description}</p>
              {actionLabel && (
                <div className="mt-2 flex items-center gap-1 text-xs font-medium text-primary group">
                  <span>{actionLabel}</span>
                  <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
