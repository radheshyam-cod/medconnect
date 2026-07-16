"use client";

import { useState } from "react";
import api from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  Loader2,
  FileJson,
  User,
  Bell,
  Shield,
  Palette,
  Monitor,
  Smartphone,
  Globe,
  Heart,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function SettingsPage() {
  const [isExporting, setIsExporting] = useState(false);
  const { theme, setTheme } = useTheme();

  const handleExportFHIR = async () => {
    try {
      setIsExporting(true);
      await api.fhir.export();
      toast.success("FHIR data exported successfully!");
    } catch (error) {
      toast.error("Failed to export FHIR data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const settings = [
    {
      icon: User,
      title: "Account",
      description: "Manage your personal information and profile settings",
      items: [
        { label: "Full Name", value: "—" },
        { label: "Email", value: "—" },
        { label: "Phone", value: "—" },
      ],
      color: "text-blue-500",
      bg: "bg-blue-100 dark:bg-blue-950/50",
    },
    {
      icon: Palette,
      title: "Appearance",
      description: "Customize your theme and display preferences",
      action: (
        <div className="flex items-center gap-2">
          {["light", "dark", "system"].map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                theme === t
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input hover:border-primary/30 hover:bg-accent"
              )}
            >
              {t === "light" ? <Monitor className="h-3.5 w-3.5" /> : t === "dark" ? <Smartphone className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      ),
      color: "text-purple-500",
      bg: "bg-purple-100 dark:bg-purple-950/50",
    },
    {
      icon: Bell,
      title: "Notifications",
      description: "Configure reminders and notification preferences",
      items: [
        { label: "Medication Reminders", value: "Enabled" },
        { label: "Appointment Alerts", value: "Enabled" },
        { label: "Weekly Summary", value: "Disabled" },
      ],
      color: "text-amber-500",
      bg: "bg-amber-100 dark:bg-amber-950/50",
    },
    {
      icon: Shield,
      title: "Privacy & Security",
      description: "Control data sharing and access permissions",
      items: [
        { label: "Data Encryption", value: "Enabled" },
        { label: "Two-Factor Auth", value: "Not configured" },
        { label: "Session Management", value: "Active sessions: 1" },
      ],
      color: "text-emerald-500",
      bg: "bg-emerald-100 dark:bg-emerald-950/50",
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your account, preferences, and data.</p>
      </div>

      <div className="grid gap-6">
        {/* Settings Cards */}
        <div className="grid gap-4">
          {settings.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", section.bg)}>
                      <section.icon className={cn("h-4 w-4", section.color)} />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{section.title}</CardTitle>
                      <CardDescription>{section.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {section.items && (
                    <div className="space-y-2">
                      {section.items.map((item) => (
                        <div key={item.label} className="flex items-center justify-between py-1.5 text-sm">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium text-xs">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {section.action && <div className="py-1">{section.action}</div>}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* FHIR Export */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-primary/10">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <FileJson className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm">Data Export (FHIR)</CardTitle>
                  <CardDescription>
                    Download your health records in the standardized HL7 FHIR JSON format.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="bg-muted/30 p-4 rounded-lg border text-sm text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">What is included?</p>
                <ul className="space-y-1">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Patient Demographics</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Timeline Events (Conditions, Encounters)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Medications</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Lab Results</span>
                  </li>
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleExportFHIR} disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {isExporting ? "Generating Export..." : "Export FHIR Bundle"}
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
