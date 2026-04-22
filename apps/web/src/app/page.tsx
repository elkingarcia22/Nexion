"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // Usuario autenticado → ir a /day/today
        router.push("/day/today");
      } else {
        // Usuario no autenticado → ir a /auth/login
        router.push("/auth/login");
      }
    };

    checkAuth();
  }, [router]);

  return null;
}
