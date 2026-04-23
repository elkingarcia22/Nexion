"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("DEBUG: Auth callback starting...");
        
        // 1. Check if we have tokens in the hash fragment (most reliable for provider tokens)
        let hashProviderToken = null;
        let hashRefreshToken = null;

        if (typeof window !== "undefined" && window.location.hash) {
          console.log("DEBUG: Parsing tokens from URL hash...");
          const hash = window.location.hash.substring(1);
          const params = new URLSearchParams(hash);
          
          hashProviderToken = params.get("provider_token");
          hashRefreshToken = params.get("provider_refresh_token");
          
          if (hashProviderToken) console.log("DEBUG: Found provider_token in hash fragment");
          if (hashRefreshToken) console.log("DEBUG: Found provider_refresh_token in hash fragment");
        }

        // 2. Wait for Supabase to process the session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Auth error from getSession:", error);
        }

        const session = data?.session;
        let providerToken = hashProviderToken || (session as any)?.provider_token;
        let providerRefreshToken = hashRefreshToken || (session as any)?.provider_refresh_token;

        console.log("DEBUG: Session user:", session?.user?.email || "none");
        console.log("DEBUG: Final providerToken present:", !!providerToken);
        console.log("DEBUG: Final refreshToken present:", !!providerRefreshToken);

        // 3. Save tokens explicitly
        if (providerToken) {
          localStorage.setItem("google_provider_token", providerToken);
          sessionStorage.setItem("google_provider_token", providerToken);
          console.log("DEBUG: Token saved to storage");
        }

        if (providerRefreshToken) {
          localStorage.setItem("google_provider_refresh_token", providerRefreshToken);
          sessionStorage.setItem("google_provider_refresh_token", providerRefreshToken);
          console.log("DEBUG: Refresh token saved to storage");
        }

        // 4. Force a small wait to ensure storage is committed and Supabase state is stable
        await new Promise(resolve => setTimeout(resolve, 800));

        // 5. Final check and redirect
        if (session?.user || providerToken) {
          console.log("✓ Authentication successful, redirecting...");
          // Use window.location for a harder refresh of the app state if needed, 
          // but router.push is usually fine if we wait.
          router.push("/day/today");
        } else {
          console.warn("DEBUG: Authentication failed - no session or token");
          router.push("/auth/login?error=auth_failed");
        }
      } catch (err) {
        console.error("Callback critical error:", err);
        router.push("/auth/login?error=callback_exception");
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-navy to-dark-ui">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-white text-lg">Completando autenticación...</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-navy to-dark-ui">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-white text-lg">Completando autenticación...</p>
        </div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
