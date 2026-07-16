"use client";

import { cn } from "@/lib/utils";

interface PageSkeletonProps {
  className?: string;
  type?: "default" | "dashboard" | "documents" | "timeline" | "list";
}

export function PageSkeleton({ className, type = "default" }: PageSkeletonProps) {
  if (type === "dashboard") {
    return (
      <div className={cn("space-y-6", className)}>
        {/* Header */}
        <div className="space-y-2">
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-4 w-72" />
        </div>

        {/* Health score + stat cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="skeleton h-36 rounded-xl" />
          <div className="skeleton h-36 rounded-xl" />
          <div className="skeleton h-36 rounded-xl" />
          <div className="skeleton h-36 rounded-xl" />
        </div>

        {/* Main grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="lg:col-span-4 space-y-4">
            <div className="skeleton h-8 w-32" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="skeleton h-12 w-12 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-1/3" />
                  <div className="skeleton h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
          <div className="lg:col-span-3 space-y-4">
            <div className="skeleton h-8 w-32" />
            <div className="skeleton h-48 rounded-xl" />
            <div className="skeleton h-32 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (type === "documents") {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="skeleton h-8 w-40" />
            <div className="skeleton h-4 w-56" />
          </div>
          <div className="skeleton h-9 w-36 rounded-lg" />
        </div>
        <div className="flex gap-2">
          <div className="skeleton h-8 w-20 rounded-full" />
          <div className="skeleton h-8 w-20 rounded-full" />
          <div className="skeleton h-8 w-24 rounded-full" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (type === "timeline") {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="space-y-2">
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-4 w-72" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
        <div className="flex gap-2">
          <div className="skeleton h-8 w-24 rounded-full" />
          <div className="skeleton h-8 w-20 rounded-full" />
          <div className="skeleton h-8 w-20 rounded-full" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="skeleton h-12 w-12 rounded-full shrink-0" />
              <div className="flex-1 skeleton h-32 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default / list skeleton
  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-4 w-64" />
        </div>
        <div className="skeleton h-9 w-32 rounded-lg" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="skeleton h-40 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
