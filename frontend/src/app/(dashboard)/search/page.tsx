"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import api from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Pill, FlaskConical, FileText, Search, Loader2 } from "lucide-react";
import { format } from "date-fns";

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const { data: results, isLoading } = useQuery({
    queryKey: ["search", query],
    queryFn: () => api.search.query(query),
    enabled: !!query,
  });

  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Search className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-medium tracking-tight">Search your records</h2>
        <p className="text-muted-foreground mt-2">
          Type a keyword above to search across your timelines, medications, labs, and documents.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Searching for "{query}"...</p>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Search className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-medium tracking-tight">No results found</h2>
        <p className="text-muted-foreground mt-2">
          We couldn't find any records matching "{query}".
        </p>
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "TIMELINE": return <Activity className="h-5 w-5 text-blue-500" />;
      case "MEDICATION": return <Pill className="h-5 w-5 text-emerald-500" />;
      case "LAB_RESULT": return <FlaskConical className="h-5 w-5 text-purple-500" />;
      case "DOCUMENT": return <FileText className="h-5 w-5 text-orange-500" />;
      default: return <Search className="h-5 w-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "TIMELINE": return "Timeline Event";
      case "MEDICATION": return "Medication";
      case "LAB_RESULT": return "Lab Result";
      case "DOCUMENT": return "Document";
      default: return type;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Search Results</h1>
        <p className="text-muted-foreground">
          Found {results.length} record{results.length !== 1 ? 's' : ''} matching "{query}"
        </p>
      </div>

      <div className="grid gap-4">
        {results.map((result: any, index: number) => (
          <Card key={`${result.id}-${index}`} className="overflow-hidden hover:bg-muted/30 transition-colors">
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {getIcon(result.type)}
                  <CardTitle className="text-base">{result.title}</CardTitle>
                </div>
                <Badge variant="outline" className="text-xs">
                  {getTypeLabel(result.type)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex justify-between items-end mt-2">
                <p className="text-sm text-muted-foreground">
                  {result.description || "No additional details"}
                </p>
                <div className="text-xs text-muted-foreground font-medium">
                  {result.date ? format(new Date(result.date), "MMM d, yyyy") : ""}
                </div>
              </div>
              {result.metadata?.isAbnormal && (
                <Badge variant="destructive" className="mt-3 text-xs">Abnormal</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
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
