import { Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  DashboardStatsCards,
  DashboardRecentDocuments,
} from "./dashboard-client";
import { DashboardTimeline } from "./dashboard-timeline";
import { DashboardTimelineInsights } from "./dashboard-insights";

import { MotionList, MotionItem, MotionWrapper } from "@/components/ui/motion-wrapper";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="space-y-6">
      <MotionWrapper>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Your health at a glance
          </p>
        </div>
      </MotionWrapper>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardStatsCards />
      </div>

      {/* AI Timeline Summary */}
      <MotionWrapper delay={0.1}>
        <Card className="overflow-hidden border-primary/10">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <CardTitle className="text-sm font-medium">Timeline Insights</CardTitle>
            </div>
            <CardDescription>
              AI-powered analysis of your recent health activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardTimelineInsights />
          </CardContent>
        </Card>
      </MotionWrapper>

      <MotionList className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <MotionItem className="lg:col-span-4">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Health Timeline</CardTitle>
              <CardDescription>
                Your recent health events in chronological order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DashboardTimeline />
            </CardContent>
          </Card>
        </MotionItem>
        <MotionItem className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
              <CardDescription>
                Latest uploaded documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DashboardRecentDocuments />
            </CardContent>
          </Card>
        </MotionItem>
      </MotionList>
    </div>
  );
}
