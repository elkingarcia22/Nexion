"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      // Si no hay cliente Supabase, usar modo demo
      if (!supabase) {
        const isDemo = typeof window !== 'undefined' && localStorage.getItem('NEXION_DEMO_MODE') === 'true';
        if (isDemo) {
          router.push("/day/today");
        } else {
          router.push("/auth/login");
        }
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          router.push("/day/today");
        } else {
          router.push("/auth/login");
        }
      } catch (error) {
        // Error de Supabase → ir a login
        router.push("/auth/login");
      }
    };

    checkAuth();
  }, [router]);

  return null;
}
