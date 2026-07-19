"use client";

import { SignUp } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { dark } from "@clerk/themes";
import Link from "next/link";

export default function SignUpPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex flex-col items-center w-full max-w-[440px] mx-auto">
      {/* Main White Card Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xl w-full p-6 sm:p-8 flex flex-col justify-center relative overflow-hidden">
        {/* Top Blue Shield Badge */}
        <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#0c62ff] dark:text-[#3b82f6] flex items-center justify-center mx-auto mb-4 shadow-sm border border-blue-100 dark:border-blue-900/40 shrink-0 transition-transform hover:scale-105">
          <svg className="w-6 sm:w-7 h-6 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>

        <div className="w-full flex justify-center">
          <SignUp
            appearance={{
              baseTheme: isDark ? dark : undefined,
              elements: {
                rootBox: "w-full !w-full flex justify-center",
                cardBox: "shadow-none !shadow-none border-0 !border-0 !rounded-none w-full !max-w-full !w-full !p-0 !m-0 bg-transparent !bg-transparent dark:!bg-transparent flex flex-col justify-center",
                card: "shadow-none !shadow-none border-0 !border-0 !rounded-none w-full !max-w-full !w-full !p-0 !m-0 bg-transparent !bg-transparent dark:!bg-transparent flex flex-col justify-center",
                main: "w-full !px-3 sm:!px-6 flex flex-col !gap-3.5",
                badge: "hidden !hidden",
                socialButtonsBlockButtonBadge: "hidden !hidden",
                socialButtonsBadge: "hidden !hidden",
                formFieldOptionalHint: "hidden !hidden",
                footer: "hidden !hidden",
                footerAction: "hidden !hidden",
                headerTitle: "text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white text-center !mb-1.5",
                headerSubtitle: "text-slate-500 dark:text-slate-400 font-normal text-xs sm:text-[13px] text-center !mb-4",
                socialButtonsBlockButton: "w-full !h-11 !min-h-11 !max-h-11 !px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-center justify-center gap-3",
                socialButtonsBlockButtonText: "font-semibold text-sm text-slate-700 dark:text-slate-200",
                dividerRow: "!my-4 flex items-center justify-center gap-3",
                dividerLine: "bg-slate-200 dark:bg-slate-800 h-[1px] flex-1",
                dividerText: "text-xs font-semibold text-slate-400 uppercase tracking-wider px-2",
                form: "flex flex-col !gap-3.5 !row-gap-3.5 w-full",
                formFieldRow: "!mb-0 flex !gap-x-4 !column-gap-4",
                formField: "!mb-0 flex flex-col !gap-1.5 !row-gap-1.5 w-full",
                formFieldLabelRow: "!mb-0 !pb-0 flex justify-between items-center",
                formFieldLabel: "!mb-0 !pb-0 !leading-tight font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-300",
                formFieldInput: "w-full !h-11 !min-h-11 !max-h-11 !px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-sm font-medium focus:bg-white dark:focus:bg-slate-900 focus:border-[#0c62ff] focus:ring-2 focus:ring-[#0c62ff]/20 transition-all outline-none text-slate-900 dark:text-white placeholder:text-slate-400",
                formActions: "!mt-3 !pt-0 w-full",
                formButtonPrimary: "w-full !h-11 !min-h-11 !max-h-11 !px-4 !mt-0 bg-[#0c62ff] hover:bg-[#0c62ff]/90 text-white rounded-xl font-bold shadow-md shadow-[#0c62ff]/20 hover:shadow-lg hover:shadow-[#0c62ff]/30 transition-all text-sm flex items-center justify-center tracking-wide",
                identityPreviewText: "font-semibold text-sm text-slate-700 dark:text-slate-200",
                identityPreviewEditButtonIcon: "text-[#0c62ff] dark:text-[#3b82f6]",
              },
            }}
            path="/sign-up"
            routing="path"
            signInUrl="/sign-in"
            forceRedirectUrl="/onboarding"
            fallbackRedirectUrl="/onboarding"
          />
        </div>
      </div>

      {/* Switch Link Outside Below the Card */}
      <div className="mt-4 text-xs text-slate-600 dark:text-slate-400 font-medium text-center">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-[#0c62ff] dark:text-[#3b82f6] hover:underline font-semibold ml-1">
          Sign in
        </Link>
      </div>
    </div>
  );
}
