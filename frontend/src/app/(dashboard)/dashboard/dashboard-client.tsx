"use client";

import { Activity, FileText, Pill, FlaskConical, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDashboardStats } from "@/hooks/use-dashboard";
import Link from "next/link";
import { cn } from "@/lib/utils";

function StatSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-8 w-16 animate-pulse rounded bg-muted" />
      <div className="h-3 w-24 animate-pulse rounded bg-muted/60" />
    </div>
  );
}

export function DashboardStatsCards() {
  const { data: stats, isLoading, isError } = useDashboardStats();

  const cards = [
    {
      title: "Documents",
      value: stats?.documentsThisMonth ?? 0,
      subtitle: "Uploaded this month",
      icon: FileText,
      total: stats?.totalDocuments ?? 0,
      totalLabel: "Total documents",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-950/50",
    },
    {
      title: "Active Medications",
      value: stats?.activeMedications ?? 0,
      subtitle: "Currently tracked",
      icon: Pill,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-100 dark:bg-emerald-950/50",
    },
    {
      title: "Lab Results",
      value: stats?.totalLabResults ?? 0,
      subtitle: "Latest results",
      icon: FlaskConical,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-950/50",
    },
    {
      title: "Upcoming Medicines",
      value: stats?.upcomingRemindersToday ?? 0,
      subtitle: "Reminders for today",
      icon: Activity,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-950/50",
    },
  ];

  return (
    <>
      {cards.map((card) => (
        <Card key={card.title} className="relative overflow-hidden transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <div className={cn("rounded-lg p-2", card.bgColor)}>
              <card.icon className={cn("h-4 w-4", card.color)} />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <StatSkeleton />
            ) : isError ? (
              <div className="flex items-center gap-2 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                <span>Failed to load</span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold tracking-tight">{card.value}</div>
                <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                {card.total !== undefined && card.totalLabel && (
                  <p className="mt-1 text-[10px] text-muted-foreground/60">
                    {card.totalLabel}: {card.total}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </>
  );
}

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case "COMPLETED":
      return "success" as const;
    case "PROCESSING":
      return "warning" as const;
    case "FAILED":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
};

export function DashboardRecentDocuments() {
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
            <div className="flex-1 space-y-1">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted/60" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const docs = stats?.recentDocuments ?? [];

  if (docs.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
        <p>Upload your first document to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {docs.map((doc) => (
        <Link
          key={doc.id}
          href={`/documents/${doc.id}`}
          className="flex items-center gap-3 rounded-lg border border-transparent p-2 transition-all hover:border-border hover:bg-muted/50"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{doc.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(doc.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          <Badge
            variant={statusBadgeVariant(doc.status)}
            className="shrink-0 text-[10px]"
          >
            {doc.status}
          </Badge>
        </Link>
      ))}
    </div>
  );
}

