"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [activeModules, setActiveModules] = useState<string[] | null>(null);
  const pathname = usePathname();
  const isOnboarding = pathname === "/onboarding";

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }: { data: { session: any } }) => {
      const session = data?.session;
      if (!session?.user) {
        window.location.href = "/auth/login";
        return;
      }
      if (!isOnboarding) {
        try {
          const { data: profile } = await supabase.from("profiles")
            .select("workspace_id").eq("id", session.user.id).single();
          if (profile?.workspace_id) {
            const { data: ws } = await supabase.from("workspaces")
              .select("analysis_config").eq("id", profile.workspace_id).single();
            const ac = (ws as any)?.analysis_config || {};
            const hasExistingConfig = ac.tasks?.selected_products?.length > 0 || ac.selected_responsibles?.length > 0;
            if (!ac.onboarding_completed && !hasExistingConfig) {
              window.location.href = "/onboarding";
              return;
            }
            if (ac.active_modules) setActiveModules(ac.active_modules);
          }
        } catch {}
      }
      setLoading(false);
    });
  }, [isOnboarding]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (isOnboarding) {
    return (
      <div className="min-h-screen bg-bg">
        <main className="p-4 sm:p-8">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded((v) => !v)}
        activeModules={activeModules}
      />
      <div
        className="flex-1 flex flex-col transition-all duration-300 ease-in-out"
        style={{ marginLeft: sidebarExpanded ? "224px" : "64px" }}
      >
        <Header />
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
