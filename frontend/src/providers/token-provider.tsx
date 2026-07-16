"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { setTokenProvider } from "@/lib/api-client";
import { setVoiceTokenProvider } from "@/services/voice.api";

export function TokenProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();

  useEffect(() => {
    // Set the global token provider for both general API and voice API clients
    const provider = async () => {
      try {
        return await getToken();
      } catch (error) {
        console.error("Error getting Clerk token:", error);
        return null;
      }
    };
    setTokenProvider(provider);
    setVoiceTokenProvider(provider);
  }, [getToken]);

  return <>{children}</>;
}
