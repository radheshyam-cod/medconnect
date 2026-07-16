"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { setTokenProvider } from "@/lib/api-client";

export function TokenProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();

  useEffect(() => {
    // Set the global token provider for the API client
    setTokenProvider(async () => {
      try {
        return await getToken();
      } catch (error) {
        console.error("Error getting Clerk token:", error);
        return null;
      }
    });
  }, [getToken]);

  return <>{children}</>;
}
