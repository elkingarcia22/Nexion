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
        // Supabase ya procesó el callback automáticamente
        // Solo verificamos la sesión
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth error:", error);
          router.push("/auth/login?error=" + encodeURIComponent(error.message));
          return;
        }

        if (data?.session?.user) {
          // Login exitoso
          console.log("✓ User authenticated:", data.session.user.email);
          router.push("/");
        } else {
          // Sin sesión
          router.push("/auth/login?error=no_session");
        }
      } catch (err) {
        console.error("Callback error:", err);
        router.push("/auth/login?error=callback_error");
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
