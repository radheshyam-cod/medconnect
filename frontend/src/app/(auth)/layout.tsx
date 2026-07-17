import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 px-4 py-12">
      <div className="w-full max-w-[460px] mx-auto flex flex-col items-center justify-center">
        <div className="mb-6 text-center w-full">
          <div className="flex items-center justify-center gap-3">
            <Image
              src="/logo.png"
              alt="MedConnect Logo"
              width={44}
              height={44}
              className="h-10 w-10 sm:h-11 sm:w-11 object-contain shrink-0"
              priority
            />
            <h1 className="text-2xl sm:text-3xl leading-tight font-extrabold tracking-tight text-[#0c62ff] dark:text-[#3b82f6]">
              MedConnect India
            </h1>
          </div>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium tracking-normal">
            Your AI-Powered Personal Health Records
          </p>
        </div>
        {children}

        {/* Trust Badges and Support Footer (Matching Reference Design Exactly) */}
        <div className="mt-3 w-full text-center">
          <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
            <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-6 text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-400 font-medium">
              {/* HIPAA Compliant */}
              <div className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>HIPAA Compliant</span>
              </div>

              {/* Secured by Clerk */}
              <div className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Secured by</span>
                <span className="inline-flex items-center gap-0.5 font-bold text-slate-700 dark:text-slate-200 tracking-tight">
                  <svg className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" opacity="0.3"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  clerk
                </span>
              </div>

              {/* Made for India */}
              <div className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Made for India 🇮🇳</span>
              </div>
            </div>

            <div className="mt-2.5 text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-400 font-medium">
              Need help?{" "}
              <a href="/support" className="text-[#0c62ff] dark:text-[#3b82f6] hover:underline font-semibold">
                Contact support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

