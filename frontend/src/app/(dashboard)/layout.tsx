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
import { PatientProvider } from "@/components/patient-context";
import { PatientSwitcher } from "@/components/patient-switcher";

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
    <PatientProvider>
    <div className="flex h-screen w-full items-center justify-center p-2 sm:p-4 lg:p-6">
      <div className="app-shell flex h-full w-full max-w-[1600px] rounded-2xl overflow-hidden relative border border-white/20 dark:border-white/10 shadow-2xl">
      {/* Command palette overlay */}
      {showSearch && (
        <div className="fixed inset-0 z-50" onClick={() => setShowSearch(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-full max-w-md p-4">
            <div className="rounded-xl border border-border/60 bg-background/80 backdrop-blur-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <form onSubmit={handleSearch} className="flex items-center gap-3 px-4 py-3">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder="Search records, medications, labs..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border/50 bg-muted/30 px-1.5 text-[9px] font-medium text-muted-foreground/60">
                  ESC
                </kbd>
              </form>
              <div className="border-t border-border/40 px-2 py-2">
                <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/40">Quick Navigation</p>
                <div className="mt-1 space-y-0.5">
                  {sidebarItems.map((item) => (
                    <button
                      key={item.href}
                      onClick={() => { router.push(item.href); setShowSearch(false); }}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
                    >
                      <item.icon className="h-3.5 w-3.5" />
                      <span>{item.label}</span>
                      <kbd className="ml-auto text-[9px] text-muted-foreground/40">
                        {item.shortcut === "/" ? "⌘K" : `⌘${item.shortcut.toUpperCase()}`}
                      </kbd>
                    </button>
                  ))}
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
              className="group flex w-full items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground/70 transition-all hover:border-border hover:bg-muted/30 hover:text-foreground/80"
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 text-left">Search records...</span>
              <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border/50 bg-background/50 px-1.5 text-[9px] font-medium text-muted-foreground/50">
                <Command className="h-2 w-2" />K
              </kbd>
            </button>
          </div>

          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center gap-1">
            <PatientSwitcher />
            <ModeToggle />
            <button className="relative rounded-full p-2 text-muted-foreground/60 hover:text-foreground hover:bg-accent/50 transition-all">
              <Bell className="h-4 w-4" />
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
    </div>
    </PatientProvider>
  );
}
