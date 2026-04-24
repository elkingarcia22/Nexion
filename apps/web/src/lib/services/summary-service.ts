import { supabase } from "@/lib/supabase";

interface DaySummary {
  sources_count: number;
  findings_count: number;
  tasks_count: number;
  alerts_count: number;
  insights_count: number;
  feedback_count: number;
  focus_text?: string;
  summary_text?: string;
  tasks?: any[];
  insights?: any[];
  metrics?: any[];
  alerts?: any[];
  feedback?: any[];
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
        feedback_count: 0,
        focus_text: "Resumen histórico para el día seleccionado. El sistema está funcionando en modo demo.",
        summary_text: "Simulación de análisis operativo para pruebas de navegación temporal."
      }
    };
  }
  try {
    const targetDate = summaryDate || new Date().toISOString().split("T")[0];

    // Try to get existing summary for the target date
    const { data: summaries } = await supabase
      .from("day_summaries")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("summary_date", targetDate);

    const summaryData = summaries && summaries.length > 0 ? summaries[0] : null;

    if (summaryData) {
      const kpi = summaryData.kpi_data || {};
      return {
        success: true,
        data: {
          sources_count: summaryData.source_count || 0,
          findings_count: summaryData.finding_count || 0,
          tasks_count: summaryData.proposal_count || 0,
          alerts_count: summaryData.alert_count || 0,
          insights_count: summaryData.insight_count || 0,
          feedback_count: summaryData.feedback_count || 0,
          focus_text: summaryData.focus_text,
          summary_text: summaryData.summary_text,
          tasks: kpi.tasks || [],
          insights: kpi.insights || [],
          metrics: kpi.metrics || [],
          alerts: kpi.alerts || [],
          feedback: kpi.feedback || [],
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
        feedback_count: 0,
        focus_text: "Procesando fuentes de hoy...",
      }
    };
  } catch (err) {
    console.error("Error fetching day summary:", err);
    return { success: false, error: "Error al obtener el resumen" };
  }
}

export async function saveDayAnalysis(
  workspaceId: string,
  date: string,
  analysis: {
    summary: string;
    tasks?: any[];
    insights?: any[];
    metrics?: any[];
    alerts?: any[];
    feedback?: any[];
    source_count: number
  }
) {
  try {
    console.log("Saving analysis with counts:", {
      tasks: analysis.tasks?.length,
      insights: analysis.insights?.length,
      alerts: analysis.alerts?.length,
      feedback: analysis.feedback?.length,
      source_count: analysis.source_count,
    });

    const { data, error } = await supabase
      .from("day_summaries")
      .upsert({
        workspace_id: workspaceId,
        summary_date: date,
        summary_text: analysis.summary,
        focus_text: analysis.summary.substring(0, 300),
        source_count: analysis.source_count,
        finding_count: analysis.insights?.length || 0,
        proposal_count: analysis.tasks?.length || 0,
        alert_count: analysis.alerts?.length || 0,
        insight_count: analysis.insights?.length || 0,
        feedback_count: analysis.feedback?.length || 0,
        kpi_data: {
          summary_text: analysis.summary,
          tasks: analysis.tasks || [],
          insights: analysis.insights || [],
          metrics: analysis.metrics || [],
          alerts: analysis.alerts || [],
          feedback: analysis.feedback || [],
          tasks_count: analysis.tasks?.length || 0,
          insights_count: analysis.insights?.length || 0,
          alerts_count: analysis.alerts?.length || 0,
          feedback_count: analysis.feedback?.length || 0,
          metrics_count: analysis.metrics?.length || 0,
          source_count: analysis.source_count,
        },
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'workspace_id,summary_date'
      })
      .select();

    console.log("Save result:", { data, error });
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error("Error saving day analysis:", err);
    return { success: false, error: err };
  }
}
