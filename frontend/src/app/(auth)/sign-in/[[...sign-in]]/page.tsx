"use client";

import { SignIn } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { dark } from "@clerk/themes";

export default function SignInPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex justify-center">
      <SignIn
        appearance={{
          baseTheme: isDark ? dark : undefined,
          elements: {
            rootBox: "w-full",
            card: "shadow-lg border rounded-xl w-full",
          },
        }}
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
      />
    </div>
  );
}
