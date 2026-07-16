"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import api from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Pill,
  FlaskConical,
  FileText,
  Search,
  Loader2,
  Calendar,
  Stethoscope,
  AlertCircle,
  Sparkles,
  ChevronRight,
  X,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { motion } from "framer-motion";

const typeConfig: Record<string, { icon: any; color: string; bg: string; href: (id: string) => string }> = {
  TIMELINE: { icon: Activity, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-950/50", href: (id) => `/timeline?id=${id}` },
  MEDICATION: { icon: Pill, color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-950/50", href: (id) => `/medications` },
  LAB_RESULT: { icon: FlaskConical, color: "text-purple-500", bg: "bg-purple-100 dark:bg-purple-950/50", href: (id) => `/labs` },
  DOCUMENT: { icon: FileText, color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-950/50", href: (id) => `/documents/${id}` },
};

function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);

  const { data: results, isLoading, isError } = useQuery({
    queryKey: ["search", query],
    queryFn: () => api.search.query(query),
    enabled: !!query,
  });

  // Group results by type
  const groupedResults = results?.reduce((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {} as Record<string, typeof results>) ?? {};

  const typeOrder = ["DOCUMENT", "TIMELINE", "MEDICATION", "LAB_RESULT"];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Search Bar */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-4">Search</h1>
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across all your records..."
            className="flex h-12 w-full rounded-xl border border-input bg-muted/30 pl-11 pr-10 py-1 text-base transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:bg-background"
            autoFocus
          />
          {query && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setQuery("")}
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </form>
      </div>

      {/* Results */}
      {!query && (
        <div className="flex flex-col items-center justify-center h-[40vh] text-center">
          <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <Search className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-medium tracking-tight">Search your records</h2>
          <p className="text-muted-foreground mt-2 max-w-sm">
            Search across documents, timeline events, medications, lab results, and clinical summaries.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge variant="outline" className="cursor-pointer" onClick={() => setQuery("blood test")}>blood test</Badge>
            <Badge variant="outline" className="cursor-pointer" onClick={() => setQuery("fever")}>fever</Badge>
            <Badge variant="outline" className="cursor-pointer" onClick={() => setQuery("paracetamol")}>paracetamol</Badge>
          </div>
        </div>
      )}

      {query && isLoading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Searching for &ldquo;{query}&rdquo;...</p>
        </div>
      )}

      {query && isError && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-10 w-10 text-destructive mb-3" />
            <p className="font-semibold">Search failed</p>
            <p className="text-sm text-muted-foreground mt-1">Please try again.</p>
          </CardContent>
        </Card>
      )}

      {query && !isLoading && !isError && results && results.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold">No results found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              We couldn&apos;t find any records matching &ldquo;{query}&rdquo;.
            </p>
            <div className="flex gap-2 mt-4">
              <Badge variant="outline" className="cursor-pointer" onClick={() => setQuery("")}>Clear search</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {query && !isLoading && !isError && results && results.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Found {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
          </p>

          <div className="space-y-6">
            {typeOrder.map((type) => {
              const items = groupedResults[type];
              if (!items || items.length === 0) return null;
              const config = typeConfig[type];

              return (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn("flex h-6 w-6 items-center justify-center rounded-md", config?.bg)}>
                      {config && <config.icon className={cn("h-3.5 w-3.5", config.color)} />}
                    </div>
                    <h3 className="text-sm font-semibold capitalize">{type.toLowerCase().replace("_", " ")}s</h3>
                    <span className="text-xs text-muted-foreground">({items.length})</span>
                  </div>

                  <div className="space-y-2">
                    {items.map((result: any, i: number) => {
                      const cfg = typeConfig[result.type] || typeConfig.DOCUMENT;
                      const Icon = cfg.icon;

                      return (
                        <Link
                          key={`${result.id}-${i}`}
                          href={cfg.href(result.id)}
                          className="flex items-start gap-3 rounded-xl border p-4 transition-all hover:shadow-md hover:border-primary/20 group"
                        >
                          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", cfg.bg)}>
                            <Icon className={cn("h-5 w-5", cfg.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium group-hover:text-primary transition-colors">{result.title}</p>
                                {result.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{result.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Badge variant="outline" className="text-[9px] h-4">
                                {result.type === "TIMELINE" ? "Timeline" : result.type === "MEDICATION" ? "Medication" : result.type === "LAB_RESULT" ? "Lab" : "Document"}
                              </Badge>
                              {result.date && (
                                <span className="text-[10px] text-muted-foreground">{formatDate(result.date)}</span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
      <SearchResults />
    </Suspense>
  );
}
