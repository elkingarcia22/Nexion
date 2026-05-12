"use client";

import { useState, useEffect } from "react";
import { testJiraConnection, fetchJiraIssues, JiraConfig } from "@/lib/services/jira-service";
import { getUserWorkspace, updateWorkspaceJiraConfig } from "@/lib/services/workspace-service";
import { supabase } from "@/lib/supabase";

export default function JiraSettingsPage() {
  const [workspace, setWorkspace] = useState<any>(null);
  const [config, setConfig] = useState<JiraConfig>({
    siteUrl: "",
    email: "",
    apiToken: ""
  });
  const [issues, setIssues] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [userData, setUserData] = useState<any>(null);

  // Load Workspace and existing config
  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const ws = await getUserWorkspace(user.id);
        if (ws.success && ws.data) {
          setWorkspace(ws.data);
          if ((ws.data as any).jira_config) {
            setConfig((ws.data as any).jira_config);
          }
        }
      }
    }
    loadData();
  }, []);

  const handleTestConnection = async () => {
    setStatus("testing");
    setErrorMessage("");
    setUserData(null);
    setIssues([]);

    const result = await testJiraConnection(config);

    if (result.success) {
      setStatus("success");
      setUserData(result.data);
    } else {
      setStatus("error");
      setErrorMessage(result.error || "Error desconocido");
    }
  };

  const handleSaveConfig = async () => {
    if (!workspace) return;
    setIsSaving(true);
    const result = await updateWorkspaceJiraConfig(workspace.id, config);
    if (result.success) {
      alert("¡Configuración guardada correctamente!");
    } else {
      alert("Error al guardar: " + result.error);
    }
    setIsSaving(false);
  };

  const handleFetchIssues = async () => {
    setIsFetching(true);
    const jql = 'project = "UTU" AND assignee = "60cd00d4dae5670068abf978"';
    const result = await fetchJiraIssues(config, jql);
    
    if (result.success && result.issues) {
      setIssues(result.issues);
    } else {
      alert("Error al traer tareas: " + result.error);
    }
    setIsFetching(false);
  };

  return (
    <div className="max-w-4xl mx-auto py-12 space-y-10 animate-in fade-in duration-700">
      <div className="flex items-center gap-4 mb-4">
        <a
          href="/settings"
          className="flex items-center gap-1.5 text-xs font-bold text-white/40 hover:text-white/70 transition-colors uppercase tracking-widest"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Volver
        </a>
      </div>
      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">Integración con Jira</h1>
        <p className="text-white/40 text-sm font-bold tracking-widest uppercase">
          {workspace?.name ? `${workspace.name} Connectivity` : "Cargando..."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Config Form */}
        <div className="bg-card/30 backdrop-blur-xl p-10 rounded-[2.5rem] border border-white/5 space-y-8 shadow-hard h-fit">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Jira Site URL</label>
              <input 
                type="text" 
                placeholder="https://your-domain.atlassian.net"
                className="w-full bg-[#161927] border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white placeholder:text-white/10 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                value={config.siteUrl}
                onChange={(e) => setConfig({ ...config, siteUrl: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Email de Usuario</label>
              <input 
                type="email" 
                placeholder="email@tu-empresa.com"
                className="w-full bg-[#161927] border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white placeholder:text-white/10 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                value={config.email}
                onChange={(e) => setConfig({ ...config, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Jira API Token</label>
              <input 
                type="password" 
                placeholder="••••••••••••••••"
                className="w-full bg-[#161927] border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white placeholder:text-white/10 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                value={config.apiToken}
                onChange={(e) => setConfig({ ...config, apiToken: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={handleTestConnection}
              disabled={status === "testing" || !config.siteUrl || !config.apiToken || !config.email}
              className="flex-1 py-5 bg-card text-white rounded-2xl text-[10px] font-black tracking-[0.2em] uppercase hover:bg-black transition-all shadow-xl shadow-primary/20 disabled:opacity-20 flex items-center justify-center gap-3"
              style={{ background: status === "success" ? "#10b981" : "linear-gradient(135deg, #1a6bff 0%, #2ec6ff 100%)" }}
            >
              {status === "testing" ? "PROBANDO..." : status === "success" ? "OK" : "PROBAR"}
            </button>

            <button 
              onClick={handleSaveConfig}
              disabled={isSaving || !workspace}
              className="flex-1 py-5 bg-white text-black rounded-2xl text-[10px] font-black tracking-[0.2em] uppercase hover:bg-emerald-500 hover:text-white transition-all shadow-xl disabled:opacity-20"
            >
              {isSaving ? "GUARDANDO..." : "GUARDAR"}
            </button>
          </div>

          {status === "error" && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-2 duration-300">
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 font-bold">!</div>
              <div className="flex-1 text-[10px] text-red-500 font-bold leading-tight uppercase tracking-tight">{errorMessage}</div>
            </div>
          )}
        </div>

        {/* Results / Fetching */}
        <div className="space-y-6">
          {status === "success" && userData && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[2.5rem] p-8 flex items-center gap-6 animate-in slide-in-from-right-4 duration-500">
              {userData.avatarUrls?.["48x48"] && (
                <img src={userData.avatarUrls["48x48"]} className="w-16 h-16 rounded-full border-4 border-emerald-500/20 shadow-lg" alt="Avatar" />
              )}
              <div className="flex-1">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Autenticado como</p>
                <p className="text-xl text-white font-black">{userData.displayName}</p>
                <p className="text-white/40 text-xs font-bold mt-1">{userData.emailAddress}</p>
              </div>
              <button 
                onClick={handleFetchIssues}
                disabled={isFetching}
                className="px-6 py-3 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50"
              >
                {isFetching ? "CARGANDO..." : "TRAER TAREAS"}
              </button>
            </div>
          )}

          <div className="bg-card/20 rounded-[2.5rem] border border-white/5 p-8 min-h-[400px] max-h-[600px] overflow-y-auto no-scrollbar space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Tareas UX_TEAM_UBITS ({issues.length})</p>
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            </div>

            {issues.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center space-y-4 opacity-20">
                <div className="w-12 h-12 border-2 border-dashed border-white rounded-xl" />
                <p className="text-[10px] font-black uppercase tracking-widest leading-loose text-white">Haz clic en "TRAER TAREAS"<br/>para sincronizar el board UTU</p>
              </div>
            ) : (
              issues.map((issue: any) => (
                <div key={issue.id} className="bg-card/40 p-5 rounded-2xl border border-white/5 hover:border-primary/30 transition-all group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-primary uppercase tracking-widest">{issue.key}</p>
                      <h3 className="text-sm font-bold text-white group-hover:text-primary transition-colors">{issue.fields.summary}</h3>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                      issue.fields.status.name.toLowerCase().includes("done") ? "bg-emerald-500/20 text-emerald-500" : "bg-primary/20 text-primary"
                    }`}>
                      {issue.fields.status.name}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">Nexión x Atlassian Jira Integration</p>
      </div>
    </div>
  );
}
