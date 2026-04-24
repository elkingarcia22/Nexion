"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { syncObjectives, getObjectives, getInitiatives } from "@/lib/services/objectives-service";
import { ObjectivesTab } from "@/components/day/ObjectivesTab";

export default function ObjectivesPage() {
  const [objectives, setObjectives] = useState<any[]>([]);
  const [initiatives, setInitiatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get workspace
      const { data: memberships } = await supabase
        .from("workspace_memberships")
        .select("workspace_id")
        .eq("profile_id", session.user.id)
        .limit(1);

      if (memberships && memberships[0]) {
        const wsId = memberships[0].workspace_id;
        setWorkspaceId(wsId);
        loadData(wsId);
      }
    }
    init();
  }, []);

  async function loadData(wsId: string) {
    setLoading(true);
    const { data: objs } = await getObjectives(wsId);
    const { data: inis } = await getInitiatives(wsId);
    setObjectives(objs || []);
    setInitiatives(inis || []);
    setLoading(false);
  }

  async function handleSync() {
    if (!workspaceId) return;
    setIsSyncing(true);
    const result = await syncObjectives(workspaceId);
    if (result.success) {
      await loadData(workspaceId);
    } else {
      alert("Error al sincronizar objetivos: " + (result.error as any)?.message);
    }
    setIsSyncing(false);
  }

  return (
    <div className="p-8 md:p-12 space-y-10 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Header with Sync Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/10 pb-10">
        <div>
          <h1 className="text-4xl font-black text-navy tracking-tight mb-3 italic uppercase">Panel Estratégico</h1>
          <p className="text-navy/50 font-medium max-w-2xl">
            Sincronización en tiempo real de OKRs e Iniciativas desde Google Sheets para visibilidad operativa inmediata.
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={isSyncing}
          className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black tracking-widest text-xs uppercase transition-all shadow-lg ${
            isSyncing 
              ? "bg-navy/5 text-navy/30 cursor-not-allowed shadow-none" 
              : "bg-primary text-white hover:bg-bright hover:shadow-primary/40 hover:-translate-y-1 active:translate-y-0"
          }`}
        >
          {isSyncing ? (
            <>
              <div className="w-4 h-4 border-2 border-navy/20 border-t-navy/50 animate-spin rounded-full" />
              Sincronizando...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <polyline points="21 3 21 8 16 8" />
              </svg>
              Sincronizar ahora
            </>
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary animate-spin rounded-full" />
          <p className="text-sm font-black text-navy/20 uppercase tracking-widest">Cargando visión estratégica...</p>
        </div>
      ) : objectives.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 text-center gap-6">
          <div className="w-24 h-24 rounded-full bg-navy/5 flex items-center justify-center text-navy/20">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-navy mb-2">No hay objetivos sincronizados</h3>
            <p className="text-sm text-navy/40 max-w-xs mx-auto">
              Presiona el botón de sincronización para traer los OKRs desde Google Sheets.
            </p>
          </div>
        </div>
      ) : (
        <ObjectivesTab 
          objectives={objectives} 
          initiatives={initiatives} 
          isSyncing={isSyncing} 
        />
      )}
    </div>
  );
}
