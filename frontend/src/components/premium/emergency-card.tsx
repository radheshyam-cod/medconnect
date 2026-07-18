"use client";

import { motion } from "framer-motion";
import { Phone, Shield, AlertTriangle, Heart, Info, ChevronRight } from "lucide-react";
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
      transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
      className={cn("h-full", className)}
    >
      <div className="flex h-full flex-col justify-between rounded-[1.5rem] border border-red-100 dark:border-red-900/40 bg-gradient-to-b from-red-50/50 to-white dark:from-red-950/20 dark:to-background p-6">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/40">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-950 dark:text-red-200">Emergency Access</h3>
            <p className="text-[11px] font-medium text-red-800/70 dark:text-red-400/70 mt-1 pr-4 leading-snug">
              Quick access to your emergency information
            </p>
          </div>
        </div>

        {/* Emergency Call Button */}
        <a
          href={`tel:${emergencyContact}`}
          className="group flex items-center justify-center gap-2 rounded-xl bg-[#e11d48] px-4 py-3.5 text-sm font-bold tracking-wide text-white transition-all hover:bg-[#be123c] active:scale-[0.98] shadow-lg shadow-red-500/20 mb-4"
        >
          <Phone className="h-4 w-4 transition-transform group-hover:scale-110" />
          <span>Call {emergencyContact}</span>
        </a>

        {/* Profile Link */}
        <div className="flex items-center justify-between cursor-pointer group rounded-xl p-2 -mx-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          <div className="flex items-center gap-3">
             <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50">
                <Shield className="h-4 w-4 text-red-600 dark:text-red-400" />
             </div>
             <div>
                <p className="text-xs font-bold text-foreground group-hover:text-red-600 transition-colors">Emergency Profile</p>
                <p className="text-[10px] font-medium text-muted-foreground mt-0.5">Last updated: 2 days ago</p>
             </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-red-600 transition-colors" />
        </div>
      </div>
    </motion.div>
  );
}
