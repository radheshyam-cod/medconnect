"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Activity, AlertCircle, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface HealthScoreCardProps {
  score?: number;
  trend?: "up" | "down" | "stable";
  isLoading?: boolean;
  className?: string;
}

export function HealthScoreCard({ score = 0, trend = "stable", isLoading, className }: HealthScoreCardProps) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-emerald-500";
    if (s >= 60) return "text-amber-500";
    return "text-red-500";
  };

  const getScoreBg = (s: number) => {
    if (s >= 80) return "stroke-emerald-500";
    if (s >= 60) return "stroke-amber-500";
    return "stroke-red-500";
  };

  const getScoreMessage = (s: number) => {
    if (s >= 80) return "Your health metrics look great!";
    if (s >= 60) return "Some metrics need attention.";
    return "Please consult your doctor soon.";
  };

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "text-muted-foreground";

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  if (isLoading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="skeleton h-28 w-28 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-5 w-24" />
              <div className="skeleton h-3 w-40" />
              <div className="skeleton h-3 w-32" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden border-primary/10 gradient-border", className)}>
      <CardContent className="p-6">
        <div className="flex items-center gap-5">
          {/* Circular Score */}
          <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="8"
                className="opacity-30"
              />
              <motion.circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className={getScoreBg(score)}
              />
            </svg>
            <div className="relative z-10 flex flex-col items-center">
              <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className={cn("text-3xl font-bold tabular-nums", getScoreColor(score))}
              >
                {score}
              </motion.span>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                Score
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Health Score</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {getScoreMessage(score)}
            </p>
            <div className="flex items-center gap-2 text-xs">
              <div className={cn("flex items-center gap-1 font-medium", trendColor)}>
                <TrendIcon className="h-3 w-3" />
                <span className="capitalize">{trend}</span>
              </div>
              <span className="text-muted-foreground/50">•</span>
              <span className="text-muted-foreground">Last 30 days</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
