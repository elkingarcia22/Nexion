'use client';

import { useState, useEffect } from "react";
import { syncObjectives, getObjectives } from "@/lib/services/objectives-service";
import { getUserWorkspace } from "@/lib/services/workspace-service";
import { supabase } from "@/lib/supabase";
import { CreateObjectiveDrawer } from "./CreateObjectiveDrawer";

// --- ICONOS SVG (Sustituyen a Lucide) ---
const IconUsers = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconTarget = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
const IconChevronRight = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;
const IconCheck = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>;
const IconRocket = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.71.79-1.35.79-1.35l-2.79-2.79Z"/><path d="M12 12c.5 0 1-.5 1-1V9l2-2h4c1 0 2 1 2 2v4l-2 2h-2l-1 2c-.5.5-1 1-1 1h-3.5L12 12Z"/><path d="M2 22s5-5 8-8"/></svg>;

interface KeyResult {
  description: string;
  subTasks: {
    title: string;
    status: string;
    progress: number;
  }[];
  progress: number;
  score: number;
  comments: string;
}

interface GroupedObjective {
  title: string;
  team: string;
  owner: string;
  quarter: string;
  narrative: string;
  type: string;
  totalProgress: number;
  keyResults: KeyResult[];
}

export default function ObjectivesTab({ 
  objectives: initialObjectives, 
  initiatives: initialInitiatives, 
  isSyncing 
}: { 
  objectives?: any[], 
  initiatives?: any[], 
  isSyncing?: boolean 
}) {
  const [loading, setLoading] = useState(!initialObjectives);
  const [objectives, setObjectives] = useState<GroupedObjective[]>([]);
  const [selectedQuarter, setSelectedQuarter] = useState<string>("Q2");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedObjective, setSelectedObjective] = useState<GroupedObjective | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);

  // Auto-select first available quarter
  useEffect(() => {
    if (objectives.length > 0 && !selectedQuarter) {
      const qs = Array.from(new Set(objectives.map(o => o.quarter))).sort();
      if (qs.length > 0) {
        // Prefer Q2 if available, else first
        if (qs.includes("Q2")) setSelectedQuarter("Q2");
        else setSelectedQuarter(qs[0]);
      }
    }
  }, [objectives]);

  const processData = (data: any[]) => {
    const groups: Record<string, GroupedObjective> = {};
    data.forEach((o: any) => {
      const key = `${o.objective_title}-${o.team}-${o.quarter}-${o.owner}`;
      if (!groups[key]) {
        groups[key] = {
          title: o.objective_title,
          team: o.team,
          owner: o.owner,
          quarter: o.quarter,
          narrative: o.narrative,
          type: o.type,
          totalProgress: 0,
          keyResults: []
        };
      }
      groups[key].keyResults.push({
        description: o.key_result,
        subTasks: o.sub_tasks || [],
        progress: o.progress || 0,
        score: o.score || 0,
        comments: o.initiatives_comments
      });
    });

    return Object.values(groups).map(group => ({
      ...group,
      totalProgress: Math.round(
        group.keyResults.reduce((acc, kr) => acc + (kr.progress || 0), 0) / group.keyResults.length
      )
    }));
  };

  const loadData = async () => {
    if (initialObjectives && initialObjectives.length > 0) {
      setObjectives(processData(initialObjectives));
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const wsResult = await getUserWorkspace(user.id);
      if (!wsResult.success || !wsResult.data) return;
      const wsId = wsResult.data.id;
      setWorkspaceId(wsId);

      const { data } = await getObjectives(wsId);
      if (data) {
        setObjectives(processData(data));
      }
    } catch (error) {
      console.error("Error loading objectives:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [initialObjectives]);

  const quarters = Array.from(new Set(objectives.map(o => o.quarter))).sort();
  const teams = Array.from(new Set(objectives
    .filter(o => o.quarter === selectedQuarter)
    .map(o => o.team)
  ))
  .filter(t => {
    if (!t || t.length < 2 || t.length > 30) return false;
    const lowerT = t.toLowerCase();
    
    // More aggressive noise filtering for "Products/Squads"
    const noise = [
      "objetivo", "narrativa", "tipo", "responsable", "key result", "kr", 
      "resultado clave", "colaborador", "q1", "q2", "q3", "q4", "q-",
      "2024", "2025", "indicador", "métrica", "meta", "avance", "estado", 
      "fecha", "comentario", "link", "enlace", "evidencia", "v1", "v2",
      "output", "outcome", "entregable", "valor", "impacto", "esfuerzo",
      "prioridad", "status", "due date", "comentarios", "iniciativas",
      "mejorar", "incrementar", "reducir", "lograr", "implementar"
    ];
    
    // Filter out strings that are likely not team names
    if (t.split(" ").length > 3) return false; // Teams usually have 1-3 words
    if (/[0-9]%/.test(t)) return false; // Percentages are KRs
    if (noise.some(n => lowerT.includes(n))) return false;
    
    return true;
  })
  .sort();

  const filteredObjectives = objectives.filter(o => 
    o.quarter === selectedQuarter && 
    (selectedTeam === "all" || o.team === selectedTeam)
  );

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      {/* FILTROS ESTRATÉGICOS - Unified Selectors Row */}
      <div className="flex flex-col md:flex-row md:items-center gap-5 bg-white/40 backdrop-blur-xl p-4 rounded-[2.5rem] border border-white shadow-soft z-[100] relative">
        
        {/* Quarter Selector */}
        <div className="relative group flex-1">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-primary/40 group-hover:text-primary transition-colors z-10 pointer-events-none">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <select 
            value={selectedQuarter}
            onChange={(e) => { setSelectedQuarter(e.target.value); setSelectedTeam("all"); }}
            className="w-full appearance-none bg-white border border-border/10 rounded-[1.5rem] h-16 pl-14 pr-16 text-sm font-bold tracking-tight text-navy focus:outline-none focus:ring-4 focus:ring-primary/5 shadow-sm cursor-pointer transition-all hover:border-primary/20 hover:shadow-md"
          >
            {quarters.map(q => (
              <option key={q} value={q}>{q} — PERIODO ESTRATÉGICO</option>
            ))}
          </select>
          <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-navy/20 group-hover:text-primary transition-all z-10">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>

        {/* Product Selector - CUSTOM PREMIUM DROPDOWN */}
        <div className="relative group flex-1">
          <button 
            onClick={() => setIsTeamDropdownOpen(!isTeamDropdownOpen)}
            className="w-full bg-white border border-border/10 rounded-[1.5rem] h-16 pl-14 pr-16 text-sm font-bold tracking-tight text-navy focus:outline-none focus:ring-4 focus:ring-primary/5 shadow-sm cursor-pointer transition-all hover:border-primary/20 hover:shadow-md flex items-center justify-between"
          >
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-primary/40 group-hover:text-primary transition-colors z-10 pointer-events-none">
              <IconUsers />
            </div>
            <span className="uppercase text-left truncate">{selectedTeam === "all" ? "TODOS LOS PRODUCTOS" : selectedTeam}</span>
            <div className={`transition-transform duration-300 ${isTeamDropdownOpen ? 'rotate-180' : ''}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </button>

          {isTeamDropdownOpen && (
            <>
              <div className="fixed inset-0 z-[110]" onClick={() => setIsTeamDropdownOpen(false)} />
              <div className="absolute top-[calc(100%+12px)] left-0 bg-white/98 backdrop-blur-3xl rounded-[2.5rem] border border-white shadow-hard p-8 z-[120] animate-in slide-in-from-top-4 duration-300 min-w-[450px] max-h-[600px] overflow-y-auto no-scrollbar ring-1 ring-navy/5">
                <div className="flex items-center justify-between mb-8 px-4">
                  <h4 className="text-[11px] font-black text-navy/20 uppercase tracking-[0.3em]">Catálogo de Productos</h4>
                  <div className="px-3 py-1 bg-navy/5 rounded-lg text-[9px] font-black text-navy/40 uppercase tracking-widest">
                    {teams.length + 1} EQUIPOS
                  </div>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => { setSelectedTeam("all"); setIsTeamDropdownOpen(false); }}
                    className={`w-full text-left px-8 py-6 rounded-[1.8rem] text-sm font-black tracking-tight uppercase transition-all flex items-center justify-between group/opt ${selectedTeam === "all" ? "bg-primary text-white shadow-xl shadow-primary/30 scale-[1.02]" : "hover:bg-primary/5 text-navy/60 hover:text-primary"}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${selectedTeam === "all" ? "bg-white/20" : "bg-navy/5 group-hover/opt:bg-primary/10"}`}>
                        <IconUsers />
                      </div>
                      <span>TODOS LOS EQUIPOS</span>
                    </div>
                    {selectedTeam === "all" && <IconCheck />}
                  </button>
                  
                  <div className="h-px bg-navy/5 my-6 mx-8" />
                  
                  {teams.map(team => (
                    <button
                      key={team}
                      onClick={() => { setSelectedTeam(team); setIsTeamDropdownOpen(false); }}
                      className={`w-full text-left px-8 py-6 rounded-[1.8rem] text-sm font-black tracking-tight uppercase transition-all flex items-center justify-between group/opt ${selectedTeam === team ? "bg-primary text-white shadow-xl shadow-primary/30 scale-[1.02]" : "hover:bg-primary/5 text-navy/60 hover:text-primary"}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${selectedTeam === team ? "bg-white/20" : "bg-navy/5 group-hover/opt:bg-primary/10"}`}>
                          <div className="text-[10px] font-black">{team.substring(0, 2).toUpperCase()}</div>
                        </div>
                        <span>{team}</span>
                      </div>
                      {selectedTeam === team && <IconCheck />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Create Button */}
        <button
          onClick={() => setIsCreateOpen(true)}
          className="h-16 px-8 rounded-[1.5rem] bg-navy text-white text-[11px] font-black tracking-widest uppercase hover:bg-black transition-all shadow-xl shadow-navy/10 flex items-center gap-3 shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          NUEVO OBJETIVO
        </button>
      </div>


      {/* LISTADO DE OBJETIVOS */}
      {loading ? (
        <div className="space-y-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-24 bg-white/50 rounded-3xl border border-border/10 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredObjectives.map((obj, idx) => (
            <div 
              key={idx}
              onClick={() => setSelectedObjective(obj)}
              className="group relative bg-white/60 hover:bg-white rounded-[2rem] border border-border/10 p-6 hover:shadow-hard transition-all duration-500 cursor-pointer flex items-center gap-8"
            >
              {/* Progress Indicator */}
              <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-navy/5 flex items-center justify-center relative group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm border border-white">
                <span className="text-[12px] font-black z-10">{Math.round(obj.totalProgress)}%</span>
                <svg className="absolute inset-0 w-full h-full -rotate-90 p-1">
                  <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" fill="transparent" className="opacity-10" />
                  <circle 
                    cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" fill="transparent" 
                    strokeDasharray={125.6} strokeDashoffset={125.6 - (125.6 * obj.totalProgress) / 100}
                    strokeLinecap="round" className="text-primary transition-all duration-1000 group-hover:text-white" 
                  />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] px-2.5 py-1 bg-primary/5 rounded-lg border border-primary/10">{obj.type || 'ESTRATÉGICO'}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-navy/5" />
                  <span className="text-[10px] font-bold text-navy/30 uppercase tracking-[0.2em]">{obj.team}</span>
                </div>
                <h3 className="text-lg font-black text-navy truncate group-hover:text-primary transition-colors tracking-tight">
                  {obj.title}
                </h3>
              </div>

              <div className="flex items-center gap-6 flex-shrink-0">
                <div className="flex -space-x-3">
                  {obj.owner.split(/[,\n]/).slice(0, 3).map((owner, i) => (
                    <div 
                      key={i} 
                      title={owner.trim()}
                      className="w-9 h-9 rounded-xl bg-white border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-black text-navy/40 uppercase group-hover:border-primary/20 transition-all"
                    >
                      {owner.trim()[0]}
                    </div>
                  ))}
                </div>
                <div className="w-10 h-10 rounded-full bg-navy/5 flex items-center justify-center text-navy/20 group-hover:text-primary group-hover:bg-primary/5 transition-all shadow-sm">
                  <IconChevronRight />
                </div>
              </div>
            </div>
          ))}

          {filteredObjectives.length === 0 && (
            <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] p-20 border border-dashed border-navy/10 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 text-navy/10 shadow-soft border border-white">
                <IconRocket />
              </div>
              <h3 className="text-xl font-black text-navy/80 mb-2 uppercase tracking-tight">Sin objetivos detectados</h3>
              <p className="text-navy/40 text-sm max-w-md font-medium">Selecciona otro producto o periodo estratégico para visualizar la hoja de roadmap correspondiente.</p>
            </div>
          )}
        </div>
      )}

      {/* RIGHT SIDE DRAWER - Full Premium Refinement */}
      {selectedObjective && (
        <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[#1a1c2d]/60 backdrop-blur-sm" onClick={() => setSelectedObjective(null)} />
          
          <div className="relative bg-[#f8fafc] w-full max-w-2xl h-full shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col border-l border-white/20">
            {/* Header Drawer */}
            <div className="p-10 bg-white border-b border-navy/5 relative overflow-hidden">
              <button 
                onClick={() => setSelectedObjective(null)}
                className="absolute top-10 right-10 w-10 h-10 rounded-xl bg-navy/5 flex items-center justify-center text-navy/40 hover:bg-red-50 hover:text-red-500 transition-all z-20 shadow-sm"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>

              <div className="space-y-6 pr-14 relative z-10">
                <div className="flex items-center gap-3">
                  <span className="px-4 py-1.5 bg-primary/10 text-primary text-[10px] font-black rounded-lg tracking-[0.2em] uppercase border border-primary/20">
                    {selectedObjective.type || 'ESTRATÉGICO'}
                  </span>
                  <span className="px-4 py-1.5 bg-navy/5 text-navy/40 text-[10px] font-black rounded-lg tracking-[0.2em] uppercase">
                    {selectedObjective.quarter}
                  </span>
                </div>
                <h2 className="text-3xl font-black text-navy leading-[1.1] tracking-tight">
                  {selectedObjective.title}
                </h2>
                <div className="p-6 bg-navy/[0.02] rounded-[2rem] border border-navy/5 shadow-inner">
                  <p className="text-[13px] font-medium text-navy/60 leading-relaxed italic">
                    "{selectedObjective.narrative}"
                  </p>
                </div>
              </div>
              
              {/* Background Decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -mr-32 -mt-32" />
            </div>

            {/* Content Drawer */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-10 space-y-10">
              {/* Responsables Section */}
              <div className="space-y-5">
                <h4 className="text-[10px] font-black text-navy/30 uppercase tracking-[0.3em] flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <IconUsers />
                  </div>
                  EQUIPO Y RESPONSABLES
                </h4>
                <div className="flex flex-wrap gap-3">
                  {selectedObjective.owner.split(/[,\n]/).map((owner: string, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3 bg-white rounded-2xl border border-border/10 shadow-sm group/owner hover:border-primary/30 transition-all">
                      <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center text-primary text-[11px] font-black group-hover/owner:bg-primary group-hover/owner:text-white transition-all">
                        {owner.trim()[0]}
                      </div>
                      <span className="text-[12px] font-bold text-navy/70 uppercase">{owner.trim()}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-3 px-5 py-3 bg-navy/5 rounded-2xl border border-dashed border-navy/10">
                    <span className="text-[11px] font-black text-navy/20 uppercase tracking-widest">{selectedObjective.team}</span>
                  </div>
                </div>
              </div>

              {/* Key Results Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-navy/30 uppercase tracking-[0.3em] flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <IconTarget />
                    </div>
                    RESULTADOS CLAVE (OKRs)
                  </h4>
                  <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1.5 rounded-lg uppercase tracking-widest border border-primary/20">
                    {selectedObjective.keyResults.length} KR'S DETECTADOS
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {selectedObjective.keyResults.map((kr, kIdx) => (
                    <div key={kIdx} className="bg-white rounded-[2.5rem] border border-border/10 overflow-hidden shadow-soft hover:shadow-hard transition-all duration-500">
                      {/* KR Header */}
                      <div className="p-8 border-b border-navy/5 flex items-center justify-between bg-white relative overflow-hidden">
                        <div className="flex items-center gap-5 relative z-10">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${kr.progress >= 100 ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-primary/5 text-primary'}`}>
                            <IconTarget />
                          </div>
                          <div>
                            <h5 className="text-[15px] font-black text-navy leading-tight max-w-sm">
                              {kr.description}
                            </h5>
                          </div>
                        </div>
                        <div className="text-right relative z-10">
                          <span className={`text-2xl font-black ${kr.progress >= 100 ? 'text-emerald-500' : 'text-primary'}`}>
                            {kr.progress}%
                          </span>
                        </div>
                        {/* KR Glow */}
                        <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-10 -mr-16 -mt-16 ${kr.progress >= 100 ? 'bg-emerald-500' : 'bg-primary'}`} />
                      </div>

                      {/* Tasks List */}
                      <div className="bg-navy/[0.01] p-8 space-y-4">
                        {kr.subTasks && kr.subTasks.length > 0 ? (
                          <div className="grid grid-cols-1 gap-3">
                            {kr.subTasks.map((task: any, tIdx: number) => (
                              <div key={tIdx} className="group/task bg-white rounded-2xl p-5 border border-border/5 shadow-sm hover:scale-[1.02] hover:border-primary/20 transition-all duration-300">
                                <div className="flex items-start gap-4">
                                  <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all shadow-sm ${
                                    task.status === 'completed' 
                                      ? 'bg-emerald-500 text-white' 
                                      : 'bg-navy/5 text-navy/10 group-hover/task:bg-primary/10 group-hover/task:text-primary'
                                  }`}>
                                    {task.status === 'completed' ? <IconCheck /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-3">
                                      <span className={`text-[12px] font-bold leading-snug transition-all ${
                                        task.status === 'completed' ? 'text-navy/20 line-through' : 'text-navy/80'
                                      }`}>
                                        {task.title}
                                      </span>
                                      <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest border ${
                                        task.status === 'completed' 
                                          ? 'bg-emerald-50/50 text-emerald-600 border-emerald-100' 
                                          : 'bg-primary/5 text-primary border-primary/10'
                                      }`}>
                                        {task.status === 'completed' ? 'COMPLETADO' : 'EN PROGRESO'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <div className="flex-1 h-1.5 bg-navy/5 rounded-full overflow-hidden">
                                        <div 
                                          className={`h-full transition-all duration-1000 ${task.status === 'completed' ? 'bg-emerald-500' : 'bg-primary'}`}
                                          style={{ width: `${task.progress}%` }}
                                        />
                                      </div>
                                      <span className="text-[10px] font-black text-navy/20">{task.progress}%</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-6 gap-3 text-navy/10">
                            <IconRocket />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Tareas automáticas pendientes</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Drawer */}
            <div className="p-10 bg-white border-t border-navy/5 flex items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.02)] relative z-20">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-navy/5 flex items-center justify-center text-navy/20 border border-white shadow-sm">
                  <IconRocket />
                </div>
                <div>
                  <span className="text-[10px] font-black text-navy/20 uppercase tracking-[0.2em] block mb-0.5">Salud Estratégica</span>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-black text-navy">{Math.round(selectedObjective.totalProgress)}%</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${selectedObjective.totalProgress >= 70 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {selectedObjective.totalProgress >= 70 ? 'ÓPTIMO' : 'EN ATENCIÓN'}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedObjective(null)}
                className="px-10 py-4 bg-navy text-white rounded-2xl text-[11px] font-black tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-navy/20 uppercase"
              >
                Cerrar Visión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Objective Drawer */}
      <CreateObjectiveDrawer 
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        workspaceId={workspaceId || ""}
        onSave={loadData}
      />
    </div>
  );
}
