"use client";

import { motion } from "framer-motion";
import { Upload, FileText, Mic, Stethoscope, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import Link from "next/link";

interface QuickAction {
  label: string;
  icon: any;
  href?: string;
  onClick?: () => void;
  color: string;
  bg: string;
}

interface QuickActionsProps {
  onUpload?: () => void;
  onVoiceAssistant?: () => void;
  className?: string;
}

export function QuickActions({ onUpload, onVoiceAssistant, className }: QuickActionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const actions: QuickAction[] = [
    { label: "Upload Document", icon: Upload, onClick: onUpload, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-950/50" },
    { label: "Voice Query", icon: Mic, onClick: onVoiceAssistant, color: "text-purple-500", bg: "bg-purple-100 dark:bg-purple-950/50" },
    { label: "New Timeline Entry", icon: FileText, href: "/timeline", color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-950/50" },
    { label: "Doctor Summary", icon: Stethoscope, href: "/doctor-summary", color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-950/50" },
  ];

  return (
    <div className={cn("fixed bottom-6 left-6 z-40", className)}>
      {/* Action items */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute bottom-16 left-0 space-y-2"
        >
          {actions.map((action, i) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              {action.href ? (
                <Link
                  href={action.href}
                  className="flex items-center gap-2 rounded-lg bg-background border shadow-lg px-3 py-2 hover:bg-accent transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", action.bg)}>
                    <action.icon className={cn("h-4 w-4", action.color)} />
                  </div>
                  <span className="text-xs font-medium whitespace-nowrap">{action.label}</span>
                </Link>
              ) : (
                <button
                  onClick={() => { action.onClick?.(); setIsOpen(false); }}
                  className="flex items-center gap-2 rounded-lg bg-background border shadow-lg px-3 py-2 hover:bg-accent transition-colors w-full text-left"
                >
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", action.bg)}>
                    <action.icon className={cn("h-4 w-4", action.color)} />
                  </div>
                  <span className="text-xs font-medium whitespace-nowrap">{action.label}</span>
                </button>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* FAB button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full shadow-xl transition-all",
          isOpen
            ? "bg-destructive text-destructive-foreground shadow-destructive/30 rotate-45"
            : "bg-primary text-primary-foreground shadow-primary/30"
        )}
        aria-label={isOpen ? "Close quick actions" : "Open quick actions"}
      >
        <Plus className="h-5 w-5 transition-transform" />
      </motion.button>
    </div>
  );
}
