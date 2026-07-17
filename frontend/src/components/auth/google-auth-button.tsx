"use client";

import { useSignIn } from "@clerk/nextjs";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export function GoogleAuthButton({ mode = "sign-in" }: { mode?: "sign-in" | "sign-up" }) {
  const { signIn, isLoaded } = useSignIn();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleAuth = async () => {
    if (!isLoaded || !signIn) return;
    try {
      setIsLoading(true);
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard",
      });
    } catch (err) {
      console.error("Google auth error:", err);
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleGoogleAuth}
      disabled={isLoading || !isLoaded}
      type="button"
      className="group relative flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-800/80 disabled:opacity-70"
    >
      <div className="flex items-center gap-3">
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin text-[#0c62ff]" />
        ) : (
          <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.1 8.9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
            />
            <path
              fill="#FBBC05"
              d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7c-.8 1.5-1.3 3.2-1.3 5s.5 3.5 1.3 5l3.7-2.2z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5.2L1.6 16C3.5 19.8 7.4 23 12 23z"
            />
          </svg>
        )}
      </div>

      <span className="flex-1 text-center font-semibold text-[#0a192f] dark:text-white text-base">
        Continue with Google
      </span>

      <span className="flex items-center justify-center rounded-lg bg-[#d1fae5] px-3 py-1 text-xs font-semibold text-[#059669] dark:bg-emerald-950/60 dark:text-emerald-400">
        Recommended
      </span>
    </button>
  );
}
