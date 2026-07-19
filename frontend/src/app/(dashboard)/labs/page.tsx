"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FlaskConical,
  AlertCircle,
  CheckCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  FileText,
  Sparkles,
  ChevronRight,
  ArrowUpDown,
  Activity,
  Heart,
  Droplets,
  ShieldAlert,
  SlidersHorizontal,
  LayoutGrid,
  ListFilter,
  BarChart2,
  Plus,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { LabCard } from "@/components/premium/lab-card";
import { LabTrends } from "@/components/premium/lab-trends";
import { PageSkeleton } from "@/components/premium/page-skeleton";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useUploadDocument } from "@/hooks/use-documents";
import { LabBiomarkerUploader } from "@/components/labs/lab-uploader";

const ORGAN_SYSTEMS = [
  { id: "", label: "All Biomarkers", icon: Activity, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" },
  { id: "BLOOD", label: "Blood & CBC", icon: Droplets, color: "text-rose-500", bg: "bg-rose-500/10 border-rose-500/20" },
  { id: "LIPID", label: "Lipid Profile", icon: Heart, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" },
  { id: "LIVER", label: "Liver (LFT)", icon: FlaskConical, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { id: "KIDNEY", label: "Kidney / Renal", icon: Activity, color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/20" },
  { id: "THYROID", label: "Thyroid & Endocrine", icon: Sparkles, color: "text-cyan-500", bg: "bg-cyan-500/10 border-cyan-500/20" },
  { id: "URINE", label: "Urinalysis", icon: Droplets, color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/20" },
  { id: "OTHER", label: "Other Diagnostics", icon: FileText, color: "text-slate-500", bg: "bg-slate-500/10 border-slate-500/20" },
];

export default function LabsPage() {
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "abnormal">("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list" | "trends">("grid");
  const [onlyAbnormal, setOnlyAbnormal] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const uploadMutation = useUploadDocument();

  const handleUpload = async (file: File, metadata: any) => {
    await uploadMutation.mutateAsync({ file, metadata });
    setShowUpload(false);
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["labs", { page, limit: 50 }],
    queryFn: () => api.labs.list({ page, limit: 50 }),
  });

  const labs = useMemo(() => data?.results ?? [], [data?.results]);
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 50);

  // Filter and sort
  const filteredLabs = useMemo(() => {
    let result = [...labs];

    if (categoryFilter) {
      result = result.filter((l) => l.category === categoryFilter);
    }
    if (onlyAbnormal) {
      result = result.filter((l) => l.isAbnormal);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.testName.toLowerCase().includes(q) ||
          l.category?.toLowerCase().includes(q) ||
          l.unit?.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (sortBy === "newest") return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === "oldest") return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === "abnormal") return (b.isAbnormal ? 1 : 0) - (a.isAbnormal ? 1 : 0);
      return 0;
    });

    return result;
  }, [labs, categoryFilter, onlyAbnormal, searchQuery, sortBy]);

  const abnormalLabs = useMemo(() => labs.filter((l) => l.isAbnormal), [labs]);
  const normalCount = useMemo(() => labs.filter((l) => !l.isAbnormal).length, [labs]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Clinical Analytics Header Hub */}
      <div className="relative rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-6 sm:p-8 shadow-sm">
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary border border-primary/20">
              <Activity className="h-3.5 w-3.5 animate-pulse" />
              Clinical Biomarker Studio
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Diagnostic Lab Reports</h1>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Real-time monitoring of your medical biomarkers, diagnostic reference ranges, and AI-flagged abnormal trends over time.
            </p>
          </div>

          {/* Quick Action & Stats Header Pill */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowUpload(!showUpload)}
              className="rounded-full h-11 px-5 border-primary/30 font-semibold bg-background/80 backdrop-blur hover:bg-primary/5 cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-2 text-primary" />
              {showUpload ? "Close Studio" : "Upload Lab Report PDF"}
            </Button>
            <Button
              variant={viewMode === "trends" ? "default" : "secondary"}
              className="rounded-full h-11 px-5 font-semibold gap-2 shadow-sm"
              onClick={() => setViewMode(viewMode === "trends" ? "grid" : "trends")}
            >
              <BarChart2 className="h-4 w-4" />
              {viewMode === "trends" ? "Exit Trend Studio" : "Interactive Trend Graph"}
            </Button>
          </div>
        </div>

        {/* Diagnostic Vital Bar */}
        {!isLoading && labs.length > 0 && (
          <div className="relative z-10 mt-8 pt-6 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-background/80 backdrop-blur p-4 sm:p-5 border border-border/60 flex items-center justify-between gap-3 min-h-[88px]">
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider block truncate">Total Tests Tracked</span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-xl font-black text-foreground">{labs.length}</span>
                  <span className="text-[11px] text-muted-foreground font-semibold">biomarkers</span>
                </div>
              </div>
              <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Activity className="h-5 w-5" />
              </div>
            </div>

            <div className="rounded-2xl bg-background/80 backdrop-blur p-4 sm:p-5 border border-border/60 flex items-center justify-between gap-3 min-h-[88px]">
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block truncate">In Normal Range</span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{normalCount}</span>
                  <span className="text-[11px] text-emerald-600/80 font-semibold">healthy</span>
                </div>
              </div>
              <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle className="h-5 w-5" />
              </div>
            </div>

            <div
              className={cn(
                "rounded-2xl backdrop-blur p-4 sm:p-5 border transition-all flex items-center justify-between gap-3 min-h-[88px] group",
                abnormalLabs.length > 0
                  ? "bg-red-500/10 border-red-500/30 cursor-pointer hover:bg-red-500/15 hover:border-red-500/50"
                  : "bg-background/80 border-border/60"
              )}
              onClick={() => {
                if (abnormalLabs.length > 0) {
                  setOnlyAbnormal(!onlyAbnormal);
                  setViewMode("grid");
                }
              }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-extrabold text-red-600 dark:text-red-400 uppercase tracking-wider block truncate">Out of Range</span>
                  {abnormalLabs.length > 0 && (
                    <Badge variant="destructive" className="h-4 px-1.5 text-[9px] font-bold">Filter</Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className={cn("text-xl font-black", abnormalLabs.length > 0 ? "text-red-600 dark:text-red-400" : "text-foreground")}>
                    {abnormalLabs.length}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-semibold">flagged</span>
                </div>
              </div>
              <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0", abnormalLabs.length > 0 ? "bg-red-500/20 text-red-600 dark:text-red-400" : "bg-slate-500/10 text-slate-500")}>
                <ShieldAlert className="h-5 w-5" />
              </div>
            </div>

            <div className="rounded-2xl bg-background/80 backdrop-blur p-4 sm:p-5 border border-border/60 flex items-center justify-between gap-3 min-h-[88px]">
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider block truncate">Active Mode</span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-xl font-black text-primary capitalize">{viewMode}</span>
                  <span className="text-[11px] text-muted-foreground font-semibold">view</span>
                </div>
              </div>
              <div className="h-11 w-11 rounded-xl bg-secondary/15 text-secondary-foreground flex items-center justify-center shrink-0">
                <BarChart2 className="h-5 w-5" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Flagged Biomarker Banner (If Abnormal Results Exist) */}
      {!isLoading && abnormalLabs.length > 0 && !onlyAbnormal && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-2 border-red-500/30 bg-gradient-to-r from-red-500/10 via-red-500/5 to-background p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/20 text-red-600 dark:text-red-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-red-700 dark:text-red-300">
                Diagnostic Alert: {abnormalLabs.length} Out-of-Range Biomarker{abnormalLabs.length > 1 ? "s" : ""} Flagged
              </h4>
              <p className="text-xs sm:text-sm text-muted-foreground">
                We detected abnormal values ({abnormalLabs.map(a => a.testName).slice(0, 3).join(", ")}{abnormalLabs.length > 3 ? "..." : ""}). Please consult with your physician.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="destructive"
            className="rounded-xl font-semibold shrink-0"
            onClick={() => { setOnlyAbnormal(true); setViewMode("grid"); }}
          >
            Review Flagged Results ({abnormalLabs.length})
          </Button>
        </motion.div>
      )}

      {/* Organ System Category Cards (Biomarker Systems) */}
      {viewMode !== "trends" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" /> Filter by Diagnostic System
            </h3>
            {(categoryFilter || onlyAbnormal || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-semibold text-primary h-7 px-2"
                onClick={() => { setCategoryFilter(""); setOnlyAbnormal(false); setSearchQuery(""); }}
              >
                Clear all filters
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {ORGAN_SYSTEMS.map((system) => {
              const Icon = system.icon;
              const isSelected = categoryFilter === system.id && !onlyAbnormal;
              const systemCount = system.id === "" ? labs.length : labs.filter(l => l.category === system.id).length;

              return (
                <button
                  key={system.id}
                  onClick={() => {
                    setCategoryFilter(system.id);
                    setOnlyAbnormal(false);
                    setPage(1);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all duration-200 group relative overflow-hidden",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground shadow-md scale-[1.02]"
                      : cn("hover:border-primary/40 bg-card/60 backdrop-blur", system.bg)
                  )}
                >
                  <div className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl mb-2 transition-transform group-hover:scale-110",
                    isSelected ? "bg-primary-foreground/20 text-primary-foreground" : cn("bg-background/80 shadow-sm", system.color)
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold truncate w-full">{system.label}</span>
                  <span className={cn(
                    "text-[10px] font-medium mt-0.5",
                    isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}>
                    {systemCount} {systemCount === 1 ? "test" : "tests"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Toolbar & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-2xl bg-card/50 backdrop-blur border border-border/50 p-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search biomarker (e.g. Glucose, Hemoglobin, Cholesterol)..."
              className="flex h-10 w-full rounded-xl border border-border/60 bg-background/80 pl-10 pr-8 text-sm focus-visible:outline-none focus-visible:border-primary placeholder:text-muted-foreground shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearchQuery("")}>
                <span className="sr-only">Clear</span>
                ×
              </button>
            )}
          </div>

          <Button
            variant={onlyAbnormal ? "destructive" : "outline"}
            size="sm"
            className="rounded-xl h-10 px-4 font-semibold text-xs gap-2 shrink-0"
            onClick={() => { setOnlyAbnormal(!onlyAbnormal); setViewMode("grid"); }}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            {onlyAbnormal ? "Showing Flagged Only" : "Abnormal Only"}
          </Button>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/40">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              className="text-xs h-8 px-3 rounded-lg font-semibold gap-1.5"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Studio Cards
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className="text-xs h-8 px-3 rounded-lg font-semibold gap-1.5"
              onClick={() => setViewMode("list")}
            >
              <ListFilter className="h-3.5 w-3.5" /> Clinical Table
            </Button>
            <Button
              variant={viewMode === "trends" ? "default" : "ghost"}
              size="sm"
              className="text-xs h-8 px-3 rounded-lg font-semibold gap-1.5"
              onClick={() => setViewMode("trends")}
            >
              <TrendingUp className="h-3.5 w-3.5" /> Trends
            </Button>
          </div>

          {viewMode !== "trends" && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 h-10 px-3.5 rounded-xl font-semibold"
              onClick={() => {
                const order = ["newest", "oldest", "abnormal"] as const;
                const idx = order.indexOf(sortBy);
                setSortBy(order[(idx + 1) % order.length]);
              }}
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-primary" />
              Sort: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
            </Button>
          )}
        </div>
      </div>

      {/* Embedded Lab Biomarker Uploader Studio */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <LabBiomarkerUploader
              onUpload={handleUpload}
              isUploading={uploadMutation.isPending}
              onCancel={() => setShowUpload(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Area */}
      {isLoading ? (
        <PageSkeleton type="list" />
      ) : isError ? (
        <Card className="rounded-3xl border-destructive/20">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-3" />
            <p className="font-bold text-lg">Failed to load lab diagnostic data</p>
            <p className="text-sm text-muted-foreground mt-1">Please verify your connection and try refreshing.</p>
          </CardContent>
        </Card>
      ) : filteredLabs.length === 0 ? (
        <Card className="rounded-3xl border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5">
              <FlaskConical className="h-10 w-10 text-primary/60" />
            </div>
            <h3 className="text-xl font-bold">No Biomarker Records Matching Criteria</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
              {onlyAbnormal 
                ? "Excellent news! You have no out-of-range diagnostic biomarkers matching your search." 
                : "Upload your lab reports and our Google Document AI pipeline will automatically extract, group, and track your biomarker ranges over time."}
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              <Badge variant="outline" className="px-3 py-1 text-xs">Complete Blood Count (CBC)</Badge>
              <Badge variant="outline" className="px-3 py-1 text-xs">Lipid Profile & HbA1c</Badge>
              <Badge variant="outline" className="px-3 py-1 text-xs">Liver & Renal Panel</Badge>
            </div>
            <Button onClick={() => setShowUpload(true)} className="mt-8 rounded-full px-6 font-semibold shadow-md cursor-pointer">
              <Plus className="h-4 w-4 mr-2" />
              Upload New Lab Report
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "trends" ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <LabTrends labs={labs} />
        </motion.div>
      ) : viewMode === "list" ? (
        /* Clinical Table View */
        <div className="rounded-3xl border border-border/60 bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="p-4 pl-6">Biomarker / Test</th>
                  <th className="p-4">Diagnostic System</th>
                  <th className="p-4">Measured Value</th>
                  <th className="p-4">Reference Range</th>
                  <th className="p-4">Clinical Status</th>
                  <th className="p-4 pr-6">Date Recorded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-sm">
                {filteredLabs.map((lab) => (
                  <tr key={lab.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4 pl-6 font-bold flex items-center gap-3">
                      <div className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl shrink-0",
                        lab.isAbnormal ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"
                      )}>
                        <FlaskConical className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-foreground">{lab.testName}</div>
                        {lab.unit && <div className="text-xs font-normal text-muted-foreground">{lab.unit}</div>}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="font-semibold text-xs rounded-lg px-2.5 py-0.5">
                        {lab.category || "General"}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "text-lg font-black tabular-nums",
                        lab.isAbnormal ? "text-red-600 dark:text-red-400" : "text-foreground"
                      )}>
                        {lab.value}
                      </span>
                      {lab.unit && <span className="text-xs text-muted-foreground ml-1">{lab.unit}</span>}
                    </td>
                    <td className="p-4 text-xs font-medium text-muted-foreground">
                      {lab.referenceRange || "Standard reference range not specified"}
                    </td>
                    <td className="p-4">
                      {lab.isAbnormal ? (
                        <Badge variant="destructive" className="font-bold gap-1 px-2.5 py-1 rounded-full">
                          <AlertCircle className="h-3 w-3" /> Out of Range
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold gap-1 px-2.5 py-1 rounded-full">
                          <CheckCircle className="h-3 w-3" /> Normal Range
                        </Badge>
                      )}
                    </td>
                    <td className="p-4 pr-6 text-xs font-medium text-muted-foreground whitespace-nowrap">
                      {formatDate(lab.date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Diagnostic Studio Grid View */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {filteredLabs.map((lab) => (
            <LabCard key={lab.id} lab={lab} />
          ))}
        </motion.div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 border-t border-border/50">
          <p className="text-xs text-muted-foreground font-medium">
            Showing <span className="font-bold text-foreground">{(page - 1) * 50 + 1}</span> to <span className="font-bold text-foreground">{Math.min(page * 50, total)}</span> of <span className="font-bold text-foreground">{total}</span> biomarkers
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-xl font-semibold" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <span className="text-xs font-bold text-foreground px-3 py-1.5 rounded-lg bg-muted">
              {page} / {totalPages}
            </span>
            <Button variant="outline" size="sm" className="rounded-xl font-semibold" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

