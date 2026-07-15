"use client";

import { SignUp } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { dark } from "@clerk/themes";

export default function SignUpPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex justify-center">
      <SignUp
        appearance={{
          baseTheme: isDark ? dark : undefined,
          elements: {
            rootBox: "w-full",
            card: "shadow-lg border rounded-xl w-full",
          },
        }}
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
      />
    </div>
  );
}
