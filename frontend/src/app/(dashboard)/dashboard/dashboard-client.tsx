"use client";

import { motion } from "framer-motion";
import {
  FileText,
  Pill,
  FlaskConical,
  Activity,
  Calendar,
  ArrowRight,
  Sparkles,
  Heart,
  AlertCircle,
  Clock,
  TrendingUp,
  Loader2,
  ChevronRight,
  Upload,
  User,
  Stethoscope,
  Plus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDashboardStats, useTimelineAISummary } from "@/hooks/use-dashboard";
import { useTimeline } from "@/hooks/use-timeline";
import { cn, formatDate } from "@/lib/utils";
import Link from "next/link";
import { HealthScoreCard } from "@/components/premium/health-score-card";
import { EmergencyCard } from "@/components/premium/emergency-card";
import { InsightCard } from "@/components/premium/insight-card";
import { PageSkeleton } from "@/components/premium/page-skeleton";
import { useDocuments } from "@/hooks/use-documents";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

// ─── Stat Card ───

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  bgColor,
  href,
  isLoading,
  total,
  totalLabel,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: any;
  color: string;
  bgColor: string;
  href?: string;
  isLoading?: boolean;
  total?: number;
  totalLabel?: string;
}) {
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="skeleton h-4 w-20" />
          <div className="skeleton h-8 w-8 rounded-lg" />
        </CardHeader>
        <CardContent>
          <div className="skeleton h-8 w-16 mb-1" />
          <div className="skeleton h-3 w-24" />
        </CardContent>
      </Card>
    );
  }

  const content = (
    <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md group cursor-pointer border-transparent hover:border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={cn("rounded-lg p-2 transition-colors group-hover:scale-110", bgColor)}>
          <Icon className={cn("h-4 w-4", color)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight tabular-nums">{value}</div>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        {total !== undefined && totalLabel && (
          <div className="mt-2 flex items-center gap-1.5">
            <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/60"
                style={{ width: `${total > 0 ? (value / total) * 100 : 0}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground/60 tabular-nums">{total} {totalLabel}</span>
          </div>
        )}
        {href && (
          <div className="mt-2 flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            <span>View all</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

// ─── Dashboard Client ───

export function DashboardClient() {
  const { data: stats, isLoading: statsLoading, isError: statsError } = useDashboardStats();
  const { data: aiSummary, isLoading: aiLoading } = useTimelineAISummary();
  const { data: timelineData, isLoading: timelineLoading } = useTimeline({ limit: 5 });
  const { data: medications } = useQuery({
    queryKey: ["medications", { isActive: true }],
    queryFn: () => api.medications.list({ isActive: true }),
    staleTime: 5 * 60 * 1000,
  });

  const events = (timelineData as any)?.events || [];
  const timelineEvents = Array.isArray(timelineData) ? timelineData : events;

  // Calculate health score based on data
  const calculateHealthScore = () => {
    if (!stats) return 0;
    let score = 75; // Base score
    if (stats.activeMedications > 0) score -= 2;
    if (stats.upcomingRemindersToday > 2) score -= 3;
    const abnormalLabs = stats.recentLabResults?.filter((l) => l.isAbnormal).length || 0;
    score -= abnormalLabs * 5;
    if (stats.documentsThisMonth > 0) score += 3; // Active health tracking
    return Math.max(0, Math.min(100, score));
  };

  const healthScore = calculateHealthScore();
  const healthTrend = (() => {
    if (healthScore >= 80) return "up" as const;
    if (healthScore >= 60) return "stable" as const;
    return "down" as const;
  })();

  if (statsLoading && !stats) {
    return <PageSkeleton type="dashboard" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Dashboard
            <Badge variant="outline" className="font-normal text-[10px]">
              <Sparkles className="h-3 w-3 mr-1" /> AI Powered
            </Badge>
          </h1>
          <p className="text-muted-foreground text-sm">
            Your health at a glance
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/documents">
              <Upload className="h-4 w-4 mr-1.5" />
              Upload
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* Health Score + Emergency Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <HealthScoreCard score={healthScore} trend={healthTrend} isLoading={statsLoading} />
        </div>
        <EmergencyCard />
      </div>

      {/* Stat Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-4 grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          title="Documents"
          value={stats?.documentsThisMonth ?? 0}
          subtitle="Uploaded this month"
          icon={FileText}
          color="text-blue-600 dark:text-blue-400"
          bgColor="bg-blue-100 dark:bg-blue-950/50"
          href="/documents"
          isLoading={statsLoading}
          total={stats?.totalDocuments}
          totalLabel="total"
        />
        <StatCard
          title="Active Medications"
          value={medications?.length ?? stats?.activeMedications ?? 0}
          subtitle="Currently tracked"
          icon={Pill}
          color="text-emerald-600 dark:text-emerald-400"
          bgColor="bg-emerald-100 dark:bg-emerald-950/50"
          href="/medications"
          isLoading={statsLoading}
        />
        <StatCard
          title="Lab Results"
          value={stats?.totalLabResults ?? 0}
          subtitle="Latest results"
          icon={FlaskConical}
          color="text-purple-600 dark:text-purple-400"
          bgColor="bg-purple-100 dark:bg-purple-950/50"
          href="/labs"
          isLoading={statsLoading}
        />
        <StatCard
          title="Upcoming Medicines"
          value={stats?.upcomingRemindersToday ?? 0}
          subtitle="Reminders for today"
          icon={Clock}
          color="text-amber-600 dark:text-amber-400"
          bgColor="bg-amber-100 dark:bg-amber-950/50"
          isLoading={statsLoading}
        />
      </motion.div>

      {/* AI Insights + Recent Labs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* AI Timeline Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-4 space-y-4"
        >
          <Card className="overflow-hidden border-primary/10">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <CardTitle className="text-sm font-medium">AI Insights</CardTitle>
              </div>
              <CardDescription>
                AI-powered analysis of your recent health activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {aiLoading ? (
                <div className="space-y-3">
                  <div className="skeleton h-20 w-full rounded-lg" />
                  <div className="skeleton h-16 w-full rounded-lg" />
                </div>
              ) : aiSummary ? (
                <div className="space-y-3">
                  {/* Summary */}
                  <div className="relative rounded-lg bg-gradient-to-br from-primary/5 via-primary/3 to-background border p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Sparkles className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-relaxed text-foreground/90 line-clamp-4">
                          {aiSummary.summary}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Key Events */}
                  {aiSummary.keyEvents.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <TrendingUp className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                          Key Events
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {aiSummary.keyEvents.slice(0, 3).map((event, i) => (
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
                                  {formatDate(event.date)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trends & Recommendations */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {aiSummary.trends.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <TrendingUp className="h-3 w-3 text-emerald-500" />
                          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Trends</span>
                        </div>
                        <ul className="space-y-1">
                          {aiSummary.trends.slice(0, 3).map((trend, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <span className="mt-1.5 block h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                              <span>{trend}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiSummary.recommendations.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Sparkles className="h-3 w-3 text-amber-500" />
                          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Suggestions</span>
                        </div>
                        <ul className="space-y-1">
                          {aiSummary.recommendations.slice(0, 3).map((rec, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <span className="mt-1.5 block h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <Link
                    href="/timeline"
                    className="group inline-flex items-center gap-1.5 text-xs font-medium text-primary transition-all hover:text-primary/80"
                  >
                    View full timeline
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-3 py-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">No events to analyze yet.</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">Upload documents to get AI insights.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Column: Recent Activity + Medications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-3 space-y-4"
        >
          {/* Recent Labs */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                  <FlaskConical className="h-4 w-4 text-purple-500" />
                  Recent Labs
                </CardTitle>
                <Link href="/labs" className="text-[10px] font-medium text-primary hover:underline">
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-2">
                  <div className="skeleton h-10 w-full" />
                  <div className="skeleton h-10 w-full" />
                </div>
              ) : stats?.recentLabResults && stats.recentLabResults.length > 0 ? (
                <div className="space-y-2">
                  {stats.recentLabResults.slice(0, 3).map((lab) => (
                    <div key={lab.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{lab.testName}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(lab.date)}</p>
                      </div>
                      <div className="flex items-center gap-2 text-right">
                        <span className={cn("text-xs font-semibold tabular-nums", lab.isAbnormal ? "text-red-500" : "")}>
                          {lab.value}{lab.unit ? ` ${lab.unit}` : ""}
                        </span>
                        {lab.isAbnormal && <AlertCircle className="h-3 w-3 text-red-500" />}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <FlaskConical className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No lab results yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Today's Medications */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                  <Pill className="h-4 w-4 text-emerald-500" />
                  Active Medications
                </CardTitle>
                <Link href="/medications" className="text-[10px] font-medium text-primary hover:underline">
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-2">
                  <div className="skeleton h-10 w-full" />
                  <div className="skeleton h-10 w-full" />
                </div>
              ) : medications && medications.length > 0 ? (
                <div className="space-y-2">
                  {medications.slice(0, 3).map((med) => (
                    <div key={med.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50">
                        <Pill className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">{med.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {med.dosage}{med.frequency ? ` • ${med.frequency}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Pill className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No active medications</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline Preview */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-blue-500" />
                  Recent Events
                </CardTitle>
                <Link href="/timeline" className="text-[10px] font-medium text-primary hover:underline">
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {timelineLoading ? (
                <div className="space-y-2">
                  <div className="skeleton h-10 w-full" />
                  <div className="skeleton h-10 w-full" />
                </div>
              ) : timelineEvents.length > 0 ? (
                <div className="space-y-2">
                  {timelineEvents.slice(0, 3).map((event: any) => (
                    <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/50">
                        <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{event.title}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(event.eventDate)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Activity className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No recent events</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Documents */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-blue-500" />
                Recent Documents
              </CardTitle>
              <Link href="/documents" className="text-[10px] font-medium text-primary hover:underline">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex-1 skeleton h-24 rounded-lg" />
                ))}
              </div>
            ) : stats?.recentDocuments && stats.recentDocuments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {stats.recentDocuments.slice(0, 4).map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/documents/${doc.id}`}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-all hover:shadow-md hover:border-primary/20 group"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p
                        className="text-xs font-medium truncate overflow-hidden text-ellipsis whitespace-nowrap block w-full group-hover:text-primary transition-colors"
                        title={doc.fileName}
                      >
                        {doc.fileName}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={cn(
                          "inline-block h-1.5 w-1.5 rounded-full",
                          doc.status === "COMPLETED" ? "bg-emerald-500" : doc.status === "PROCESSING" ? "bg-amber-500" : "bg-muted-foreground"
                        )} />
                        <span className="text-[10px] text-muted-foreground">{doc.status}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Upload your first document</p>
                <Button variant="outline" size="sm" className="mt-2" asChild>
                  <Link href="/documents">
                    <Upload className="h-4 w-4 mr-1.5" />
                    Upload
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Bottom quick links */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground/60">
        <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px]">⌘D</kbd>
        <span>Dashboard</span>
        <span>·</span>
        <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px]">⌘K</kbd>
        <span>Search</span>
        <span>·</span>
        <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px]">⌘T</kbd>
        <span>Timeline</span>
        <span>·</span>
        <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px]">⌘F</kbd>
        <span>Documents</span>
      </div>
    </div>
  );
}
