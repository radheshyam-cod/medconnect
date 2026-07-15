"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Stethoscope, Pill, FlaskConical, Syringe, AlertTriangle, Activity, Calendar, Hospital, Microscope } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { api } from "@/lib/api-client";

const eventTypeIcons: Record<string, { icon: any; color: string; bg: string }> = {
  VISIT: { icon: Hospital, color: "text-blue-600", bg: "bg-blue-100" },
  DIAGNOSIS: { icon: Stethoscope, color: "text-red-600", bg: "bg-red-100" },
  MEDICATION: { icon: Pill, color: "text-purple-600", bg: "bg-purple-100" },
  LAB_TEST: { icon: FlaskConical, color: "text-emerald-600", bg: "bg-emerald-100" },
  PROCEDURE: { icon: Microscope, color: "text-orange-600", bg: "bg-orange-100" },
  IMAGING: { icon: Activity, color: "text-cyan-600", bg: "bg-cyan-100" },
  VACCINATION: { icon: Syringe, color: "text-green-600", bg: "bg-green-100" },
  ALLERGY: { icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-100" },
  HOSPITALIZATION: { icon: Hospital, color: "text-rose-600", bg: "bg-rose-100" },
  SURGERY: { icon: Microscope, color: "text-red-700", bg: "bg-red-200" },
  OTHER: { icon: Calendar, color: "text-gray-600", bg: "bg-gray-100" },
};

const EVENT_TYPES = [
  "ALL", "VISIT", "DIAGNOSIS", "MEDICATION", "LAB_TEST",
  "PROCEDURE", "IMAGING", "VACCINATION", "ALLERGY", "HOSPITALIZATION", "SURGERY",
] as const;

const typeLabels: Record<string, string> = {
  ALL: "All Events",
  VISIT: "Visits",
  DIAGNOSIS: "Diagnoses",
  MEDICATION: "Medications",
  LAB_TEST: "Lab Tests",
  PROCEDURE: "Procedures",
  IMAGING: "Imaging",
  VACCINATION: "Vaccinations",
  ALLERGY: "Allergies",
  HOSPITALIZATION: "Hospitalizations",
  SURGERY: "Surgeries",
};

export default function TimelinePage() {
  const [eventFilter, setEventFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["timeline", { eventType: eventFilter !== "ALL" ? eventFilter : undefined, page }],
    queryFn: () => api.timeline.list({
      eventType: eventFilter !== "ALL" ? eventFilter : undefined,
      page,
      limit: 20,
    }),
  });

  const { data: summary } = useQuery({
    queryKey: ["timeline-summary"],
    queryFn: () => api.timeline.getSummary(),
  });

  const events = (data as any)?.events || (Array.isArray(data) ? data : []);
  const total = (data as any)?.total || events.length;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Health Timeline</h1>
          <p className="text-muted-foreground">
            Your complete medical journey in chronological order
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
          {Object.entries(summary.byType).slice(0, 12).map(([type, count]) => {
            const config = eventTypeIcons[type] || eventTypeIcons.OTHER;
            const Icon = config.icon;
            return (
              <Card key={type} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setEventFilter(type)}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${config.bg}`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{count as number}</p>
                    <p className="text-xs text-muted-foreground">{typeLabels[type] || type}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {EVENT_TYPES.map((type) => (
          <Badge
            key={type}
            variant={eventFilter === type ? "default" : "outline"}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => { setEventFilter(type); setPage(1); }}
          >
            {typeLabels[type]}
          </Badge>
        ))}
      </div>

      {/* Timeline Events */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">No timeline events yet</p>
            <p className="text-sm text-muted-foreground">
              Upload and process documents to build your health timeline
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[23px] top-0 bottom-0 w-0.5 bg-border hidden md:block" />

          <div className="space-y-4">
            {events.map((event: any, index: number) => {
              const config = eventTypeIcons[event.eventType] || eventTypeIcons.OTHER;
              const Icon = config.icon;

              return (
                <div key={event.id} className="relative flex gap-4 md:gap-6">
                  {/* Timeline dot */}
                  <div className={`relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${config.bg} border-2 border-background`}>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>

                  {/* Content */}
                  <Card className="flex-1 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">
                              {typeLabels[event.eventType] || event.eventType}
                            </Badge>
                            {event.severity && (
                              <Badge variant={
                                event.severity === "CRITICAL" ? "destructive" :
                                event.severity === "SEVERE" ? "destructive" :
                                event.severity === "MODERATE" ? "warning" : "secondary"
                              } className="text-xs">
                                {event.severity}
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold">{event.title}</h3>
                          {event.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {event.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                            <span>{formatDate(event.eventDate)}</span>
                            {event.facility && <span>📍 {event.facility}</span>}
                            {event.doctorName && <span>👨‍⚕️ {event.doctorName}</span>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
