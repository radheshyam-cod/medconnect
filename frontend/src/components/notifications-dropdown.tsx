"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Pill,
  FileText,
  Share2,
  Calendar,
  FlaskConical,
  Users,
  Info,
  CheckCheck,
  Loader2,
  X,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/use-notifications";
import type { NotificationItem } from "@/lib/api-client";

const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
  MEDICATION_REMINDER: { icon: Pill, color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-950/50" },
  DOCUMENT_PROCESSED: { icon: FileText, color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-950/50" },
  SHARE_ACCESSED: { icon: Share2, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-950/50" },
  APPOINTMENT_REMINDER: { icon: Calendar, color: "text-violet-500", bg: "bg-violet-100 dark:bg-violet-950/50" },
  LAB_ABNORMAL: { icon: FlaskConical, color: "text-red-500", bg: "bg-red-100 dark:bg-red-950/50" },
  FAMILY_INVITE: { icon: Users, color: "text-cyan-500", bg: "bg-cyan-100 dark:bg-cyan-950/50" },
  SYSTEM: { icon: Info, color: "text-muted-foreground", bg: "bg-muted/50" },
};

function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead, isMarkingAll, isLoading } = useNotifications();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="relative rounded-full p-2 text-muted-foreground/60 hover:text-foreground hover:bg-accent/50 transition-all"
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground tabular-nums">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 origin-top-right z-50"
        >
          <div className="rounded-xl border border-border/50 bg-background/80 backdrop-blur-2xl shadow-2xl shadow-primary/5 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground/60" />
                <span className="text-sm font-semibold">Notifications</span>
                {unreadCount > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive/10 px-1.5 text-[9px] font-bold text-destructive tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={isMarkingAll}
                  className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                >
                  {isMarkingAll ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <CheckCheck className="h-3 w-3" />
                  )}
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[360px] overflow-y-auto scrollbar-none">
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                    <Bell className="h-5 w-5 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground/70">No notifications</p>
                  <p className="text-[11px] text-muted-foreground/40 mt-0.5">You&apos;re all caught up!</p>
                </div>
              ) : (
                <div className="py-1">
                  {notifications.map((notif: NotificationItem) => {
                    const cfg = typeConfig[notif.type] || typeConfig.SYSTEM;
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={notif.id}
                        onClick={() => {
                          if (!notif.isRead) markAsRead(notif.id);
                        }}
                        className={cn(
                          "flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent/30",
                          !notif.isRead && "bg-primary/[0.02]",
                        )}
                      >
                        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5", cfg.bg)}>
                          <Icon className={cn("h-4 w-4", cfg.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn("text-xs", !notif.isRead ? "font-semibold text-foreground" : "text-muted-foreground/80")}>
                              {notif.title}
                            </p>
                            <span className="shrink-0 text-[10px] text-muted-foreground/40 tabular-nums mt-0.5">
                              {timeAgo(notif.createdAt)}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground/60 mt-0.5 line-clamp-2">{notif.body}</p>
                        </div>
                        {!notif.isRead && (
                          <span className="shrink-0 mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
