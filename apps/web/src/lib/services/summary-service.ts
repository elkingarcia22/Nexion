import { supabase } from "@/lib/supabase";

interface DaySummary {
  sources_count: number;
  findings_count: number;
  tasks_count: number;
  alerts_count: number;
  insights_count: number;
  focus_text?: string;
  summary_text?: string;
}

export async function getDaySummary(
  workspaceId: string,
  summaryDate?: string
): Promise<{ success: boolean; data?: DaySummary; error?: string }> {
  if (typeof window !== 'undefined' && localStorage.getItem('NEXION_DEMO_MODE') === 'true') {
    return {
      success: true,
      data: {
        sources_count: 3,
        findings_count: 8,
        tasks_count: 2,
        alerts_count: 0,
        insights_count: 1,
        focus_text: "Resumen histórico para el día seleccionado. El sistema está funcionando en modo demo.",
        summary_text: "Simulación de análisis operativo para pruebas de navegación temporal."
      }
    };
  }
  try {
    const targetDate = summaryDate || new Date().toISOString().split("T")[0];

    // Try to get existing summary for the target date
    const { data: summaries, error: summaryError } = await supabase
      .from("day_summaries")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("summary_date", targetDate);

    const summaryData = summaries && summaries.length > 0 ? summaries[0] : null;

    if (summaryData) {
      return {
        success: true,
        data: {
          sources_count: summaryData.source_count || 0,
          findings_count: summaryData.finding_count || 0,
          tasks_count: summaryData.proposal_count || 0,
          alerts_count: summaryData.alert_count || 0,
          insights_count: 0,
          focus_text: summaryData.focus_text,
          summary_text: summaryData.summary_text,
        }
      };
    }

    // Fallback: Calculate live counts if summary doesn't exist yet
    const { count: sourcesCount } = await supabase
      .from("sources")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);

    const { count: findingsCount } = await supabase
      .from("findings")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);

    const { count: tasksCount } = await supabase
      .from("task_proposals")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .in("proposal_status", ["pending_review"]);

    return {
      success: true,
      data: {
        sources_count: sourcesCount || 0,
        findings_count: findingsCount || 0,
        tasks_count: tasksCount || 0,
        alerts_count: 0,
        insights_count: 0,
        focus_text: "Procesando fuentes de hoy...",
      }
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
