'use client';

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { syncObjectives, getObjectives } from "@/lib/services/objectives-service";
import { getUserWorkspace } from "@/lib/services/workspace-service";
import { supabase } from "@/lib/supabase";
import { CreateObjectiveDrawer } from "./CreateObjectiveDrawer";

// --- ICONOS SVG (Sustituyen a Lucide) ---
const IconUsers = ({ size = 20 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
const IconTarget = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>;
const IconChevronRight = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>;
const IconCheck = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>;
const IconRocket = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.71.79-1.35.79-1.35l-2.79-2.79Z" /><path d="M12 12c.5 0 1-.5 1-1V9l2-2h4c1 0 2 1 2 2v4l-2 2h-2l-1 2c-.5.5-1 1-1 1h-3.5L12 12Z" /><path d="M2 22s5-5 8-8" /></svg>;

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
  jiraTasks?: any[];
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
  jiraTasks?: any[];
}

export default function ObjectivesTab({
  objectives: initialObjectives,
  initiatives: initialInitiatives,
  isSyncing,
  jiraTasks = []
}: {
  objectives?: any[],
  initiatives?: any[],
  isSyncing?: boolean,
  jiraTasks?: any[]
}) {
  const [loading, setLoading] = useState(!initialObjectives);
  const [objectives, setObjectives] = useState<GroupedObjective[]>([]);
  const [selectedQuarter, setSelectedQuarter] = useState<string>("Q2");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedObjective, setSelectedObjective] = useState<GroupedObjective | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
  const [isQuarterDropdownOpen, setIsQuarterDropdownOpen] = useState(false);

  // Auto-select first available quarter
  useEffect(() => {
    if (objectives.length > 0 && !selectedQuarter) {
      const qs = Array.from(new Set(objectives.map(o => o.quarter))).sort();
      if (qs.length > 0) {
        if (qs.includes("Q2")) setSelectedQuarter("Q2");
        else setSelectedQuarter(qs[0]);
      }
    }
  }, [objectives, selectedQuarter]);

  const extractJiraText = (adf: any): string => {
    if (!adf) return "";
    if (typeof adf === 'string') return adf;
    if (adf.text) return adf.text;
    let text = "";
    if (Array.isArray(adf)) {
      text = adf.map(extractJiraText).join(" ");
    } else if (adf.content && Array.isArray(adf.content)) {
      text = adf.content.map(extractJiraText).join(" ");
    }
    return text;
  };

  const processData = (data: any[], currentJiraTasks: any[]) => {
    if (!data || data.length === 0) return [];
    
    const groups: Record<string, GroupedObjective> = {};
    data.forEach((o: any) => {
      const key = `${o.title}-${o.team}-${o.quarter}-${o.owner}`;
      if (!groups[key]) {
        groups[key] = {
          title: o.title,
          team: o.team,
          owner: o.owner,
          quarter: o.quarter,
          narrative: o.narrative,
          type: o.type,
          totalProgress: 0,
          keyResults: [],
          jiraTasks: []
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

    const utuTasks = currentJiraTasks.filter(jt => jt.key.startsWith('UTU-'));

    return Object.values(groups).map(group => {
      const objTitle = (group.title || "").toLowerCase();
      const objKeywords = objTitle.split(/[ ,./]/).filter(w => w.length > 4);
      const objectiveTasks: any[] = [];

      const enrichedKRs = group.keyResults.map((kr: any) => {
        const krDescription = (kr.description || "").toLowerCase();
        const linkedToKR: any[] = [];
        const normalizedKR = krDescription.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        currentJiraTasks.forEach(task => {
          const taskSummary = (task.fields.summary || "").toLowerCase();
          const taskDesc = extractJiraText(task.fields.description).toLowerCase();
          const normalizedDesc = taskDesc.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const jiraLabels = (task.fields.labels || []).join(" ").toLowerCase();
          
          // Extraer equipo de Jira de forma robusta
          let jiraTeamValue = "";
          for (const key in task.fields) {
            const val = task.fields[key];
            if (val && typeof val === 'object') {
              jiraTeamValue += " " + (val.value || val.name || "");
            } else if (typeof val === 'string' && key.startsWith('customfield')) {
              jiraTeamValue += " " + val;
            }
          }
          const jiraTeamContext = (jiraTeamValue + " " + jiraLabels + " " + taskSummary).toLowerCase();
          const objTeam = (group.team || "").toLowerCase();

          // Filtro de ruido para palabras muy comunes
          const noise = ["producto", "mejorar", "crear", "implementar", "cada", "para", "con", "del", "las", "los"];
          const filteredKeywords = objKeywords.filter(kw => !noise.includes(kw));

          // 1. Match con el KR (Descripción de Jira) -> ALTA CONFIANZA (Permite cruce de equipos)
          const mentionsKR = normalizedDesc.includes(normalizedKR) || 
                            (normalizedKR.length > 20 && normalizedDesc.includes(normalizedKR.substring(0, 20)));
          const krPhraseMatch = normalizedKR.length > 30 && normalizedDesc.includes(normalizedKR.substring(0, 30));

          // 2. Match con el Objetivo (Resumen de Jira) -> REQUIERE MISMO EQUIPO (Estricto)
          let teamMatch = !objTeam;
          if (objTeam === "talent") {
            // Talent debe ser Talent, pero NO Hiring/Talent-OS
            teamMatch = (jiraTeamContext.includes("talent") || jiraTeamContext.includes("culture") || jiraTeamContext.includes("growth")) && 
                        !jiraTeamContext.includes("hiring") && !jiraTeamContext.includes("utu") && !jiraTeamContext.includes("talent-os");
          } else if (objTeam === "hiring") {
            teamMatch = jiraTeamContext.includes("hiring") || jiraTeamContext.includes("utu") || jiraTeamContext.includes("talent-os") || jiraTeamContext.includes("recruit");
          } else if (objTeam) {
            teamMatch = jiraTeamContext.includes(objTeam);
          }
          
          const matchesObjInSummary = filteredKeywords.length > 0 && filteredKeywords.every(kw => taskSummary.includes(kw));
          const hasObjSummaryPhrase = objTitle.length > 15 && taskSummary.includes(objTitle.substring(0, 15));
          
          const objMatch = teamMatch && (matchesObjInSummary || hasObjSummaryPhrase);

          if (mentionsKR || krPhraseMatch) {
            linkedToKR.push(task);
            if (!objectiveTasks.find(t => t.key === task.key)) {
              objectiveTasks.push(task);
            }
          } else if (objMatch) {
            if (!objectiveTasks.find(t => t.key === task.key)) {
              objectiveTasks.push(task);
            }
          }
        });

        return {
          ...kr,
          jiraTasks: linkedToKR,
          progress: kr.progress || 0 // Usar solo el progreso del Excel
        };
      });

      return {
        ...group,
        keyResults: enrichedKRs,
        jiraTasks: objectiveTasks,
        totalProgress: enrichedKRs.length > 0 ? 
          Math.round(enrichedKRs.reduce((acc: number, kr: any) => acc + (kr.progress || 0), 0) / enrichedKRs.length) : 0
      };
    });
  };

  const loadData = async () => {
    if (initialObjectives && initialObjectives.length > 0) {
      setObjectives(processData(initialObjectives, jiraTasks));
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
        setObjectives(processData(data, jiraTasks));
      }
    } catch (error) {
      console.error("Error loading objectives:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [initialObjectives, jiraTasks]);

  const quarters = Array.from(new Set(objectives.map(o => o.quarter))).sort();
  const teams = Array.from(new Set(objectives
    .filter(o => o.quarter === selectedQuarter)
    .map(o => o.team)
  ))
    .filter(t => {
      if (!t || t.length < 2 || t.length > 30) return false;
      const lowerT = t.toLowerCase();
      const noise = [
        "objetivo", "narrativa", "tipo", "responsable", "key result", "kr",
        "resultado clave", "colaborador", "q1", "q2", "q3", "q4", "q-",
        "2024", "2025", "indicador", "métrica", "meta", "avance", "estado",
        "fecha", "comentario", "link", "enlace", "evidencia", "v1", "v2",
        "output", "outcome", "entregable", "valor", "impacto", "esfuerzo",
        "prioridad", "status", "due date", "comentarios", "iniciativas",
        "mejorar", "incrementar", "reducir", "lograr", "implementar"
      ];
      if (t.split(" ").length > 3) return false;
      if (/[0-9]%/.test(t)) return false;
      if (noise.some(n => lowerT.includes(n))) return false;
      return true;
    })
    .sort();

  const filteredObjectives = objectives.filter(o =>
    o.quarter === selectedQuarter &&
    (selectedTeam === "all" || o.team === selectedTeam)
  );

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    if (selectedObjective) {
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => {
        const el = document.getElementById("objective-detail-drawer-content");
        // Debug measurements can be inspected in browser DevTools if needed
      }, 500);
      return () => {
        document.body.style.overflow = 'unset';
        clearTimeout(timer);
      };
    }
  }, [selectedObjective]);

  return (
    <>
      <div className="space-y-10 pb-20">
        {/* FILTROS ESTRATÉGICOS */}
        <div className="flex flex-col md:flex-row md:items-center gap-5 bg-card/60 backdrop-blur-2xl p-4 rounded-[2.5rem] border border-white/5 shadow-xl z-[500] sticky top-4 mb-10">

          {/* Quarter Selector */}
          <div className="relative group flex-1">
            <button
              onClick={() => setIsQuarterDropdownOpen(!isQuarterDropdownOpen)}
              className="w-full bg-card border border-white/5 rounded-[1.5rem] h-16 pl-14 pr-10 text-sm font-bold tracking-tight text-white focus:outline-none focus:ring-4 focus:ring-primary/5 shadow-sm cursor-pointer transition-all hover:border-primary/20 hover:shadow-md flex items-center justify-between"
            >
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-primary/40 group-hover:text-primary transition-colors z-10 pointer-events-none">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <span className="uppercase text-left truncate">{selectedQuarter} — PERIODO</span>
              <div className={`transition-transform duration-300 ${isQuarterDropdownOpen ? 'rotate-180' : ''}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </div>
            </button>

            {isQuarterDropdownOpen && (
              <>
                <div className="fixed inset-0 z-[510]" onClick={() => setIsQuarterDropdownOpen(false)} />
                <div className="absolute top-[calc(100%+12px)] left-0 w-full bg-card rounded-[2rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-4 z-[520] animate-in slide-in-from-top-2 duration-300 overflow-hidden ring-1 ring-white/5">
                  <div className="space-y-1">
                    {quarters.map(q => (
                      <button
                        key={q}
                        onClick={() => { setSelectedQuarter(q); setSelectedTeam("all"); setIsQuarterDropdownOpen(false); }}
                        className={`w-full text-left px-5 py-4 rounded-xl text-sm font-black tracking-tight uppercase transition-all flex items-center justify-between group/opt ${selectedQuarter === q ? "bg-primary text-white" : "hover:bg-card/5 text-white/60"}`}
                      >
                        <span>{q} — PERIODO ESTRATÉGICO</span>
                        {selectedQuarter === q && <IconCheck />}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Product Selector */}
          <div className="relative group flex-1">
            <button
              onClick={() => setIsTeamDropdownOpen(!isTeamDropdownOpen)}
              className="w-full bg-card border border-white/5 rounded-[1.5rem] h-16 pl-14 pr-16 text-sm font-bold tracking-tight text-white focus:outline-none focus:ring-4 focus:ring-primary/5 shadow-sm cursor-pointer transition-all hover:border-primary/20 hover:shadow-md flex items-center justify-between"
            >
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-primary/40 group-hover:text-primary transition-colors z-10 pointer-events-none">
                <IconUsers />
              </div>
              <span className="uppercase text-left truncate">{selectedTeam === "all" ? "TODOS LOS PRODUCTOS" : selectedTeam}</span>
              <div className={`transition-transform duration-300 ${isTeamDropdownOpen ? 'rotate-180' : ''}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </div>
            </button>

            {isTeamDropdownOpen && (
              <>
                <div className="fixed inset-0 z-[510]" onClick={() => setIsTeamDropdownOpen(false)} />
                <div className="absolute top-[calc(100%+12px)] left-0 w-full bg-card rounded-[2rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-4 z-[520] animate-in slide-in-from-top-2 duration-300 max-h-[500px] overflow-y-auto no-scrollbar ring-1 ring-white/5">
                  <div className="flex items-center justify-between mb-6 px-4 pt-2">
                    <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Seleccionar Producto</h4>
                    <div className="px-3 py-1 bg-card/5 rounded-lg text-[9px] font-black text-white/40 uppercase tracking-widest">
                      {teams.length + 1} EQUIPOS
                    </div>
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={() => { setSelectedTeam("all"); setIsTeamDropdownOpen(false); }}
                      className={`w-full text-left px-5 py-4 rounded-xl text-sm font-black tracking-tight uppercase transition-all flex items-center justify-between group/opt ${selectedTeam === "all" ? "bg-primary text-white shadow-md shadow-primary/20" : "hover:bg-card/5 text-white/60 hover:text-white"}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${selectedTeam === "all" ? "bg-card/20" : "bg-card/5 group-hover/opt:bg-primary/5"}`}>
                          <IconUsers />
                        </div>
                        <span>TODOS LOS EQUIPOS</span>
                      </div>
                      {selectedTeam === "all" && <IconCheck />}
                    </button>

                    <div className="h-px bg-card/5 my-6 mx-8" />

                    {teams.map(team => (
                      <button
                        key={team}
                        onClick={() => { setSelectedTeam(team); setIsTeamDropdownOpen(false); }}
                        className={`w-full text-left px-5 py-4 rounded-xl text-sm font-black tracking-tight uppercase transition-all flex items-center justify-between group/opt ${selectedTeam === team ? "bg-primary text-white shadow-md shadow-primary/20" : "hover:bg-card/5 text-white/60 hover:text-white"}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${selectedTeam === team ? "bg-card/20" : "bg-card/5 group-hover/opt:bg-primary/5"}`}>
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
            className="h-16 px-8 rounded-[1.5rem] bg-card text-white text-[11px] font-black tracking-widest uppercase hover:bg-black transition-all shadow-xl shadow-primary/10 flex items-center gap-3 shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            NUEVO OBJETIVO
          </button>
        </div>

        {/* LISTADO DE OBJETIVOS */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-card/50 rounded-3xl border border-white/10 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredObjectives.map((obj, idx) => (
              <div
                key={`${obj.title}-${obj.team}-${obj.quarter}`}
                onClick={() => setSelectedObjective(obj)}
                className="group relative bg-card/60 hover:bg-card rounded-[2rem] border border-white/5 p-6 hover:shadow-2xl transition-all duration-500 cursor-pointer flex items-center gap-8"
              >
                {/* Progress Indicator */}
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-card/5 flex items-center justify-center relative group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm border border-white/10">
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
                    <div className="w-1.5 h-1.5 rounded-full bg-card/5" />
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">{obj.team}</span>
                  </div>
                  <h3 className="text-lg font-black text-white truncate group-hover:text-primary transition-colors tracking-tight">
                    {obj.title}
                  </h3>
                  {obj.jiraTasks && obj.jiraTasks.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[8px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M11.513 3.42c-.22.257-.384.453-.513.626-2.124 2.873-4.248 5.746-6.37 8.621l-.01.014c-.16.216-.32.433-.478.647-.23.312-.46.623-.68.914a1.21 1.21 0 0 0-.083.136c-.052.12-.07.243-.053.364.02.148.08.286.173.4.1.124.234.22.385.275.05.02.102.033.155.04.144.022.293.003.427-.054.12-.05.228-.124.316-.215.15-.152.296-.31.442-.465l1.636-1.745c1.64-1.75 3.28-3.5 4.92-5.25.103-.11.205-.22.308-.33.245-.26.492-.524.733-.781.082-.086.16-.175.244-.258.113-.113.242-.21.38-.288.16-.092.344-.132.525-.114.185.02.358.093.5.21.144.117.248.275.297.45.05.18.04.37-.027.545a1.13 1.13 0 0 1-.225.378c-.28.324-.57.64-.853.96l-3.324 3.754c-1.465 1.654-2.93 3.31-4.397 4.965l-.01.012c-.2.227-.402.454-.602.68-.266.3-.532.6-.8.895-.035.038-.07.078-.102.118a1.24 1.24 0 0 0-.173.34c-.046.183-.03.376.046.548a1.17 1.17 0 0 0 .584.622 1.2 1.2 0 0 0 .612.062c.162-.03.312-.1.436-.205.033-.028.065-.058.097-.088.167-.156.335-.31.503-.464l4.99-4.57c1.1-.99 2.21-1.98 3.32-2.96 1.1-.98 2.21-1.96 3.32-2.94.3-.26.6-.53.903-.79.13-.112.262-.224.39-.338a1.23 1.23 0 0 0 .324-.492c.052-.182.04-.377-.035-.55a1.19 1.19 0 0 0-.58-.655c-.198-.103-.424-.135-.644-.092a1.24 1.24 0 0 0-.55.26c-.15.118-.3.238-.45.358l-8.082 6.466c-1.127.901-2.254 1.802-3.38 2.703a1.08 1.08 0 0 1-.415.22c-.147.03-.3.02-.44-.035a1.14 1.14 0 0 1-.365-.21c-.11-.1-.19-.226-.233-.364a1.09 1.09 0 0 1 .017-.577c.05-.183.15-.347.284-.48L11.513 3.42z" /></svg>
                        {obj.jiraTasks.length} HISTORIAS EN JIRA
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500/20" />
                      <span className="text-[9px] font-bold text-blue-400/60 uppercase">PROGRESO JIRA: {
                        Math.round(obj.jiraTasks.reduce((acc: number, task: any) => {
                          const subtasks = task.fields.subtasks || [];
                          if (subtasks.length > 0) {
                            const doneCount = subtasks.filter((s: any) => {
                              const sName = (s.fields?.status?.name || "").toLowerCase();
                              return sName === 'done' || sName === 'finalizado' || sName === 'finalizada' || sName === 'completado' || sName === 'completada';
                            }).length;
                            return acc + (doneCount / subtasks.length) * 100;
                          }
                          const status = (task.fields.status?.name || "").toLowerCase();
                          if (status === 'done' || status === 'finalizado' || status === 'finalizada' || status === 'completado' || status === 'completada') return acc + 100;
                          if (status === 'in progress' || status === 'en curso' || status === 'en revisión' || status === 'desarrollo') return acc + 50;
                          return acc;
                        }, 0) / obj.jiraTasks.length)
                      }%</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-6 flex-shrink-0">
                  <div className="flex -space-x-3">
                    {obj.owner.split(/[,\n]/).slice(0, 3).map((owner, i) => (
                      <div
                        key={i}
                        title={owner.trim()}
                        className="w-9 h-9 rounded-xl bg-card border-2 border-white/10 shadow-sm flex items-center justify-center text-[10px] font-black text-white/40 uppercase group-hover:border-primary/20 transition-all"
                      >
                        {owner.trim()[0]}
                      </div>
                    ))}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-card/5 flex items-center justify-center text-white/20 group-hover:text-primary group-hover:bg-primary/5 transition-all shadow-sm">
                    <IconChevronRight />
                  </div>
                </div>
              </div>
            ))}

            {filteredObjectives.length === 0 && (
              <div className="bg-card/40 backdrop-blur-md rounded-[2.5rem] p-20 border border-dashed border-navy/10 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-card rounded-3xl flex items-center justify-center mb-6 text-white/10 shadow-soft border border-white/10">
                  <IconRocket />
                </div>
                <h3 className="text-xl font-black text-white/80 mb-2 uppercase tracking-tight">Sin objetivos detectados</h3>
                <p className="text-white/40 text-sm max-w-md font-medium">Selecciona otro producto o periodo estratégico para visualizar la hoja de roadmap correspondiente.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT SIDE DRAWER - Using Portal to break out of layout constraints */}
      {selectedObjective && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[5000] flex justify-end animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[#1a1c2d]/60 backdrop-blur-sm" onClick={() => setSelectedObjective(null)} />

          <div
            id="objective-detail-drawer-content"
            className="relative bg-bg w-full max-w-2xl h-screen shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col border-l border-white/10"
          >
            {/* Header Drawer */}
            <div className="p-10 bg-card border-b border-white/5 relative overflow-hidden">
              <button
                onClick={() => setSelectedObjective(null)}
                className="absolute top-10 right-10 w-10 h-10 rounded-xl bg-card/5 flex items-center justify-center text-white/40 hover:bg-red-500/100/10 hover:text-red-500 transition-all z-20 shadow-sm"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>

              <div className="space-y-6 pr-14 relative z-10">
                <div className="flex items-center gap-3">
                  <span className="px-4 py-1.5 bg-primary/10 text-primary text-[10px] font-black rounded-lg tracking-[0.2em] uppercase border border-primary/20">
                    {selectedObjective.type || 'ESTRATÉGICO'}
                  </span>
                  <span className="px-4 py-1.5 bg-card/5 text-white/40 text-[10px] font-black rounded-lg tracking-[0.2em] uppercase">
                    {selectedObjective.quarter}
                  </span>
                </div>
                <h2 className="text-3xl font-black text-white leading-[1.1] tracking-tight">
                  {selectedObjective.title}
                </h2>
                <div className="p-6 bg-card/[0.02] rounded-[2rem] border border-navy/5 shadow-inner">
                  <p className="text-[13px] font-medium text-white/60 leading-relaxed italic">
                    "{selectedObjective.narrative}"
                  </p>
                </div>
              </div>

              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -mr-32 -mt-32" />
            </div>

            {/* Content Drawer */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-10 space-y-10">
              <div className="space-y-5">
                <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <IconUsers size={12} />
                  </div>
                  EQUIPO Y RESPONSABLES
                </h4>
                <div className="flex flex-wrap gap-3">
                  {selectedObjective.owner.split(/[,\n]/).map((owner: string, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3 bg-card rounded-2xl border border-white/5 shadow-sm group/owner hover:border-primary/30 transition-all">
                      <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center text-primary text-[11px] font-black group-hover/owner:bg-primary group-hover/owner:text-white transition-all">
                        {owner.trim()[0]}
                      </div>
                      <span className="text-[12px] font-bold text-white/70 uppercase">{owner.trim()}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-3 px-5 py-3 bg-card/5 rounded-2xl border border-dashed border-navy/10">
                    <span className="text-[11px] font-black text-white/20 uppercase tracking-widest">{selectedObjective.team}</span>
                  </div>
                </div>
              </div>

              {/* JIRA EXECUTION SECTION */}
              {selectedObjective.jiraTasks && selectedObjective.jiraTasks.length > 0 && (
                <div className="space-y-6 pt-6 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 shadow-sm border border-blue-500/20">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M11.513 3.42c-.22.257-.384.453-.513.626-2.124 2.873-4.248 5.746-6.37 8.621l-.01.014c-.16.216-.32.433-.478.647-.23.312-.46.623-.68.914a1.21 1.21 0 0 0-.083.136c-.052.12-.07.243-.053.364.02.148.08.286.173.4.1.124.234.22.385.275.05.02.102.033.155.04.144.022.293.003.427-.054.12-.05.228-.124.316-.215.15-.152.296-.31.442-.465l1.636-1.745c1.64-1.75 3.28-3.5 4.92-5.25.103-.11.205-.22.308-.33.245-.26.492-.524.733-.781.082-.086.16-.175.244-.258.113-.113.242-.21.38-.288.16-.092.344-.132.525-.114.185.02.358.093.5.21.144.117.248.275.297.45.05.18.04.37-.027.545a1.13 1.13 0 0 1-.225.378c-.28.324-.57.64-.853.96l-3.324 3.754c-1.465 1.654-2.93 3.31-4.397 4.965l-.01.012c-.2.227-.402.454-.602.68-.266.3-.532.6-.8.895-.035.038-.07.078-.102.118a1.24 1.24 0 0 0-.173.34c-.046.183-.03.376.046.548a1.17 1.17 0 0 0 .584.622 1.2 1.2 0 0 0 .612.062c.162-.03.312-.1.436-.205.033-.028.065-.058.097-.088.167-.156.335-.31.503-.464l4.99-4.57c1.1-.99 2.21-1.98 3.32-2.96 1.1-.98 2.21-1.96 3.32-2.94.3-.26.6-.53.903-.79.13-.112.262-.224.39-.338a1.23 1.23 0 0 0 .324-.492c.052-.182.04-.377-.035-.55a1.19 1.19 0 0 0-.58-.655c-.198-.103-.424-.135-.644-.092a1.24 1.24 0 0 0-.55.26c-.15.118-.3.238-.45.358l-8.082 6.466c-1.127.901-2.254 1.802-3.38 2.703a1.08 1.08 0 0 1-.415.22c-.147.03-.3.02-.44-.035a1.14 1.14 0 0 1-.365-.21c-.11-.1-.19-.226-.233-.364a1.09 1.09 0 0 1 .017-.577c.05-.183.15-.347.284-.48L11.513 3.42z" /></svg>
                      </div>
                      EJECUCIÓN EN JIRA (HUB)
                    </h4>
                    <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg uppercase tracking-widest border border-blue-500/20">
                      {selectedObjective.jiraTasks.length} HU'S VINCULADAS
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {selectedObjective.jiraTasks.map((jt: any, jidx: number) => (
                      <div key={jidx} className="bg-card rounded-2xl border border-white/5 p-5 hover:border-blue-500/30 transition-all group/jira shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20 uppercase tracking-widest">
                              {jt.key}
                            </span>
                            <h5 className="text-[13px] font-bold text-white group-hover/jira:text-blue-400 transition-colors">
                              {jt.fields.summary}
                            </h5>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${jt.fields.status.name.toLowerCase().includes('done') || jt.fields.status.name.toLowerCase().includes('finalizado')
                              ? 'bg-green-500/10 text-green-500'
                              : jt.fields.status.name.toLowerCase().includes('progress') || jt.fields.status.name.toLowerCase().includes('en curso')
                                ? 'bg-blue-500/10 text-blue-400 animate-pulse'
                                : 'bg-card/20 text-white/40'
                            }`}>
                            {jt.fields.status.name}
                          </div>
                        </div>

                        {jt.fields.subtasks && jt.fields.subtasks.length > 0 && (
                          <div className="space-y-3 pt-4 border-t border-white/5">
                            <div className="flex items-center justify-between text-[10px] font-black text-white/30 uppercase tracking-widest">
                              <span>Progreso de ejecución</span>
                              <span>{Math.round((jt.fields.subtasks.filter((s: any) => {
                                const sName = (s.fields?.status?.name || "").toLowerCase();
                                return sName.includes('done') || sName.includes('finalizado') || sName.includes('finalizada') || sName.includes('completado');
                              }).length / jt.fields.subtasks.length) * 100)}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-card/10 rounded-full overflow-hidden flex gap-0.5 shadow-inner">
                              {jt.fields.subtasks.map((s: any, sidx: number) => {
                                const sName = (s.fields?.status?.name || "").toLowerCase();
                                const isDone = sName.includes('done') || sName.includes('finalizado') || sName.includes('finalizada') || sName.includes('completado');
                                return (
                                  <div
                                    key={sidx}
                                    className={`h-full flex-1 transition-all duration-500 ${isDone ? 'bg-gradient-to-r from-green-500 to-emerald-400 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-white/5'
                                      }`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] flex items-center gap-2.5">
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
                    <div key={kIdx} className="bg-card rounded-[2.5rem] border border-white/5 overflow-hidden shadow-soft hover:shadow-2xl transition-all duration-500">
                      <div className="p-8 border-b border-white/5 flex items-center justify-between bg-card relative overflow-hidden">
                        <div className="flex items-center gap-5 relative z-10">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${kr.progress >= 100 ? 'bg-emerald-500/100 text-white shadow-emerald-500/20' : 'bg-primary/5 text-primary'}`}>
                            <IconTarget />
                          </div>
                          <div>
                            <h5 className="text-[15px] font-black text-white leading-tight max-w-sm">
                              {kr.description}
                            </h5>
                          </div>
                        </div>
                        <div className="text-right relative z-10">
                          <span className={`text-2xl font-black ${kr.progress >= 100 ? 'text-emerald-500' : 'text-primary'}`}>
                            {Math.round(kr.progress)}%
                          </span>
                        </div>
                        <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-10 -mr-16 -mt-16 ${kr.progress >= 100 ? 'bg-emerald-500/100' : 'bg-primary'}`} />
                      </div>

                      <div className="bg-card/[0.01] p-8 space-y-4">
                        {kr.subTasks && kr.subTasks.length > 0 ? (
                          <div className="grid grid-cols-1 gap-3">
                            {kr.subTasks.map((task: any, tIdx: number) => (
                              <div key={tIdx} className="group/task bg-card rounded-2xl p-5 border border-white/5 shadow-sm hover:scale-[1.02] hover:border-primary/20 transition-all duration-300">
                                <div className="flex items-start gap-4">
                                  <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all shadow-sm ${task.status === 'completed'
                                      ? 'bg-emerald-500/100 text-white'
                                      : 'bg-card/5 text-white/10 group-hover/task:bg-primary/10 group-hover/task:text-primary'
                                    }`}>
                                    {task.status === 'completed' ? <IconCheck /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-3">
                                      <span className={`text-[12px] font-bold leading-snug transition-all ${task.status === 'completed' ? 'text-white/20 line-through' : 'text-white/80'
                                        }`}>
                                        {task.title}
                                      </span>
                                      <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest border ${task.status === 'completed'
                                          ? 'bg-emerald-500/50 text-emerald-600 border-emerald-100'
                                          : 'bg-primary/5 text-primary border-primary/10'
                                        }`}>
                                        {task.status === 'completed' ? 'COMPLETADO' : 'EN PROGRESO'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <div className="flex-1 h-1.5 bg-card/5 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full transition-all duration-1000 ${task.status === 'completed' ? 'bg-emerald-500/100' : 'bg-primary'}`}
                                          style={{ width: `${task.progress}%` }}
                                        />
                                      </div>
                                      <span className="text-[10px] font-black text-white/20">{Math.round(task.progress)}%</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-6 gap-3 text-white/10">
                            <IconRocket />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Tareas automáticas pendientes</span>
                          </div>
                        )}

                        {/* JIRA EXECUTION FOR THIS KR */}
                        {kr.jiraTasks && kr.jiraTasks.length > 0 && (
                          <div className="space-y-4 pt-4 border-t border-white/5">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black text-blue-400/60 uppercase tracking-widest flex items-center gap-2">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M11.513 3.42c-.22.257-.384.453-.513.626-2.124 2.873-4.248 5.746-6.37 8.621l-.01.014c-.16.216-.32.433-.478.647-.23.312-.46.623-.68.914a1.21 1.21 0 0 0-.083.136c-.052.12-.07.243-.053.364.02.148.08.286.173.4.1.124.234.22.385.275.05.02.102.033.155.04.144.022.293.003.427-.054.12-.05.228-.124.316-.215.15-.152.296-.31.442-.465l1.636-1.745c1.64-1.75 3.28-3.5 4.92-5.25.103-.11.205-.22.308-.33.245-.26.492-.524.733-.781.082-.086.16-.175.244-.258.113-.113.242-.21.38-.288.16-.092.344-.132.525-.114.185.02.358.093.5.21.144.117.248.275.297.45.05.18.04.37-.027.545a1.13 1.13 0 0 1-.225.378c-.28.324-.57.64-.853.96l-3.324 3.754c-1.465 1.654-2.93 3.31-4.397 4.965l-.01.012c-.2.227-.402.454-.602.68-.266.3-.532.6-.8.895-.035.038-.07.078-.102.118a1.24 1.24 0 0 0-.173.34c-.046.183-.03.376.046.548a1.17 1.17 0 0 0 .584.622 1.2 1.2 0 0 0 .612.062c.162-.03.312-.1.436-.205.033-.028.065-.058.097-.088.167-.156.335-.31.503-.464l4.99-4.57c1.1-.99 2.21-1.98 3.32-2.96 1.1-.98 2.21-1.96 3.32-2.94.3-.26.6-.53.903-.79.13-.112.262-.224.39-.338a1.23 1.23 0 0 0 .324-.492c.052-.182.04-.377-.035-.55a1.19 1.19 0 0 0-.58-.655c-.198-.103-.424-.135-.644-.092a1.24 1.24 0 0 0-.55.26c-.15.118-.3.238-.45.358l-8.082 6.466c-1.127.901-2.254 1.802-3.38 2.703a1.08 1.08 0 0 1-.415.22c-.147.03-.3.02-.44-.035a1.14 1.14 0 0 1-.365-.21c-.11-.1-.19-.226-.233-.364a1.09 1.09 0 0 1 .017-.577c.05-.183.15-.347.284-.48L11.513 3.42z" /></svg>
                                EJECUCIÓN JIRA VINCULADA
                              </span>
                              <div className="flex gap-2">
                                {kr.jiraTasks.map((jt: any, i: number) => (
                                  <span key={i} className="text-[8px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{jt.key}</span>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-3">
                              {kr.jiraTasks.map((jt: any, jidx: number) => {
                                const subtasks = jt.fields.subtasks || [];
                                const doneCount = subtasks.filter((s: any) => {
                                  const sName = (s.fields?.status?.name || "").toLowerCase();
                                  return sName.includes('done') || sName.includes('finalizado') || sName.includes('finalizada') || sName.includes('completado');
                                }).length;
                                const jtProgress = subtasks.length > 0 ? (doneCount / subtasks.length) * 100 : (jt.fields.status.name.toLowerCase().includes('done') ? 100 : 0);

                                return (
                                  <div key={jidx} className="bg-card/40 rounded-2xl p-4 border border-white/5 group/jtask hover:border-blue-500/30 transition-all">
                                    <div className="flex items-center justify-between mb-3">
                                      <span className="text-[12px] font-bold text-white group-hover/jtask:text-blue-400 transition-colors">{jt.fields.summary}</span>
                                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${jt.fields.status.name.toLowerCase().includes('done') || jt.fields.status.name.toLowerCase().includes('finalizado') || jt.fields.status.name.toLowerCase().includes('finalizada') ? 'text-green-500 bg-green-500/10' : 'text-blue-400 bg-blue-500/10'
                                        }`}>
                                        {jt.fields.status.name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden flex gap-0.5">
                                        {subtasks.length > 0 ? subtasks.map((s: any, sidx: number) => {
                                          const subName = (s.fields?.status?.name || "").toLowerCase();
                                          const isSubDone = subName.includes('done') || subName.includes('finalizado') || subName.includes('finalizada') || subName.includes('completado');
                                          return (
                                            <div key={sidx} className={`h-full flex-1 ${isSubDone ? 'bg-green-500' : 'bg-white/10'}`} />
                                          );
                                        }) : (
                                          <div className={`h-full w-full ${jtProgress === 100 ? 'bg-green-500' : 'bg-white/10'}`} />
                                        )}
                                      </div>
                                      <span className="text-[8px] font-black text-white/20 uppercase tracking-tighter">
                                        {Math.round(jtProgress)}%
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-10 bg-card border-t border-white/5 flex items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.5)] relative z-20">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-card/5 flex items-center justify-center text-white/20 border border-white/10 shadow-sm">
                  <IconRocket />
                </div>
                <div>
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] block mb-0.5">Salud Estratégica</span>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-black text-white">{Math.round(selectedObjective.totalProgress)}%</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${selectedObjective.totalProgress >= 70 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                      {selectedObjective.totalProgress >= 70 ? 'ÓPTIMO' : 'EN ATENCIÓN'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedObjective(null)}
                className="px-10 py-4 bg-card text-white rounded-2xl text-[11px] font-black tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-primary/20 uppercase"
              >
                Cerrar Visión
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Create Objective Drawer */}
      <CreateObjectiveDrawer
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        workspaceId={workspaceId || ""}
        onSave={loadData}
      />
    </>
  );
}
