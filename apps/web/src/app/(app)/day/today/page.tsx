"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AddSourceDrawer } from "@/components/sources/AddSourceDrawer";
import { getDaySummary } from "@/lib/services/summary-service";
import { getSourcesByDate, createSource, deleteSource, updateSource } from "@/lib/services/source-service";
import { getOrCreateWorkspace } from "@/lib/services/workspace-service";
import { fetchGoogleDriveFiles, DriveFile } from "@/lib/services/google-drive-service";
import { fetchGoogleCalendarEvents, CalendarEvent } from "@/lib/services/google-calendar-service";
import { DatePicker } from "@/components/ui/DatePicker";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { supabase } from "@/lib/supabase";

/* ─── Data ────────────────────────────────────────────────────── */

const focusCards = [
  {
    tag: "OBJETIVO CRÍTICO",
    tagColor: "bg-red-50 text-red-600",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    title: "Cierre Alianza SteelCore",
    description: "Finalizar términos de exclusividad para la región LATAM antes de las 17:00h.",
  },
  {
    tag: "MÉTRICAS",
    tagColor: "bg-blue-50 text-blue-600",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    title: "Validación Q4",
    description: "Revisar proyecciones de ingresos ajustadas tras la última ronda de inversión.",
  },
  {
    tag: "ESTRATÉGICO",
    tagColor: "bg-purple-50 text-purple-600",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    title: "Aprobación Presupuesto Q4",
    description: "Confirmar ajustes presupuestarios solicitados por la dirección financiera.",
  },
];

const tasks = [
  { id: 1, title: "Actualizar certificados SSL del cluster de producción", tag: "CERTIFICADOS", tagColor: "bg-blue-50 text-blue-700", date: "16 Oct, 2023", file: "Reporte Seguridad.pdf", priority: "ALTA", priorityColor: "text-red-500" },
  { id: 2, title: "Definir KPIs para el módulo de fidelización", tag: "MÉTRICAS", tagColor: "bg-blue-50 text-blue-700", date: "20 Oct, 2023", file: "Minuta Reunión.docx", priority: "MEDIA", priorityColor: "text-orange-500" },
  { id: 3, title: "Revisar propuesta de diseño para el panel móvil", tag: "DISEÑO", tagColor: "bg-purple-50 text-purple-700", date: "15 Oct, 2023", file: "Feedback_Cliente.txt", priority: "BAJA", priorityColor: "text-gray-400" },
];

type SourceType = "FUENTE EXTERNA" | "NOTAS DE GEMINI" | "DOCUMENTO";

interface Source {
  id: string | number;
  name: string;
  type: SourceType;
  format: string;
  time: string;
  checked: boolean;
  url?: string | null;
  icon: React.ReactNode;
  isManual?: boolean;
}

