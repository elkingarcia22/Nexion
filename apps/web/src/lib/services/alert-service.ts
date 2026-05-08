import { supabase } from "@/lib/supabase";

export interface Alert {
  id: number | string;
  title: string;
  description?: string;
  priority?: string;
  category?: string;
  responsible?: string;
  goal_id?: string;
  linked_jira_key?: string;
  summary_date?: string;
}

export async function getAlerts(
  workspaceId: string,
  limitDays: number = 90
): Promise<{ success: boolean; data?: Alert[]; error?: string }> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - limitDays);
    const startStr = startDate.toISOString().split("T")[0];

    const { data: summaries, error } = await supabase
      .from("day_summaries")
      .select("summary_date, kpi_data, alert_count")
      .eq("workspace_id", workspaceId)
      .gte("summary_date", startStr)
      .order("summary_date", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    const alerts: Alert[] = [];

    for (const summary of summaries || []) {
      const kpi = summary.kpi_data || {};
      const dayAlerts = (kpi.alerts || []).map((a: any, idx: number) => ({
        ...a,
        id: `${summary.summary_date}_${idx}`,
        summary_date: summary.summary_date,
        category: a.category || categorizeFromTitle(a.title),
        priority: normalizePriority(a.priority),
      }));
      alerts.push(...dayAlerts);
    }

    return { success: true, data: alerts };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}

function normalizePriority(p?: string): string {
  if (!p) return "media";
  const low = p.toLowerCase();
  if (low === "critica" || low === "critical" || low === "critico" || low === "highest" || low === "high") return "critica";
  if (low === "alta" || low === "high") return "alta";
  if (low === "media" || low === "medium" || low === "med") return "media";
  return "media";
}

function categorizeFromTitle(title: string): string {
  const t = (title || "").toLowerCase();
  if (t.includes("talent") || t.includes("cultura") || t.includes("personas") || t.includes("gente")) return "Talent";
  if (t.includes("hiring") || t.includes("contratac") || t.includes("reclut")) return "Hiring";
  if (t.includes("ux") || t.includes("diseño") || t.includes("experiencia")) return "UX";
  return "Other";
}
