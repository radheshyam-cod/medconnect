"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserButton, useUser, useClerk } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Activity,
  FileText,
  Pill,
  FlaskConical,
  Stethoscope,
  Users,
  Search,
  Settings,
  Share2,
  Menu,
  X,
  Bell,
  Sparkles,
  ChevronRight,
  Heart,
  Command,
  Loader2,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";
import { ModeToggle } from "@/components/mode-toggle";
import { VoiceAssistant } from "@/components/voice/VoiceAssistant";
import { QuickActions } from "@/components/premium/quick-actions";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

const sidebarItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, shortcut: "D" },
  { href: "/timeline", label: "Health Timeline", icon: Activity, shortcut: "T" },
  { href: "/documents", label: "Documents", icon: FileText, shortcut: "F" },
  { href: "/medications", label: "Medications", icon: Pill, shortcut: "M" },
  { href: "/labs", label: "Lab Reports", icon: FlaskConical, shortcut: "L" },
  { href: "/doctor-summary", label: "Doctor Summary", icon: Stethoscope, shortcut: "S" },
  { href: "/family", label: "Family", icon: Users, shortcut: "G" },
  { href: "/share", label: "Secure Sharing", icon: Share2, shortcut: "H" },
  { href: "/search", label: "Search", icon: Search, shortcut: "/" },
  { href: "/settings", label: "Settings", icon: Settings, shortcut: "," },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const isAuthReady = isLoaded && !!user;

  // Sync user details to backend DB
  useEffect(() => {
    if (isAuthReady && user) {
      api.auth.sync({
        email: user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phone: user.primaryPhoneNumber?.phoneNumber || user.phoneNumbers?.[0]?.phoneNumber || "",
      }).catch((err) => console.error("Failed to sync user:", err));
    }
  }, [isAuthReady, user]);

  // Fetch counts for sidebar badges
  const { data: dashboardStats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.dashboard.getStats(),
    staleTime: 5 * 60 * 1000,
    enabled: isAuthReady,
  });

  const { data: timelineSummary } = useQuery({
    queryKey: ["timeline-summary"],
    queryFn: () => api.timeline.getSummary(),
    staleTime: 5 * 60 * 1000,
    enabled: isAuthReady,
  });

  const { data: documents } = useQuery({
    queryKey: ["documents"],
    queryFn: () => api.documents.list({ limit: 1 }),
    staleTime: 5 * 60 * 1000,
    enabled: isAuthReady,
  });

  const { data: labs } = useQuery({
    queryKey: ["labs", { page: 1, limit: 1 }],
    queryFn: () => api.labs.list({ page: 1, limit: 1 }),
    staleTime: 5 * 60 * 1000,
    enabled: isAuthReady,
  });

  const { data: medications } = useQuery({
    queryKey: ["medications", { isActive: true }],
    queryFn: () => api.medications.list({ isActive: true }),
    staleTime: 5 * 60 * 1000,
    enabled: isAuthReady,
  });

  // Badge counts from API
  const badgeCounts: Record<string, number> = {
    "/documents": dashboardStats?.totalDocuments ?? documents?.total ?? 0,
    "/timeline": timelineSummary?.totalEvents ?? 0,
    "/labs": labs?.total ?? 0,
    "/medications": medications?.length ?? dashboardStats?.activeMedications ?? 0,
    "/family": 0,
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();
      if (key === "/") {
        e.preventDefault();
        setShowSearch(true);
        return;
      }

      const shortcutMap: Record<string, string> = {
        d: "/dashboard", t: "/timeline", f: "/documents",
        m: "/medications", l: "/labs", s: "/doctor-summary",
        g: "/family", h: "/share", ",": "/settings",
      };

      if (e.metaKey || e.ctrlKey) {
        const path = shortcutMap[key];
        if (path) {
          e.preventDefault();
          router.push(path);
        }
        if (key === "k") {
          e.preventDefault();
          setShowSearch(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setShowSearch(false);
    }
  }, [searchQuery, router]);

  if (!isAuthReady) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Command palette overlay */}
      {showSearch && (
        <div className="fixed inset-0 z-50" onClick={() => setShowSearch(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg p-4">
            <div className="rounded-2xl border bg-background shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <form onSubmit={handleSearch} className="flex items-center gap-3 border-b px-4 py-3">
                <Search className="h-5 w-5 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder="Search across all records..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                  ESC
                </kbd>
              </form>
              <div className="p-2 text-xs text-muted-foreground">
                <div className="px-2 py-1.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">Quick Navigation</p>
                  <div className="mt-1 space-y-0.5">
                    {sidebarItems.map((item) => (
                      <button
                        key={item.href}
                        onClick={() => { router.push(item.href); setShowSearch(false); }}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                      >
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                        <span>{item.label}</span>
                        <kbd className="ml-auto text-[10px] text-muted-foreground/60">
                          {item.shortcut === "/" ? "⌘K" : `⌘${item.shortcut.toUpperCase()}`}
                        </kbd>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Premium Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-sidebar transition-transform duration-300 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand */}
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 font-semibold text-sidebar-foreground group"
          >
            <Image
              src="/logo.png"
              alt="MedConnect Logo"
              width={32}
              height={32}
              className="h-8 w-8 object-contain shrink-0 transition-transform group-hover:scale-105"
              priority
            />
            <span className="text-base font-extrabold tracking-tight text-[#0c62ff] dark:text-[#3b82f6]">MedConnect</span>
            <span className="rounded-md bg-[#0c62ff]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#0c62ff] dark:text-[#3b82f6]">AI</span>
          </Link>
          <button
            className="ml-auto lg:hidden text-sidebar-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-none">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            const count = badgeCounts[item.href];
            const hasCount = count > 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isActive ? "text-primary" : "group-hover:scale-110"
                )} />
                <span className="flex-1">{item.label}</span>

                {/* Badge count */}
                {hasCount && (
                  <span className={cn(
                    "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-sidebar-accent text-sidebar-foreground group-hover:bg-sidebar-accent"
                  )}>
                    {count > 99 ? "99+" : count}
                  </span>
                )}

                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section: User */}
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2.5 rounded-lg bg-sidebar-accent/30 border border-sidebar-border/40 p-2.5 transition-all hover:bg-sidebar-accent/60">
            <div className="shrink-0 pointer-events-none select-none">
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user?.fullName || "User Avatar"}
                  className="h-8 w-8 rounded-lg object-cover border border-sidebar-border/60 shadow-xs"
                />
              ) : (
                <div className="pointer-events-none select-none [&_*]:pointer-events-none [&_.cl-userButtonAvatarBox]:!rounded-lg">
                  <UserButton
                    afterSignOutUrl="/sign-in"
                    appearance={{ elements: { userButtonAvatarBox: "rounded-lg" } }}
                  />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-sidebar-foreground">
                {user?.fullName || user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "User"}
              </p>
              <p
                className="text-[11px] font-medium text-sidebar-foreground/70 truncate"
                title={user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || ""}
              >
                {user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "No email"}
              </p>
            </div>
            <button
              onClick={() => signOut({ redirectUrl: "/sign-in" })}
              className="shrink-0 rounded-md p-1.5 text-destructive hover:bg-destructive/15 transition-all"
              title="Log out"
            >
              <LogOut className="h-4 w-4 text-destructive" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header bar */}
        <header className="flex h-14 items-center border-b bg-background/80 backdrop-blur-md px-4 lg:px-6 sticky top-0 z-30">
          <button
            className="mr-3 lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 mr-3 lg:hidden"
          >
            <Image
              src="/logo.png"
              alt="MedConnect Logo"
              width={26}
              height={26}
              className="h-6 w-6 object-contain shrink-0"
            />
            <span className="font-extrabold text-base tracking-tight text-[#0c62ff] dark:text-[#3b82f6]">MedConnect</span>
          </Link>

          {/* Search bar */}
          <div className="flex-1 max-w-md ml-0 lg:ml-2">
            <button
              onClick={() => setShowSearch(true)}
              className="group relative flex w-full items-center gap-2 rounded-lg border border-input bg-muted/30 px-3 py-1.5 text-sm text-muted-foreground transition-all hover:border-primary/30 hover:bg-muted/50 hover:text-foreground"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left text-xs">Search across records...</span>
              <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-background px-1.5 text-[10px] font-medium text-muted-foreground/60">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </button>
          </div>

          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <ModeToggle />
            <button className="relative rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-all">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-destructive">
                <span className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-75" />
              </span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 scrollbar-none">
          {children}
        </main>
      </div>

      {/* Global Voice Assistant FAB */}
      <VoiceAssistant position="bottom-right" />

      {/* Quick Actions FAB */}
      <QuickActions />
    </div>
  );
}
