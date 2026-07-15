"use client";

import { useState } from "react";
import api from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, FileJson } from "lucide-react";

export default function SettingsPage() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportFHIR = async () => {
    try {
      setIsExporting(true);
      await api.fhir.export();
    } catch (error) {
      console.error(error);
      alert("Failed to export FHIR data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and data preferences.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" /> Data Export (FHIR)
            </CardTitle>
            <CardDescription>
              Download a complete copy of your health records in the standardized HL7 FHIR (Fast Healthcare Interoperability Resources) JSON format. 
              This standard format can be easily imported into other Electronic Health Record (EHR) systems or shared with medical professionals.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/30 p-4 rounded-md border text-sm text-muted-foreground">
              <strong>What is included?</strong>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Patient Demographics</li>
                <li>Timeline Events (Conditions, Encounters)</li>
                <li>Medications</li>
                <li>Lab Results</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleExportFHIR} disabled={isExporting}>
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {isExporting ? "Generating Export..." : "Export FHIR Bundle"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
