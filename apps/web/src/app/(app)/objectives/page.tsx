"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { syncObjectives, getObjectives, getInitiatives } from "@/lib/services/objectives-service";
import { getUserWorkspace } from "@/lib/services/workspace-service";
import ObjectivesTab from "@/components/day/ObjectivesTab";
import CreateObjectiveDrawer from "@/components/objectives/CreateObjectiveDrawer";

export default function ObjectivesPage() {
  const [objectives, setObjectives] = useState<any[]>([]);
  const [initiatives, setInitiatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function init() {
      console.log("[ObjectivesPage] Initializing...");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUser(session.user);

      const wsResult = await getUserWorkspace(session.user.id);
      if (wsResult.success && wsResult.data) {
        setWorkspaceId(wsResult.data.id);
        loadData(wsResult.data.id);
      } else {
        setLoading(false);
      }
    }
    init();
  }, []);

  async function loadData(wsId: string) {
    setLoading(true);
    setIsSyncing(true);
    try {
      // Auto-sync on load
      await syncObjectives(wsId);
      
      const { data: objs } = await getObjectives(wsId);
      const { data: inis } = await getInitiatives(wsId);
      
      setObjectives(objs || []);
      setInitiatives(inis || []);
    } catch (error) {
      console.error("[ObjectivesPage] Error loading data:", error);
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }

  const userFullName = user?.user_metadata?.full_name || "Usuario";

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-500">
      {/* Page header - Matching Day module style exactly */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-black text-navy uppercase tracking-tight">Estrategia</h1>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsCreateDrawerOpen(true)}
            className="px-6 py-3 rounded-2xl border border-primary/30 text-primary text-[12px] font-black tracking-widest uppercase hover:bg-primary/5 transition-all flex items-center gap-2 shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            NUEVO OBJETIVO
          </button>

          <button
            onClick={() => workspaceId && loadData(workspaceId)}
            disabled={isSyncing}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[12px] font-black tracking-widest text-white shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-20 disabled:grayscale disabled:hover:translate-y-0 ${isSyncing ? "animate-pulse shadow-primary/50 ring-4 ring-primary/10" : ""}`}
            style={{ background: "linear-gradient(135deg, #1a6bff 0%, #2ec6ff 100%)" }}
          >
            {isSyncing ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                SINCRONIZANDO...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>
                </svg>
                SINCRONIZAR
              </>
            )}
          </button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary animate-spin rounded-full" />
          <p className="text-sm font-black text-navy/20 uppercase tracking-widest">Cargando visión estratégica...</p>
        </div>
      ) : (
        <ObjectivesTab 
          objectives={objectives} 
          initiatives={initiatives} 
          isSyncing={isSyncing} 
        />
      )}

      {/* CREATE OBJECTIVE DRAWER */}
      {workspaceId && isCreateDrawerOpen && (
        <CreateObjectiveDrawer 
          open={isCreateDrawerOpen}
          onClose={() => setIsCreateDrawerOpen(false)}
          onSuccess={() => loadData(workspaceId)}
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
}



