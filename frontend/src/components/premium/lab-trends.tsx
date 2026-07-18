"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity } from "lucide-react";

interface LabItem {
  id: string;
  testName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  isAbnormal: boolean;
  date: string;
}

export function LabTrends({ labs }: { labs: LabItem[] }) {
  // Group labs by testName
  const groupedLabs = useMemo(() => {
    const groups: Record<string, LabItem[]> = {};
    labs.forEach(lab => {
      // Basic normalization of test names to group them together
      const normalized = lab.testName.trim().toUpperCase();
      if (!groups[normalized]) {
        groups[normalized] = [];
      }
      groups[normalized].push(lab);
    });
    
    // Sort each group chronologically
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });
    
    return groups;
  }, [labs]);

  // Find tests that have more than 1 result to show a trend
  const trendableTests = useMemo(() => {
    return Object.entries(groupedLabs)
      .filter(([_, items]) => items.length > 1)
      .map(([name, items]) => ({
        name,
        latest: items[items.length - 1],
        count: items.length
      }))
      .sort((a, b) => b.count - a.count);
  }, [groupedLabs]);

  const [selectedTest, setSelectedTest] = useState<string>(trendableTests[0]?.name || "");

  if (trendableTests.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <Activity className="h-10 w-10 mb-4 opacity-50" />
          <p>Not enough data to show trends.</p>
          <p className="text-sm mt-1">Upload multiple reports for the same lab test (e.g. Sodium) to see trends over time.</p>
        </CardContent>
      </Card>
    );
  }

  const selectedData = groupedLabs[selectedTest] || [];
  
  // Try to parse min/max from reference range (e.g., "70 - 100", "< 140")
  let minRef: number | undefined;
  let maxRef: number | undefined;
  
  const latestRef = selectedData[selectedData.length - 1]?.referenceRange;
  if (latestRef) {
    const parts = latestRef.split("-").map(p => parseFloat(p.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      minRef = parts[0];
      maxRef = parts[1];
    }
  }

  const chartData = selectedData.map(item => {
    const val = parseFloat(item.value);
    return {
      date: format(parseISO(item.date), "MMM d"),
      fullDate: item.date,
      value: isNaN(val) ? 0 : val,
      originalValue: item.value,
      isAbnormal: item.isAbnormal
    };
  });

  const unit = selectedData[0]?.unit || "";

  return (
    <Card className="shadow-sm border-primary/10 overflow-hidden">
      <CardHeader className="pb-4 bg-muted/10 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Biomarker Trends
            </CardTitle>
            <CardDescription>Track changes in your lab results over time.</CardDescription>
          </div>
          <Select value={selectedTest} onValueChange={setSelectedTest}>
            <SelectTrigger className="w-full sm:w-[250px] bg-background">
              <SelectValue placeholder="Select a test" />
            </SelectTrigger>
            <SelectContent>
              {trendableTests.map(test => (
                <SelectItem key={test.name} value={test.name}>
                  <div className="flex items-center justify-between w-full">
                    <span className="truncate pr-4">{test.latest.testName}</span>
                    <span className="text-xs text-muted-foreground ml-auto bg-muted px-1.5 rounded">
                      {test.count}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                dx={-10}
                domain={['auto', 'auto']}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: 'hsl(var(--foreground))' }}
                itemStyle={{ color: 'hsl(var(--primary))' }}
                formatter={(value: number, name: string, props: any) => [
                  `${props.payload.originalValue} ${unit}`,
                  "Result"
                ]}
              />
              
              {minRef !== undefined && (
                <ReferenceLine y={minRef} stroke="hsl(var(--emerald-500))" strokeDasharray="3 3" opacity={0.5} label={{ position: 'insideBottomLeft', value: 'Min Ref', fill: 'hsl(var(--emerald-500))', fontSize: 10 }} />
              )}
              {maxRef !== undefined && (
                <ReferenceLine y={maxRef} stroke="hsl(var(--emerald-500))" strokeDasharray="3 3" opacity={0.5} label={{ position: 'insideTopLeft', value: 'Max Ref', fill: 'hsl(var(--emerald-500))', fontSize: 10 }} />
              )}
              
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                activeDot={{ r: 6, strokeWidth: 0, fill: "hsl(var(--primary))" }}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  if (payload.isAbnormal) {
                    return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={5} fill="hsl(var(--destructive))" stroke="white" strokeWidth={2} />;
                  }
                  return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={4} fill="hsl(var(--primary))" stroke="white" strokeWidth={2} />;
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
