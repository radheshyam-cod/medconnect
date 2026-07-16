"use client";

import { motion } from "framer-motion";
import { Phone, Shield, AlertTriangle, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmergencyCardProps {
  emergencyContact?: string;
  bloodGroup?: string;
  allergies?: string[];
  className?: string;
}

export function EmergencyCard({
  emergencyContact = "108",
  bloodGroup,
  allergies = [],
  className,
}: EmergencyCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4, type: "spring" }}
    >
      <Card className={cn("overflow-hidden border-red-200 dark:border-red-900/50 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20", className)}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">Emergency</h3>
                <p className="text-[10px] text-red-600/70 dark:text-red-400/70">Quick access</p>
              </div>
            </div>
            <Shield className="h-5 w-5 text-red-400/50" />
          </div>

          <div className="space-y-2 mb-4">
            <a
              href={`tel:${emergencyContact}`}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-all hover:bg-red-700"
            >
              <Phone className="h-4 w-4" />
              <span>Call {emergencyContact}</span>
            </a>

            {bloodGroup && (
              <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-400">
                <Heart className="h-3 w-3" />
                <span className="font-semibold">Blood Group: {bloodGroup}</span>
              </div>
            )}

            {allergies.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {allergies.slice(0, 3).map((a, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:text-red-400"
                  >
                    {a}
                  </span>
                ))}
                {allergies.length > 3 && (
                  <span className="text-[10px] text-red-600/70 dark:text-red-400/70">
                    +{allergies.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>

          <p className="text-[10px] text-red-600/50 dark:text-red-400/50">
            This information is visible on your emergency profile.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