const initialSources: Source[] = [
  {
    id: 1, name: "Minuta de Reunión", type: "FUENTE EXTERNA", format: "DOCX", time: "09:15", checked: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: 2, name: "Reporte Trimestral Q3", type: "NOTAS DE GEMINI", format: "PDF", time: "10:30", checked: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    id: 3, name: "Presupuesto Operativo 2024", type: "FUENTE EXTERNA", format: "XLSX", time: "11:00", checked: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
  {
    id: 4, name: "Estrategia de Producto v2", type: "NOTAS DE GEMINI", format: "DOC", time: "12:45", checked: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    id: 5, name: "Análisis de Mercado", type: "FUENTE EXTERNA", format: "PDF", time: "11:20", checked: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    id: 6, name: "Feedback del Cliente VIP", type: "FUENTE EXTERNA", format: "TXT", time: "14:00", checked: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

/* ─── Helpers ─────────────────────────────────────────────────── */

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const typeStyles: Record<SourceType, string> = {
  "FUENTE EXTERNA": "bg-orange-50 text-orange-600",
  "NOTAS DE GEMINI": "bg-purple-50 text-purple-600",
  "DOCUMENTO": "bg-blue-50 text-blue-600",
};

/* ─── Page ────────────────────────────────────────────────────── */

export default function DayTodayPage() {
  const [activeTab, setActiveTab] = useState<"hoy" | "fuentes">("hoy");
  const [checkedTasks, setCheckedTasks] = useState<number[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [user, setUser] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [driveSyncing, setDriveSyncing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Map a raw DB row to the UI Source shape
  const mapDbSource = (s: any): Source => {
    const isGoogle = s.source_origin === "google";

    const url: string = s.original_url || "";
    let fmt = "DOC";
    if (url.includes("spreadsheets")) fmt = "SHEET";
    else if (url.includes(".pdf")) fmt = "PDF";
    else if (url.includes("docs.google")) fmt = "DOC";
    else if (url.includes("presentation")) fmt = "SLIDE";
    else if (url.includes(".docx")) fmt = "DOCX";

    let label: SourceType = "FUENTE EXTERNA";
    if (isGoogle) {
      if (fmt === "SHEET") label = "DOCUMENTO" as SourceType;
      else if (fmt === "DOC" || fmt === "DOCX") label = "NOTAS DE GEMINI" as SourceType;
      else label = "DOCUMENTO" as SourceType;
    }

    // Enhancement: specific display label for the tag
    const displayTag = isGoogle ? (
      fmt === "SHEET" ? "GOOGLE SHEET" :
      fmt === "PDF" ? "PDF" :
      fmt === "SLIDE" ? "GOOGLE SLIDE" :
      fmt === "DOC" || fmt === "DOCX" ? "GOOGLE DOC" :
      "DOCUMENTO"
    ) : label;

    return {
      id: s.id,
      name: s.title,
      type: label,
      format: fmt,
      time: new Date(s.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      checked: s.current_status === "processed",
      url: s.original_url || null,
      isManual: s.source_origin === "manual",
      displayTag: displayTag,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      ),
    };
  };


  const currentFetchIdRef = useRef(0);

  const fetchData = useCallback(async (forDate: Date) => {
    const fetchId = ++currentFetchIdRef.current;
    
    const y = forDate.getFullYear();
    const m = String(forDate.getMonth() + 1).padStart(2, "0");
    const d = String(forDate.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    try {
      setLoading(true);
      setIsRetrying(true);
      setSyncError(null);
      
      // Clear data to show fresh loading state
      setSources([]);
      setCalendarEvents([]);

      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData?.session?.user;

      if (!sessionUser) {
        console.error("No user found");
        return;
      }

      setUser(sessionUser);

      // 1. Get Workspace
      const wsResult = await getOrCreateWorkspace(sessionUser.id, sessionUser.email || "");
      if (!wsResult.success || !wsResult.data) {
        console.error("No workspace found or created:", wsResult.error);
        return;
      }
      const wsId = wsResult.data.id;
      setWorkspaceId(wsId);

      // 2. Load existing summary
      const y = forDate.getFullYear();
      const m = String(forDate.getMonth() + 1).padStart(2, "0");
      const d = String(forDate.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;
      const summaryResult = await getDaySummary(wsId, dateStr);
      if (summaryResult.success) {
        setSummaryData(summaryResult.data);
      } else {
        setSummaryData(null);
      }

      // 3. Load DB sources for the selected date only
      const sourcesResult = await getSourcesByDate(wsId, forDate);
      const dbRows = sourcesResult.success && sourcesResult.data ? sourcesResult.data : [];
      
      const dbSources: Source[] = dbRows.map(mapDbSource);
      
      // Filter out noise AND duplicates that might already be in DB
      const noiseWords = ["Comprobante", "Transferencia", "Factura", "Payment"];
      const seenIdsInitial = new Set();
      const seenUrlsInitial = new Set();
      const normalize = (u: string) => u ? u.split("?")[0].replace(/\/$/, "") : "";

      const cleanDbSources = dbSources.filter(s => {
        if (seenIdsInitial.has(s.id)) return false;
        seenIdsInitial.add(s.id);
        
        if (s.url) {
          const norm = normalize(s.url);
          if (seenUrlsInitial.has(norm)) return false;
          seenUrlsInitial.add(norm);
        }

        return !noiseWords.some(w => s.name.toLowerCase().includes(w.toLowerCase()));
      });

      if (fetchId !== currentFetchIdRef.current) return;
      setSources(cleanDbSources);

      // 4. Fetch Calendar Events
      setCalendarLoading(true);
      const calendarResult = await fetchGoogleCalendarEvents(dateStr);
      
      if (fetchId !== currentFetchIdRef.current) return;
      setCalendarLoading(false);
      
      if (calendarResult.success && calendarResult.events) {
        setCalendarEvents(calendarResult.events);
      } else if (!calendarResult.success && calendarResult.error) {
        // If it's a 401/403 or token error, we want the global banner to show
        setSyncError(calendarResult.error);
        console.error("Calendar Sync Error:", calendarResult.error);
      }

      // 5. Auto-sync Drive files for the selected date
      const existingUrls = new Set(dbRows.map((s: any) => s.original_url).filter(Boolean));

      if (fetchId !== currentFetchIdRef.current) return;
      setDriveSyncing(true);
      const driveResult = await fetchGoogleDriveFiles("all", dateStr);
      
      if (fetchId !== currentFetchIdRef.current) return;
      setDriveSyncing(false);

      if (driveResult.success && driveResult.files && driveResult.files.length > 0) {        
        const normalizeUrl = (url: string) => url ? url.split("?")[0].replace(/\/$/, "") : "";
        
        const autoAdded: Source[] = [];
        for (const file of driveResult.files) {
          const fileUrl = normalizeUrl(file.webViewLink);
          const existing = dbRows.find((r: any) => normalizeUrl(r.original_url) === fileUrl);
          
          if (existing) {
            if (existing.source_origin === "manual") {
              await updateSource(existing.id, { source_origin: "google" } as any);
              setSources(prev => prev.map(s => 
                s.id === existing.id ? { ...s, isManual: false, type: "NOTAS DE GEMINI" } : s
              ));
            }
            continue;
          }

          const result = await createSource({
            title: file.name,
            url: file.webViewLink,
            type: file.mimeType.includes("spreadsheet") ? "document" : "meeting",
            workspaceId: wsId,
            createdBy: sessionUser.id,
            origin: "google",
            sourceDate: forDate.toISOString(),
          });
          if (result.success && result.data) {
            autoAdded.push(mapDbSource(result.data as any));
          }
        }
        
        if (fetchId !== currentFetchIdRef.current) return;
        
        if (autoAdded.length > 0) {
          setSources((prev) => {
            const combined = [...autoAdded, ...prev];
            const seenIds = new Set();
            const seenUrls = new Set();
            const normalize = (u: string) => u ? u.split("?")[0].replace(/\/$/, "") : "";

            return combined.filter(s => {
              if (seenIds.has(s.id)) return false;
              seenIds.add(s.id);
              if (s.url) {
                const norm = normalize(s.url);
                if (seenUrls.has(norm)) return false;
                seenUrls.add(norm);
              }
              return !noiseWords.some(w => s.name.toLowerCase().includes(w.toLowerCase()));
            });
          });
        }
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } else if (!driveResult.success) {
        setSyncError(driveResult.error || "Error al sincronizar con Google Drive");
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setSyncError("Error inesperado al cargar datos.");
    } finally {
      if (fetchId === currentFetchIdRef.current) {
        setLoading(false);
        setIsRetrying(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  const navigateDate = useCallback((delta: number) => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + delta);
      return next;
    });
  }, []);

  const handleDateChange = useCallback((d: Date) => {
    setSelectedDate(d);
  }, []);

  // Re-fetch whenever selected date changes
  useEffect(() => {
    fetchData(selectedDate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const isFuture = selectedDate > new Date();

  const toggleTask = (id: number) =>
    setCheckedTasks((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const toggleSource = (id: number) =>
    setSources((prev) => prev.map((s) => s.id === id ? { ...s, checked: !s.checked } : s));

  const handleDeleteSource = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    const result = await deleteSource(confirmDeleteId);
    if (result.success) {
      setSources((prev) => prev.filter((s) => s.id !== confirmDeleteId));
      setConfirmDeleteId(null);
    } else {
      alert("Error al eliminar la fuente: " + result.error);
    }
  };

  const handleRenameSource = async (id: string, currentTitle: string) => {
    const newTitle = prompt("Nuevo nombre de la fuente:", currentTitle);
    if (!newTitle || newTitle === currentTitle) return;

    const result = await updateSource(id, { title: newTitle });
    if (result.success) {
      setSources((prev) => prev.map((s) => s.id === id ? { ...s, name: newTitle } : s));
    } else {
      alert("Error al renombrar la fuente: " + result.error);
    }
  };

  const filteredSources = sources.filter((s) => {
    const typeOk = typeFilter === "all" || s.type === typeFilter;
    const fmtOk = formatFilter === "all" || s.format === formatFilter;
    return typeOk && fmtOk;
  });

  const checkedCount = sources.filter((s) => s.checked).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const userFullName = summaryData?.profiles?.full_name || "Usuario";

  return (
    <div className="min-h-full">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold text-navy">Día</h1>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-border/20 rounded-lg text-xs text-navy/60">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            Análisis automático en: <span className="font-semibold text-navy">04h 22m</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-border/20 rounded-lg px-3 py-1.5 relative">
            {/* Arrow left */}
            <button
              onClick={() => navigateDate(-1)}
              className="p-1 text-navy/40 hover:text-navy transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>

            {/* Date picker trigger */}
            <DatePicker value={selectedDate} onChange={handleDateChange} />

            {/* Arrow right — disabled for future */}
            <button
              onClick={() => !isFuture && navigateDate(1)}
              disabled={isFuture}
              className={`p-1 transition-colors ${
                isFuture ? "text-navy/15 cursor-not-allowed" : "text-navy/40 hover:text-navy"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>

            {/* Today badge */}
            {isToday && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-primary/10 text-primary tracking-wide">
                HOY
              </span>
            )}
          </div>
          <button
            onClick={() => {
              // Trigger a fresh data fetch to simulate analysis check
              fetchData(selectedDate);
              // In a real app, this would call an API to trigger the Day Engine
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: "linear-gradient(135deg, #1a6bff 0%, #2ec6ff 100%)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" />
            </svg>
            Analizar día
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-border/20 mb-8">
        {(["hoy", "fuentes"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${
              activeTab === tab ? "text-navy" : "text-navy/40 hover:text-navy/60"
            }`}
          >
            {tab === "hoy" ? "Hoy" : "Fuentes"}
            {tab === "fuentes" && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                activeTab === "fuentes" ? "bg-primary text-white" : "bg-navy/10 text-navy/50"
              }`}>
                {sources.length}
              </span>
            )}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
        ))}
      </div>
      
      {/* ── SYNC ERROR BANNER (Global) ── */}
      {syncError && (
        <div className="mb-8 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl shadow-sm flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-inner">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900 mb-0.5">Problema de Sincronización</h4>
              <p className="text-xs text-amber-700/80 font-medium max-w-lg">{syncError}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {syncError.toLowerCase().includes("token") || 
             syncError.toLowerCase().includes("expirado") || 
             syncError.toLowerCase().includes("sesión") || 
             syncError.toLowerCase().includes("auth") || 
             syncError.toLowerCase().includes("401") || 
             syncError.toLowerCase().includes("403") || 
             syncError.toLowerCase().includes("unauthorized") ? (
               <button 
                onClick={() => {
                  console.log("Redirecting to login with force=true");
                  window.location.href = "/auth/login?force=true&reconnect=true";
                }}
                className="px-6 py-2.5 bg-amber-600 text-white text-[11px] font-black tracking-wider rounded-xl hover:bg-amber-700 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-amber-600/30 uppercase whitespace-nowrap flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
                RECONECTAR CUENTA
              </button>
            ) : (
              <div className="flex flex-col items-end gap-1">
                <button 
                  onClick={() => fetchData(selectedDate)}
                  disabled={isRetrying}
                  className="px-5 py-2 bg-white text-amber-700 text-[11px] font-black tracking-wider rounded-xl border border-amber-200 hover:bg-amber-50 hover:scale-105 active:scale-95 transition-all shadow-sm uppercase flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
                >
                  {isRetrying && <span className="w-3 h-3 rounded-full border-2 border-amber-600/30 border-t-amber-600 animate-spin" />}
                  {isRetrying ? "REINTENTANDO..." : "REINTENTAR"}
                </button>
                <button 
                  onClick={() => window.location.href = "/auth/login?force=true&reconnect=true"}
                  className="text-[9px] text-amber-600/60 hover:text-amber-600 font-bold underline underline-offset-2 transition-colors uppercase tracking-tighter"
                >
                  ¿Sigue sin funcionar? Forzar reconexión
                </button>
              </div>
            )}
            
            <button 
              onClick={() => setSyncError(null)}
              className="p-2 text-amber-400 hover:text-amber-600 transition-colors"
              title="Cerrar aviso"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: HOY ── */}
      {activeTab === "hoy" && (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-navy">¡Bienvenido de nuevo!</h2>

          {/* Executive Summary */}
          <div className="bg-white rounded-xl border border-border/20 p-5 shadow-soft">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#1a6bff">
                  <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-navy mb-2">Resumen Ejecutivo</p>
                <p className="text-sm text-navy/70 leading-relaxed">
                  {summaryData?.focus_text || "No hay un resumen disponible para hoy todavía. Añade fuentes para comenzar el análisis."}
                </p>
              </div>
            </div>
          </div>

          {/* Focus cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-border/20 p-5 shadow-soft">
              <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center">
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="1.8">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <span className={`text-[10px] font-bold tracking-widest px-2 py-1 rounded-full bg-blue-50 text-blue-600`}>FUENTES</span>
              </div>
              <p className="text-sm font-bold text-navy mb-1.5">{summaryData?.sources_count || 0} Fuentes</p>
              <p className="text-xs text-navy/60 leading-relaxed">Documentos, reuniones y notas recolectadas hoy.</p>
            </div>
            
            <div className="bg-white rounded-xl border border-border/20 p-5 shadow-soft">
              <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center">
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <span className={`text-[10px] font-bold tracking-widest px-2 py-1 rounded-full bg-orange-50 text-orange-600`}>HALLAZGOS</span>
              </div>
              <p className="text-sm font-bold text-navy mb-1.5">{summaryData?.findings_count || 0} Hallazgos</p>
              <p className="text-xs text-navy/60 leading-relaxed">Puntos clave identificados automáticamente.</p>
            </div>

            <div className="bg-white rounded-xl border border-border/20 p-5 shadow-soft">
              <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center">
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a6bff" strokeWidth="1.8">
                    <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                </div>
                <span className={`text-[10px] font-bold tracking-widest px-2 py-1 rounded-full bg-purple-50 text-purple-600`}>TAREAS</span>
              </div>
              <p className="text-sm font-bold text-navy mb-1.5">{summaryData?.tasks_count || 0} Pendientes</p>
              <p className="text-xs text-navy/60 leading-relaxed">Propuestas de acción basadas en el análisis.</p>
            </div>
          </div>

          {/* Meetings Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <h3 className="text-[11px] font-bold tracking-[0.2em] text-navy/40 uppercase">Tu Agenda (Google Calendar)</h3>
                {calendarEvents.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                    {calendarEvents.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {calendarLoading && (
                  <div className="flex items-center gap-2 text-[10px] text-primary font-bold uppercase tracking-widest animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Sincronizando
                  </div>
                )}
                <button 
                  onClick={() => fetchData(selectedDate)}
                  disabled={calendarLoading}
                  className="p-1.5 text-navy/20 hover:text-primary transition-colors bg-white border border-border/10 rounded-lg shadow-sm"
                  title="Sincronizar calendario y archivos"
                >
                  <svg 
                    className={`${calendarLoading ? "animate-spin" : ""}`}
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  >
                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                    <polyline points="21 3 21 8 16 8" />
                  </svg>
                </button>
              </div>
            </div>

            {calendarEvents.length === 0 ? (
              <div className="bg-white/40 backdrop-blur-md rounded-3xl border border-dashed border-navy/10 p-10 text-center transition-all hover:bg-white/60">
                <div className="w-16 h-16 rounded-2xl bg-navy/5 flex items-center justify-center mx-auto mb-4 border border-white shadow-sm">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-navy/20">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <h4 className="text-navy/60 font-bold text-sm mb-1">Agenda despejada</h4>
                <p className="text-xs text-navy/30">No se encontraron reuniones programadas para este día.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {calendarEvents.map((event) => {
                  const startD = new Date(event.start);
                  const endD = new Date(event.end);
                  const startTime = startD.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const endTime = endD.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const isAllDay = !event.start.includes('T');
                  
                  // Check if meeting is happening now
                  const now = new Date();
                  const isNow = !isAllDay && now >= startD && now <= endD;

                  return (
                    <div key={event.id} className={`group relative bg-white rounded-3xl border p-5 shadow-soft hover:shadow-hard transition-all duration-500 hover:-translate-y-1.5 ${isNow ? 'border-primary/30 ring-4 ring-primary/5' : 'border-border/20'}`}>
                      {isNow && (
                        <div className="absolute -top-2 -right-2 px-2 py-1 bg-red-500 text-white text-[9px] font-black rounded-lg shadow-lg z-10 animate-bounce">
                          EN VIVO
                        </div>
                      )}
                      
                      <div className="flex flex-col h-full relative z-10">
                        <div className="flex items-center justify-between gap-2 mb-4">
                          <div className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border ${
                            isAllDay 
                              ? 'bg-amber-50 text-amber-600 border-amber-100' 
                              : isNow 
                                ? 'bg-primary text-white border-primary shadow-sm'
                                : 'bg-navy/5 text-navy/60 border-navy/5'
                          }`}>
                            {isAllDay ? 'TODO EL DÍA' : `${startTime} — ${endTime}`}
                          </div>
                          
                          {event.hangoutLink && (
                            <a 
                              href={event.hangoutLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="w-9 h-9 rounded-xl bg-primary/5 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-sm group-hover:scale-110 active:scale-90"
                              title="Unirse a la videollamada"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M23 7l-7 5 7 5V7z" />
                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                              </svg>
                            </a>
                          )}
                        </div>

                        <h4 className="text-base font-bold text-navy mb-3 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                          {event.summary || '(Sin título)'}
                        </h4>
                        
                        {(event.location || event.description) && (
                          <div className="mt-auto pt-4 border-t border-navy/5 space-y-2">
                            {event.location && (
                              <p className="text-[11px] text-navy/40 truncate flex items-center gap-2 font-medium">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-primary/40"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                {event.location}
                              </p>
                            )}
                            {event.description && (
                              <p className="text-[11px] text-navy/30 line-clamp-1 italic font-medium leading-relaxed">
                                {event.description.replace(/<[^>]*>/g, '')}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Background decoration */}
                      <div className="absolute bottom-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl -mb-12 -mr-12 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tasks Section */}
          <div className="space-y-4 pt-6">
            <h3 className="text-[11px] font-bold tracking-[0.2em] text-navy/40 uppercase">Tareas Prioritarias</h3>
            
            <div className="bg-gradient-to-br from-navy/[0.03] to-navy/[0.01] border border-navy/5 rounded-3xl p-10 text-center backdrop-blur-sm relative overflow-hidden group">
              {/* Animated sparkles/background items */}
              <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary rounded-full blur-[80px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-blue-400 rounded-full blur-[80px] animate-pulse delay-700" />
              </div>

              <div className="relative z-10">
                <div className="w-20 h-20 rounded-3xl bg-white shadow-hard flex items-center justify-center mx-auto mb-6 border border-border/10 group-hover:scale-110 transition-transform duration-500">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary">
                    <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-navy mb-3">Análisis Inteligente en Espera</h4>
                <p className="text-sm text-navy/50 max-w-md mx-auto mb-8 leading-relaxed">
                  Procesa tus reuniones y documentos de hoy para que <span className="text-primary font-bold">Nexión Intelligence</span> genere automáticamente tus próximos pasos críticos.
                </p>
                <button
                  onClick={() => fetchData(selectedDate)}
                  className="inline-flex items-center gap-3 px-8 py-3.5 rounded-2xl text-sm font-bold text-white shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all duration-300"
                  style={{ background: "linear-gradient(135deg, #1a6bff 0%, #2ec6ff 100%)" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" />
                  </svg>
                  Analizar Prioridades de Hoy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: FUENTES ── */}
      {activeTab === "fuentes" && (
        <div className="space-y-5">
          {/* Section header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold tracking-widest text-navy/50 uppercase">Fuentes del día</span>
              {lastSyncTime && !driveSyncing && (
                <span className="text-[10px] text-navy/30 font-medium">
                  Sincronizado: {lastSyncTime}
                </span>
              )}
              {driveSyncing && (
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-primary/70">
                  <span className="w-3 h-3 rounded-full border-2 border-primary/40 border-t-primary animate-spin inline-block" />
                  Sincronizando Drive...
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchData(selectedDate)}
                disabled={driveSyncing}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  driveSyncing 
                    ? "bg-navy/5 text-navy/30 cursor-not-allowed" 
                    : "bg-white border border-border/20 text-navy/60 hover:text-primary hover:border-primary/50 shadow-sm"
                }`}
              >
                <svg 
                  className={`${driveSyncing ? "animate-spin" : ""}`}
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  <polyline points="21 3 21 8 16 8" />
                </svg>
                {driveSyncing ? "Sincronizando..." : "Sincronizar ahora"}
              </button>

              <button
                onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border-2 border-primary/30 text-primary hover:bg-primary/5 transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                Añadir fuente
              </button>
            </div>
          </div>


          {/* Filters row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Type filter */}
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="appearance-none bg-white border border-border/30 text-sm text-navy/70 font-medium rounded-lg pl-3 pr-8 py-2 cursor-pointer hover:border-border/60 focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="all">Tipo de recurso</option>
                  <option value="FUENTE EXTERNA">Fuente Externa</option>
                  <option value="NOTAS DE GEMINI">Notas de Gemini</option>
                </select>
                <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-navy/40" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
              </div>

              {/* Format filter */}
              <div className="relative">
                <select
                  value={formatFilter}
                  onChange={(e) => setFormatFilter(e.target.value)}
                  className="appearance-none bg-white border border-border/30 text-sm text-navy/70 font-medium rounded-lg pl-3 pr-8 py-2 cursor-pointer hover:border-border/60 focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="all">Formato</option>
                  <option value="PDF">PDF</option>
                  <option value="DOCX">DOCX</option>
                  <option value="DOC">DOC</option>
                  <option value="SHEET">SHEET</option>
                  <option value="TXT">TXT</option>
                </select>
                <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-navy/40" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
            </div>

            {/* Sort */}
            <button className="flex items-center gap-2 text-xs font-bold tracking-widest text-navy/50 uppercase hover:text-navy/70 transition-colors">
              ORDENAR
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="9" y1="18" x2="15" y2="18" />
              </svg>
            </button>
          </div>

          {/* Sources list */}
          <div className="bg-white rounded-xl border border-border/20 shadow-soft divide-y divide-border/10">
            {filteredSources.length === 0 && !driveSyncing && (
              <div className="py-12 text-center text-navy/40 text-sm">
                No hay fuentes para hoy todavía.
              </div>
            )}
            {filteredSources.map((source) => (
              <div key={source.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors">
                {/* Checkbox */}
                <button
                  onClick={() => toggleSource(source.id as number)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    source.checked ? "border-primary bg-primary" : "border-border/40 hover:border-primary/50"
                  }`}
                >
                  {source.checked && <CheckIcon />}
                </button>

                {/* Icon box */}
                <div className="w-11 h-11 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0">
                  {source.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy mb-1 truncate">{source.name}</p>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-md ${typeStyles[source.type]}`}>
                      {source.displayTag || source.type}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-navy/40 font-medium">
                      {source.format}
                    </span>
                    <span className="text-navy/20">·</span>
                    <span className="flex items-center gap-1 text-xs text-navy/40">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                      {source.time}
                    </span>
                  </div>
                </div>

                {/* Actions: Edit, Delete, Link */}
                <div className="flex items-center gap-1">
                  {source.isManual && (
                    <>
                      <button
                        onClick={() => handleRenameSource(source.id as string, source.name)}
                        className="text-navy/20 hover:text-primary transition-colors p-1.5"
                        title="Renombrar"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>

                      <button
                        onClick={() => handleDeleteSource(source.id as string)}
                        className="text-navy/20 hover:text-red-500 transition-colors p-1.5"
                        title="Eliminar"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </>
                  )}

                  {source.url && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-navy/20 hover:text-primary transition-colors p-1.5"
                      title="Abrir en Drive"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                        <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                    </a>
                  )}
                  <button className="text-navy/20 hover:text-primary transition-colors p-1.5">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}

            {filteredSources.length === 0 && (
              <div className="py-12 text-center text-navy/40 text-sm">
                No hay fuentes con estos filtros.
              </div>
            )}
          </div>

          {/* Summary */}
          <p className="text-xs text-navy/40 text-right">
            {checkedCount} de {sources.length} fuentes seleccionadas para análisis
          </p>
        </div>
      )}

      <AddSourceDrawer 
        open={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        onAdd={() => {
          setDrawerOpen(false);
          fetchData(selectedDate);
        }}
        sourceDate={selectedDate}
      />

      <ConfirmModal
        open={!!confirmDeleteId}
        title="Eliminar Fuente"
        message="¿Estás seguro de que deseas eliminar esta fuente? Esta acción no se puede deshacer y el contenido dejará de estar disponible para el análisis."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
