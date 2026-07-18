"use client";

import { SignIn } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { dark } from "@clerk/themes";
import Link from "next/link";

export default function SignInPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex flex-col items-center w-full max-w-[440px] mx-auto">
      {/* Main White Card Container matching Image 2 */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xl w-full p-6 sm:p-8 flex flex-col justify-center">
        {/* Top Blue Shield Badge */}
        <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#0c62ff] dark:text-[#3b82f6] flex items-center justify-center mx-auto mb-2 sm:mb-3 shadow-sm shrink-0">
          <svg className="w-6 sm:w-7 h-6 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>

        <div className="w-full flex justify-center">
          <SignIn
            appearance={{
              baseTheme: isDark ? dark : undefined,
              elements: {
                rootBox: "w-full flex justify-center",
                card: "shadow-none !shadow-none border-0 !border-0 !rounded-none w-full !max-w-full !w-full !p-0 !m-0 bg-transparent dark:bg-transparent flex flex-col justify-center",
                badge: "hidden !hidden",
                socialButtonsBlockButtonBadge: "hidden !hidden",
                socialButtonsBadge: "hidden !hidden",
                formFieldOptionalHint: "hidden !hidden",
                footer: "hidden !hidden",
                footerAction: "hidden !hidden",
                headerTitle: "text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white text-center !mb-1",
                headerSubtitle: "text-slate-500 dark:text-slate-400 font-normal text-xs sm:text-[13px] text-center !mb-1",
                socialButtonsBlockButton: "w-full !h-10 !min-h-10 !max-h-10 !px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-between",
                form: "flex flex-col !gap-2.5 !row-gap-2.5",
                formFieldRow: "!mb-0 flex !gap-x-4 !column-gap-4",
                formField: "!mb-0 flex flex-col !gap-1 !row-gap-1",
                formFieldLabelRow: "!mb-0 !pb-0",
                formFieldLabel: "!mb-0 !pb-0 !leading-tight font-medium text-sm text-slate-700 dark:text-slate-300",
                formActions: "!mt-2 !pt-0",
                formFieldInput: "w-full !h-10 !min-h-10 !max-h-10 !px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:border-[#0c62ff] focus:ring-1 focus:ring-[#0c62ff] transition-all",
                formButtonPrimary: "w-full !h-10 !min-h-10 !max-h-10 !px-3 !mt-0 bg-[#0c62ff] hover:bg-[#0c62ff]/90 text-white rounded-lg font-semibold shadow-sm transition-all text-sm flex items-center justify-center",
              },
            }}
            path="/sign-in"
            routing="path"
            signUpUrl="/sign-up"
          />
        </div>
      </div>

      {/* Switch Link Outside Below the Card matching Image 2 */}
      <div className="mt-3.5 text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 font-medium text-center">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="text-[#0c62ff] dark:text-[#3b82f6] hover:underline font-semibold">
          Sign up
        </Link>
      </div>
    </div>
  );
}
