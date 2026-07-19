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
  Sparkles,
  ChevronRight,
  Heart,
  Command,
  Loader2,
  LogOut,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ModeToggle } from "@/components/mode-toggle";
import { VoiceAssistant } from "@/components/voice/VoiceAssistant";
import { QuickActions } from "@/components/premium/quick-actions";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { PatientProvider } from "@/components/patient-context";
import { PatientSwitcher } from "@/components/patient-switcher";
import { NotificationsDropdown } from "@/components/notifications-dropdown";

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
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        return JSON.parse(localStorage.getItem("medconnect-recent-searches") || "[]");
      } catch {}
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("medconnect-recent-searches", JSON.stringify(recentSearches));
  }, [recentSearches]);

  const addToRecentSearches = useCallback((query: string) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.toLowerCase() !== query.toLowerCase());
      return [query, ...filtered].slice(0, 8);
    });
  }, []);

  const removeRecentSearch = useCallback((query: string) => {
    setRecentSearches((prev) => prev.filter((s) => s !== query));
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
  }, []);

  const isAuthReady = isLoaded && !!user;

  // Sync user details to backend DB
  useEffect(() => {
    if (isAuthReady && user) {
      api.auth.sync({
        email: user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phone: user.primaryPhoneNumber?.phoneNumber || user.phoneNumbers?.[0]?.phoneNumber || "",
      }).then((res) => {
        if (!res.isOnboarded) {
          router.push("/onboarding");
        }
      }).catch((err) => console.error("Failed to sync user:", err));
    }
  }, [isAuthReady, user, router]);

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
      addToRecentSearches(searchQuery.trim());
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setShowSearch(false);
    }
  }, [searchQuery, router, addToRecentSearches]);

  const handleRecentSearchClick = useCallback((query: string) => {
    addToRecentSearches(query);
    router.push(`/search?q=${encodeURIComponent(query)}`);
    setShowSearch(false);
  }, [router, addToRecentSearches]);

  if (!isAuthReady) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PatientProvider>
    <div className="flex h-screen w-full items-center justify-center p-2 sm:p-4 lg:p-6">
      <div className="app-shell flex h-full w-full max-w-[1600px] rounded-2xl overflow-hidden relative border border-white/20 dark:border-white/10 shadow-2xl">
      {/* Command palette overlay */}
      <AnimatePresence>
      {showSearch && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50"
          onClick={() => setShowSearch(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-[18%] left-1/2 -translate-x-1/2 w-full max-w-lg p-4"
          >
            <div
              className="rounded-2xl border border-border/50 bg-background/70 backdrop-blur-2xl shadow-2xl shadow-primary/5 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleSearch} className="flex items-center gap-3 px-4 py-3.5 border-b border-border/30">
                <Search className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search records, medications, labs..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <kbd className="hidden sm:inline-flex h-5 items-center rounded-md border border-border/40 bg-muted/40 px-1.5 text-[9px] font-medium text-muted-foreground/50 shadow-sm">
                  ESC
                </kbd>
              </form>

              {/* Recent searches */}
              {recentSearches.length > 0 && !searchQuery && (
                <div className="px-2 pt-2 pb-1">
                  <div className="flex items-center justify-between px-2 py-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">Recent</p>
                    <button
                      onClick={clearRecentSearches}
                      className="text-[9px] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    {recentSearches.map((query) => (
                      <div key={query} className="group flex items-center rounded-lg hover:bg-accent/50 transition-colors">
                        <button
                          onClick={() => handleRecentSearchClick(query)}
                          className="flex flex-1 items-center gap-3 px-2 py-1.5 text-xs text-muted-foreground/80 hover:text-foreground transition-colors"
                        >
                          <Clock className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                          <span className="truncate">{query}</span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeRecentSearch(query); }}
                          className="opacity-0 group-hover:opacity-100 p-1 mr-1 rounded text-muted-foreground/30 hover:text-muted-foreground transition-all"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="px-2 py-2">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">
                  {searchQuery ? "Search" : "Quick Navigation"}
                </p>
                <div className="mt-1 space-y-0.5">
                  {sidebarItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <button
                        key={item.href}
                        onClick={() => { router.push(item.href); setShowSearch(false); }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-xs transition-all",
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                        )}
                      >
                        <item.icon className={cn("h-3.5 w-3.5 shrink-0", isActive && "text-primary")} />
                        <span>{item.label}</span>
                        <kbd className="ml-auto text-[9px] text-muted-foreground/30">
                          {item.shortcut === "/" ? "⌘K" : `⌘${item.shortcut.toUpperCase()}`}
                        </kbd>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

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
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border/50 bg-sidebar/60 backdrop-blur-2xl transition-transform duration-300 ease-out lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand */}
        <div className="flex h-14 items-center border-b border-sidebar-border/40 px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 font-semibold text-sidebar-foreground group"
          >
            <Image
              src="/logo.png"
              alt="MedConnect Logo"
              width={28}
              height={28}
              className="h-7 w-7 object-contain shrink-0 transition-transform duration-300 group-hover:scale-105"
              priority
            />
            <span className="text-sm font-bold tracking-tight text-foreground">MedConnect</span>
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">AI</span>
          </Link>
          <button
            className="ml-auto lg:hidden text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 scrollbar-none">
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
                  "nav-item group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "nav-item-active bg-accent/60 text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/30 hover:text-foreground",
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className={cn(
                  "h-4 w-4 transition-all duration-150",
                  isActive ? "text-primary" : "text-muted-foreground/60 group-hover:text-foreground/80"
                )} />
                <span className="flex-1">{item.label}</span>

                {/* Badge count */}
                {hasCount && (
                  <span className={cn(
                    "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums transition-all",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "bg-muted/50 text-muted-foreground group-hover:bg-muted"
                  )}>
                    {count > 99 ? "99+" : count}
                  </span>
                )}

                {/* Active indicator */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section: User */}
        <div className="border-t border-sidebar-border/40 p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-accent/30">
            <div className="shrink-0">
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user?.fullName || ""}
                  className="h-7 w-7 rounded-md object-cover ring-1 ring-border/50"
                />
              ) : (
                <div className="[&_.cl-userButtonAvatarBox]:!h-7 [&_.cl-userButtonAvatarBox]:!w-7 [&_.cl-userButtonAvatarBox]:!rounded-md">
                  <UserButton
                    afterSignOutUrl="/sign-in"
                    appearance={{ elements: { userButtonAvatarBox: "rounded-md" } }}
                  />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-foreground/90">
                {user?.fullName || user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "User"}
              </p>
              <p className="text-[11px] text-muted-foreground/60 truncate">
                {user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || ""}
              </p>
            </div>
            <button
              onClick={() => signOut({ redirectUrl: "/sign-in" })}
              className="shrink-0 rounded-md p-1.5 text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50 transition-all"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Top header bar */}
        <header className="flex h-14 items-center border-b border-border/50 bg-background/40 backdrop-blur-2xl px-4 lg:px-6 sticky top-0 z-30">
          <button
            className="mr-3 lg:hidden p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </button>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 mr-3 lg:hidden"
          >
            <Image
              src="/logo.png"
              alt="MedConnect Logo"
              width={22}
              height={22}
              className="h-5.5 w-5.5 object-contain shrink-0"
            />
            <span className="font-bold text-sm tracking-tight text-foreground">MedConnect</span>
          </Link>

          {/* Search bar */}
          <div className="flex-1 max-w-sm ml-0 lg:ml-3">
            <button
              onClick={() => setShowSearch(true)}
              className="group relative flex w-full items-center gap-2.5 rounded-xl border border-border/40 bg-gradient-to-r from-muted/30 to-muted/10 px-3 py-2 text-xs text-muted-foreground/60 transition-all duration-200 hover:border-primary/30 hover:from-primary/[0.04] hover:to-muted/20 hover:text-foreground/80 hover:shadow-sm hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            >
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-primary/60 transition-colors duration-200" />
              <span className="flex-1 text-left">
                <span className="hidden sm:inline">Search records...</span>
                <span className="sm:hidden">Search...</span>
              </span>
              <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded-md border border-border/30 bg-background/60 px-1.5 text-[9px] font-medium text-muted-foreground/40 shadow-sm group-hover:border-border/50 group-hover:text-muted-foreground/60 transition-all">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
              <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-black/[0.02] dark:ring-white/[0.04] pointer-events-none" />
            </button>
          </div>

          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center gap-1">
            <PatientSwitcher />
            <ModeToggle />
            <NotificationsDropdown />
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
    </div>
    </PatientProvider>
  );
}
