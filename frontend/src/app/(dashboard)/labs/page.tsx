import Link from "next/link";
"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { LabCard } from "@/components/premium/lab-card";
import { PageSkeleton } from "@/components/premium/page-skeleton";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const CATEGORIES = [
  { value: "", label: "All Tests" },
  { value: "BLOOD", label: "Blood" },
  { value: "URINE", label: "Urine" },
  { value: "LIPID", label: "Lipid" },
  { value: "LIVER", label: "Liver" },
  { value: "KIDNEY", label: "Kidney" },
  { value: "THYROID", label: "Thyroid" },
  { value: "OTHER", label: "Other" },
];

export default function LabsPage() {
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "abnormal">("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["labs", { page, limit: 20 }],
    queryFn: () => api.labs.list({ page, limit: 20 }),
  });

  const labs = data?.results ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  // Filter and sort
  let filteredLabs = categoryFilter ? labs.filter((l) => l.category === categoryFilter) : labs;

  filteredLabs = [...filteredLabs].sort((a, b) => {
    if (sortBy === "newest") return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortBy === "oldest") return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sortBy === "abnormal") return (b.isAbnormal ? 1 : 0) - (a.isAbnormal ? 1 : 0);
    return 0;
  });

  const abnormalCount = filteredLabs.filter((l) => l.isAbnormal).length;
  const normalCount = filteredLabs.filter((l) => !l.isAbnormal).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lab Reports</h1>
          <p className="text-muted-foreground text-sm">Track your biomarkers and test results over time</p>
        </div>
      </div>

      {/* Stats */}
      {!isLoading && labs.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{total} total tests</span>
          <span className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-emerald-500" />
            {normalCount} normal
          </span>
          {abnormalCount > 0 && (
            <span className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-red-500" />
              {abnormalCount} abnormal
            </span>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map((cat) => (
          <Badge
            key={cat.value}
            variant={categoryFilter === cat.value ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => { setCategoryFilter(cat.value); setPage(1); }}
          >
            {cat.label}
          </Badge>
        ))}
        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1 h-7"
            onClick={() => {
              const order = ["newest", "oldest", "abnormal"] as const;
              const idx = order.indexOf(sortBy);
              setSortBy(order[(idx + 1) % order.length]);
            }}
          >
            <ArrowUpDown className="h-3 w-3" />
            {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <PageSkeleton type="list" />
      ) : isError ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-10 w-10 text-destructive mb-3" />
            <p className="font-semibold">Failed to load lab results</p>
          </CardContent>
        </Card>
      ) : filteredLabs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/10 to-purple-500/5">
              <FlaskConical className="h-8 w-8 text-purple-500/60" />
            </div>
            <h3 className="text-lg font-semibold">No Lab Results Found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Upload your lab reports and our AI will automatically extract and track your biomarkers here.
            </p>
            <div className="flex gap-2 mt-4">
              <Badge variant="outline">Blood Tests</Badge>
              <Badge variant="outline">Urinalysis</Badge>
              <Badge variant="outline">Lipid Profile</Badge>
            </div>
            <Button variant="outline" className="mt-6" asChild>
              <Link href="/documents">Upload Lab Report</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(
            viewMode === "grid"
              ? "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "space-y-2"
          )}
        >
          {filteredLabs.map((lab) => (
            <LabCard key={lab.id} lab={lab} />
          ))}
        </motion.div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            Previous
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
