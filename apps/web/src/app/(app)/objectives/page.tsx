"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { syncObjectives, getObjectives } from "@/lib/services/objectives-service";
import { getUserWorkspace } from "@/lib/services/workspace-service";
import CreateObjectiveDrawer from "@/components/objectives/CreateObjectiveDrawer";

export default function ObjectivesPage() {
  const [objectives, setObjectives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [jiraTasks, setJiraTasks] = useState<any[]>([]);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [quarter, setQuarter] = useState<string>("Q2");
  const [selectedObjective, setSelectedObjective] = useState<any>(null);

  useEffect(() => {
    async function init() {
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
      await syncObjectives(wsId);
      const { data: objs } = await getObjectives(wsId);
      setObjectives(objs || []);

      const { data: wsData } = await supabase.from('workspaces').select('jira_config').eq('id', wsId).single();
      if (wsData?.jira_config) {
        const { fetchJiraIssues } = await import("@/lib/services/jira-service");
        const jql = "updated >= -365d order by updated DESC";
        const jiraResult = await fetchJiraIssues(wsData.jira_config, jql);
        if (jiraResult.success && jiraResult.issues) {
          setJiraTasks(jiraResult.issues);
        }
      }
    } catch (error) {
      console.error("[ObjectivesPage] Error loading data:", error);
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }

  const quarters = useMemo(() =>
    Array.from(new Set(objectives.map(o => o.quarter))).sort(),
    [objectives]
  );

  const filteredObjectives = useMemo(() =>
    objectives.filter(o => o.quarter === quarter),
    [objectives, quarter]
  );

  const teamRows = useMemo(() => {
    const byTeam = filteredObjectives.reduce((acc: any, o) => {
      if (!acc[o.team]) acc[o.team] = { count: 0, progress: 0 };
      acc[o.team].count++;
      acc[o.team].progress += o.progress || 0;
      return acc;
    }, {});
    return Object.entries(byTeam)
      .map(([team, d]: any) => ({ team, count: d.count, progress: Math.round(d.progress / d.count) }))
      .sort((a, b) => b.count - a.count);
  }, [filteredObjectives]);

  const totalCount = filteredObjectives.length;
  const avgProgress = totalCount > 0
    ? Math.round(filteredObjectives.reduce((a, o) => a + (o.progress || 0), 0) / totalCount)
    : 0;

  const talentObjs = filteredObjectives.filter(o => o.team === "Talent");
  const hiringObjs = filteredObjectives.filter(o => o.team === "Hiring");

  const getJiraCount = (obj: any) => {
    if (!jiraTasks || jiraTasks.length === 0) return 0;
    const objTitle = (obj.title || "").toLowerCase();
    const objKeywords = objTitle.split(/[ ,./]/).filter((w: string) => w.length > 4);
    const objTeam = (obj.team || "").toLowerCase();

    return jiraTasks.filter(task => {
      const taskSummary = (task.fields.summary || "").toLowerCase();
      const matchesObj = objKeywords.length > 0 && objKeywords.every((kw: string) => taskSummary.includes(kw));

      let teamMatch = !objTeam;
      if (objTeam === "talent") {
        const context = `${taskSummary} ${(task.fields.labels || []).join(" ")}`.toLowerCase();
        teamMatch = (context.includes("talent") || context.includes("culture")) &&
                    !context.includes("hiring") && !context.includes("utu");
      } else if (objTeam === "hiring") {
        const context = `${taskSummary} ${(task.fields.labels || []).join(" ")}`.toLowerCase();
        teamMatch = context.includes("hiring") || context.includes("utu") || context.includes("recruit");
      } else {
        teamMatch = taskSummary.includes(objTeam);
      }

      return matchesObj && teamMatch;
    }).length;
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Estrategia</h1>
          <p className="text-xs text-white/40 mt-1">Objetivos y resultados clave por periodo</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateDrawerOpen(true)}
            className="px-5 py-3 bg-[#161927]/80 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-primary hover:border-primary/30 transition-all flex items-center gap-2"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            NUEVO OBJETIVO
          </button>

          <button
            onClick={() => workspaceId && loadData(workspaceId)}
            disabled={isSyncing}
            className="p-3 rounded-2xl border border-white/5 hover:border-primary/30 transition-all bg-[#161927]/50 disabled:opacity-30"
            title="Sincronizar"
          >
            {isSyncing ? (
              <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/60">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-24">
          <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-white/40 mt-3">Cargando visión estratégica...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── PERIOD SELECTOR ── */}
          <div className="flex gap-1 bg-[#161927]/50 border border-white/5 rounded-2xl p-1 w-max">
            {quarters.length > 0 && quarters.map(q => (
              <button
                key={q}
                onClick={() => setQuarter(q)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${
                  quarter === q
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "text-white/40 hover:text-white hover:bg-white/5"
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          {/* ── PANORAMA GENERAL ── */}
          <div className="bg-[#161927]/50 border border-white/5 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Panorama General</h3>
                <p className="text-[10px] text-white/30">{quarter} · {totalCount} objetivos estratégicos</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-[#1a6bff]/10 to-transparent border border-primary/20 rounded-2xl p-5">
                <div className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">Objetivos</div>
                <div className="text-2xl font-black text-white font-mono">{totalCount}</div>
                <div className="text-[9px] text-white/30 mt-1">{teamRows.length} equipos activos</div>
              </div>
              <div className="bg-gradient-to-br from-[#10b981]/10 to-transparent border border-[#10b981]/20 rounded-2xl p-5">
                <div className="text-[10px] text-[#10b981] font-black uppercase tracking-widest mb-1">Progreso promedio</div>
                <div className="text-2xl font-black text-white font-mono">{avgProgress}%</div>
                <div className="text-[9px] text-white/30 mt-1">{avgProgress > 50 ? "Avanzando" : avgProgress > 0 ? "En desarrollo" : "Sin avance"}</div>
              </div>
              <div className="bg-gradient-to-br from-[#2ec6ff]/10 to-transparent border border-[#2ec6ff]/20 rounded-2xl p-5">
                <div className="text-[10px] text-[#2ec6ff] font-black uppercase tracking-widest mb-1">Talent</div>
                <div className="text-2xl font-black text-white font-mono">{talentObjs.length}</div>
                <div className="text-[9px] text-white/30 mt-1">
                  {talentObjs.length > 0 ? `${Math.round(talentObjs.reduce((a, o) => a + (o.progress || 0), 0) / talentObjs.length)}% avg` : "—"}
                </div>
              </div>
              <div className="bg-gradient-to-br from-[#f49e04]/10 to-transparent border border-[#f49e04]/20 rounded-2xl p-5">
                <div className="text-[10px] text-[#f49e04] font-black uppercase tracking-widest mb-1">Hiring</div>
                <div className="text-2xl font-black text-white font-mono">{hiringObjs.length}</div>
                <div className="text-[9px] text-white/30 mt-1">
                  {hiringObjs.length > 0 ? `${Math.round(hiringObjs.reduce((a, o) => a + (o.progress || 0), 0) / hiringObjs.length)}% avg` : "—"}
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-4">Progreso por equipo</p>
              {teamRows.map(({ team, count, progress }) => (
                <div key={team} className="flex items-center gap-4 group">
                  <span className="w-36 text-[10px] font-bold text-white/50 truncate group-hover:text-white/80 transition-colors uppercase tracking-tight">{team}</span>
                  <div className="flex-1 h-5 bg-white/5 rounded-xl overflow-hidden relative">
                    <div
                      className="h-full rounded-xl transition-all duration-700"
                      style={{
                        width: `${Math.max(progress, 4)}%`,
                        background: progress >= 50 ? "linear-gradient(90deg, #1a6bff, #2ec6ff)" : progress >= 10 ? "linear-gradient(90deg, #f49e04, #f4b804)" : "linear-gradient(90deg, #6b7280, #9ca3af)"
                      }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-white/80">{count} obj</span>
                  </div>
                  <span className="w-10 text-right text-[11px] font-black font-mono text-white/60">{progress}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── TALENT ── */}
          {talentObjs.length > 0 && (
            <div className="bg-[#161927]/50 border border-white/5 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">TALENT</h3>
                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{talentObjs.length} objetivos · {quarter}</p>
                </div>
              </div>

              <div className="space-y-4">
                {talentObjs.map((o, i) => {
                  const jiraCount = getJiraCount(o);
                  const owners = (o.owner || "").split(/[,\n]/).filter(Boolean);
                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedObjective(o)}
                      className="bg-[#161927]/50 hover:bg-[#161927]/80 rounded-2xl border border-white/5 p-5 hover:border-purple-500/30 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-[#161927]/80 flex items-center justify-center shrink-0 border border-white/10">
                          <span className="text-sm font-black font-mono text-white">{o.progress || 0}%</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest px-2.5 py-1 bg-purple-500/10 rounded-lg border border-purple-500/20">{o.type || "ESTRATÉGICO"}</span>
                            <div className="w-1 h-1 rounded-full bg-white/10" />
                            <span className="text-[10px] font-bold text-white/40">{o.quarter}</span>
                          </div>
                          <h4 className="text-lg font-black text-white group-hover:text-purple-400 transition-colors leading-tight">{o.title}</h4>
                          <p className="text-sm text-white/50 mt-1.5 leading-relaxed">{o.key_result}</p>

                          <div className="flex items-center gap-4 mt-4">
                            {owners.length > 0 && (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Owner:</span>
                                <div className="flex -space-x-2">
                                  {owners.slice(0, 3).map((owner, oi) => (
                                    <div key={oi} className="w-7 h-7 rounded-lg bg-[#161927]/80 border border-white/10 flex items-center justify-center text-[8px] font-black text-white/40">
                                      {owner.trim()[0]}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {jiraCount > 0 && (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-blue-400"><path d="M11.513 3.42c-.22.257-.384.453-.513.626-2.124 2.873-4.248 5.746-6.37 8.621l-.01.014c-.16.216-.32.433-.478.647-.23.312-.46.623-.68.914a1.21 1.21 0 0 0-.083.136c-.052.12-.07.243-.053.364.02.148.08.286.173.4.1.124.234.22.385.275.05.02.102.033.155.04.144.022.293.003.427-.054.12-.05.228-.124.316-.215.15-.152.296-.31.442-.465l1.636-1.745c1.64-1.75 3.28-3.5 4.92-5.25.103-.11.205-.22.308-.33.245-.26.492-.524.733-.781.082-.086.16-.175.244-.258.113-.113.242-.21.38-.288.16-.092.344-.132.525-.114.185.02.358.093.5.21.144.117.248.275.297.45.05.18.04.37-.027.545a1.13 1.13 0 0 1-.225.378c-.28.324-.57.64-.853.96l-3.324 3.754c-1.465 1.654-2.93 3.31-4.397 4.965l-.01.012c-.2.227-.402.454-.602.68-.266.3-.532.6-.8.895-.035.038-.07.078-.102.118a1.24 1.24 0 0 0-.173.34c-.046.183-.03.376.046.548a1.17 1.17 0 0 0 .584.622 1.2 1.2 0 0 0 .612.062c.162-.03.312-.1.436-.205.033-.028.065-.058.097-.088.167-.156.335-.31.503-.464l4.99-4.57c1.1-.99 2.21-1.98 3.32-2.96 1.1-.98 2.21-1.96 3.32-2.94.3-.26.6-.53.903-.79.13-.112.262-.224.39-.338a1.23 1.23 0 0 0 .324-.492c.052-.182.04-.377-.035-.55a1.19 1.19 0 0 0-.58-.655c-.198-.103-.424-.135-.644-.092a1.24 1.24 0 0 0-.55.26c-.15.118-.3.238-.45.358l-8.082 6.466c-1.127.901-2.254 1.802-3.38 2.703a1.08 1.08 0 0 1-.415.22c-.147.03-.3.02-.44-.035a1.14 1.14 0 0 1-.365-.21c-.11-.1-.19-.226-.233-.364a1.09 1.09 0 0 1 .017-.577c.05-.183.15-.347.284-.48L11.513 3.42z" /></svg>
                                <span className="text-[9px] font-black text-blue-400">{jiraCount} HU's</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="w-24">
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${o.progress || 0}%` }} />
                            </div>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-purple-500/20 group-hover:text-purple-400 transition-all">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 18 6-6-6-6"/></svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── HIRING ── */}
          {hiringObjs.length > 0 && (
            <div className="bg-[#161927]/50 border border-white/5 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">HIRING</h3>
                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{hiringObjs.length} objetivos · {quarter}</p>
                </div>
              </div>

              <div className="space-y-4">
                {hiringObjs.map((o, i) => {
                  const jiraCount = getJiraCount(o);
                  const owners = (o.owner || "").split(/[,\n]/).filter(Boolean);
                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedObjective(o)}
                      className="bg-[#161927]/50 hover:bg-[#161927]/80 rounded-2xl border border-white/5 p-5 hover:border-amber-500/30 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-[#161927]/80 flex items-center justify-center shrink-0 border border-white/10">
                          <span className="text-sm font-black font-mono text-white">{o.progress || 0}%</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest px-2.5 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20">{o.type || "ESTRATÉGICO"}</span>
                            <div className="w-1 h-1 rounded-full bg-white/10" />
                            <span className="text-[10px] font-bold text-white/40">{o.quarter}</span>
                          </div>
                          <h4 className="text-lg font-black text-white group-hover:text-amber-400 transition-colors leading-tight">{o.title}</h4>
                          <p className="text-sm text-white/50 mt-1.5 leading-relaxed">{o.key_result}</p>

                          <div className="flex items-center gap-4 mt-4">
                            {owners.length > 0 && (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Owner:</span>
                                <div className="flex -space-x-2">
                                  {owners.slice(0, 3).map((owner, oi) => (
                                    <div key={oi} className="w-7 h-7 rounded-lg bg-[#161927]/80 border border-white/10 flex items-center justify-center text-[8px] font-black text-white/40">
                                      {owner.trim()[0]}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="w-24">
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${o.progress || 0}%` }} />
                            </div>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-amber-500/20 group-hover:text-amber-400 transition-all">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 18 6-6-6-6"/></svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
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

      {/* OBJECTIVE DETAIL DRAWER */}
      {selectedObjective && (
        <div className="fixed inset-0 z-[5000] flex justify-end animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[#1a1c2d]/60 backdrop-blur-sm" onClick={() => setSelectedObjective(null)} />
          <div className="relative bg-bg w-full max-w-2xl h-screen shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col border-l border-white/10">
            <div className="p-10 bg-card border-b border-white/5 relative overflow-hidden">
              <button
                onClick={() => setSelectedObjective(null)}
                className="absolute top-10 right-10 w-10 h-10 rounded-xl bg-card/5 flex items-center justify-center text-white/40 hover:bg-red-500/10 hover:text-red-500 transition-all z-20"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
              <div className="space-y-4 pr-14 relative z-10">
                <div className="flex items-center gap-3">
                  <span className="px-4 py-1.5 bg-primary/10 text-primary text-[10px] font-black rounded-lg tracking-[0.2em] uppercase border border-primary/20">{selectedObjective.type || "ESTRATÉGICO"}</span>
                  <span className="px-4 py-1.5 bg-card/5 text-white/40 text-[10px] font-black rounded-lg tracking-[0.2em] uppercase">{selectedObjective.quarter}</span>
                  <span className="px-4 py-1.5 bg-card/5 text-white/40 text-[10px] font-black rounded-lg tracking-[0.2em] uppercase">{selectedObjective.team}</span>
                </div>
                <h2 className="text-3xl font-black text-white leading-[1.1] tracking-tight">{selectedObjective.title}</h2>
                {selectedObjective.narrative && (
                  <p className="text-sm text-white/50 italic leading-relaxed">"{selectedObjective.narrative}"</p>
                )}
                <p className="text-base text-white/70 font-medium">{selectedObjective.key_result}</p>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -mr-32 -mt-32" />
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-10 space-y-8">
              {/* Owner & Team */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Responsables</h4>
                <div className="flex flex-wrap gap-2">
                  {(selectedObjective.owner || "").split(/[,\n]/).filter(Boolean).map((owner: string, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 bg-card rounded-xl border border-white/5">
                      <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary text-[11px] font-black">{owner.trim()[0]}</div>
                      <span className="text-xs font-bold text-white/70 uppercase">{owner.trim()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sub-tasks / KRs */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Key Results</h4>
                <div className="bg-card rounded-2xl border border-white/5 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-bold text-white">{selectedObjective.key_result}</p>
                    <span className="text-lg font-black font-mono text-primary">{selectedObjective.progress || 0}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${selectedObjective.progress || 0}%` }} />
                  </div>
                  {(selectedObjective.sub_tasks || []).length > 0 && (
                    <div className="space-y-2 mt-6">
                      {selectedObjective.sub_tasks.map((st: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-2.5 bg-card/50 rounded-xl border border-white/5">
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center ${st.status === "completed" ? "bg-green-500/20 text-green-500" : "bg-white/5 text-white/20"}`}>
                            {st.status === "completed" ? (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6 9 17l-5-5"/></svg>
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-current" />
                            )}
                          </div>
                          <span className={`text-xs font-medium ${st.status === "completed" ? "text-white/30 line-through" : "text-white/70"}`}>{st.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Jira stories */}
              {(() => {
                const count = getJiraCount(selectedObjective);
                if (count === 0) return null;
                return (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Ejecución en Jira</h4>
                    <div className="bg-card rounded-2xl border border-blue-500/20 p-6">
                      <div className="flex items-center gap-2 text-blue-400">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.513 3.42c-.22.257-.384.453-.513.626-2.124 2.873-4.248 5.746-6.37 8.621l-.01.014c-.16.216-.32.433-.478.647-.23.312-.46.623-.68.914a1.21 1.21 0 0 0-.083.136c-.052.12-.07.243-.053.364.02.148.08.286.173.4.1.124.234.22.385.275.05.02.102.033.155.04.144.022.293.003.427-.054.12-.05.228-.124.316-.215.15-.152.296-.31.442-.465l1.636-1.745c1.64-1.75 3.28-3.5 4.92-5.25.103-.11.205-.22.308-.33.245-.26.492-.524.733-.781.082-.086.16-.175.244-.258.113-.113.242-.21.38-.288.16-.092.344-.132.525-.114.185.02.358.093.5.21.144.117.248.275.297.45.05.18.04.37-.027.545a1.13 1.13 0 0 1-.225.378c-.28.324-.57.64-.853.96l-3.324 3.754c-1.465 1.654-2.93 3.31-4.397 4.965l-.01.012c-.2.227-.402.454-.602.68-.266.3-.532.6-.8.895-.035.038-.07.078-.102.118a1.24 1.24 0 0 0-.173.34c-.046.183-.03.376.046.548a1.17 1.17 0 0 0 .584.622 1.2 1.2 0 0 0 .612.062c.162-.03.312-.1.436-.205.033-.028.065-.058.097-.088.167-.156.335-.31.503-.464l4.99-4.57c1.1-.99 2.21-1.98 3.32-2.96 1.1-.98 2.21-1.96 3.32-2.94.3-.26.6-.53.903-.79.13-.112.262-.224.39-.338a1.23 1.23 0 0 0 .324-.492c.052-.182.04-.377-.035-.55a1.19 1.19 0 0 0-.58-.655c-.198-.103-.424-.135-.644-.092a1.24 1.24 0 0 0-.55.26c-.15.118-.3.238-.45.358l-8.082 6.466c-1.127.901-2.254 1.802-3.38 2.703a1.08 1.08 0 0 1-.415.22c-.147.03-.3.02-.44-.035a1.14 1.14 0 0 1-.365-.21c-.11-.1-.19-.226-.233-.364a1.09 1.09 0 0 1 .017-.577c.05-.183.15-.347.284-.48L11.513 3.42z" /></svg>
                        <span className="text-xs font-black">{count} historias de usuario vinculadas</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center gap-3 p-4 bg-card/30 rounded-2xl border border-white/5">
                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Score:</span>
                <span className="text-sm font-black font-mono text-white/60">{selectedObjective.score || 0}</span>
                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest ml-4">Weight:</span>
                <span className="text-sm font-black font-mono text-white/60">{selectedObjective.weight || 0}%</span>
              </div>
            </div>

            <div className="p-10 bg-card border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-card/5 flex items-center justify-center border border-white/10">
                  <span className="text-lg font-black font-mono text-white">{selectedObjective.progress || 0}%</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] block mb-0.5">Progreso</span>
                  <span className={`text-xs font-black ${selectedObjective.progress >= 70 ? "text-green-400" : selectedObjective.progress >= 10 ? "text-amber-400" : "text-white/40"}`}>
                    {selectedObjective.progress >= 70 ? "ÓPTIMO" : selectedObjective.progress >= 10 ? "EN DESARROLLO" : "SIN AVANCE"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedObjective(null)}
                className="px-8 py-3 bg-card text-white rounded-2xl text-[11px] font-black tracking-[0.2em] hover:bg-black transition-all uppercase"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
