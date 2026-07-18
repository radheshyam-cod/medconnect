"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Heart, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface HealthScoreCardProps {
  score?: number;
  trend?: "up" | "down" | "stable";
  isLoading?: boolean;
  className?: string;
  compact?: boolean;
}

export function HealthScoreCard({ score = 0, trend = "stable", isLoading, className, compact }: HealthScoreCardProps) {
  const getScoreConfig = (s: number) => {
    if (s >= 80) return { color: "text-emerald-500", stroke: "stroke-emerald-500", glow: "ring-glow-good", message: "Your health metrics look great!", label: "Excellent" };
    if (s >= 60) return { color: "text-amber-500", stroke: "stroke-amber-500", glow: "ring-glow-warning", message: "Some metrics need attention.", label: "Fair" };
    return { color: "text-red-500", stroke: "stroke-red-500", glow: "ring-glow-bad", message: "Please consult your doctor soon.", label: "Needs Attention" };
  };

  const config = getScoreConfig(score);
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "text-muted-foreground";

  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  if (isLoading) {
    return (
      <div className={cn("rounded-2xl border border-border/50 bg-card p-5", className)}>
        <div className="flex items-center gap-4">
          <div className="skeleton h-28 w-28 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-5 w-20" />
            <div className="skeleton h-3 w-36" />
            <div className="skeleton h-3 w-28" />
          </div>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn("rounded-2xl border border-border/50 bg-card p-4", className)}>
        <div className="flex items-center gap-4">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" className="opacity-30" />
              <motion.circle
                cx="60" cy="60" r={radius} fill="none" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className={config.stroke}
              />
            </svg>
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className={cn("text-lg font-bold tabular-nums", config.color)}
            >{score}</motion.span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Heart className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-semibold">Health Score</span>
            </div>
            <div className={cn("flex items-center gap-1.5 mt-0.5 text-xs", trendColor)}>
              <TrendIcon className="h-3 w-3" />
              <span className="capitalize font-medium">{trend}</span>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-muted-foreground">{config.label}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-[1.5rem] border border-border/50 bg-card p-6 h-full flex items-center", className)}>
      <div className="flex w-full items-center gap-6">
        {/* Circular Score (Left) */}
        <div className={cn("relative flex h-36 w-36 shrink-0 items-center justify-center", config.glow)}>
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="12" className="opacity-20" />
            <motion.circle
              cx="80" cy="80" r={radius} fill="none" strokeWidth="12" strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className={config.stroke}
            />
          </svg>
          <div className="relative z-10 flex flex-col items-center mt-2">
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className={cn("text-5xl font-extrabold tabular-nums tracking-tighter leading-none text-foreground")}
            >
              {score}
            </motion.span>
            <span className="text-sm text-muted-foreground font-medium mt-1">/100</span>
          </div>
        </div>

        {/* Details (Right) */}
        <div className="flex-1 min-w-0 flex flex-col justify-center space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground">Health Score</h3>
            <Heart className="h-4 w-4 text-muted-foreground/40" />
          </div>
          
          <div>
            <span className={cn("inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold", 
              score >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :
              score >= 60 ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" :
              "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
            )}>
              {config.label}
            </span>
          </div>
          
          <p className="text-sm text-muted-foreground leading-snug pr-4">
            {config.message}
          </p>
          
          <div className="flex items-center gap-1.5 text-xs font-medium pt-1">
            <TrendIcon className={cn("h-3.5 w-3.5", trendColor)} />
            <span className={trendColor}>
              {trend === "up" ? "+8 points" : trend === "down" ? "-3 points" : "No change"} 
            </span>
            <span className="text-muted-foreground ml-1">from last month</span>
          </div>
        </div>
      </div>
    </div>
  );
}
