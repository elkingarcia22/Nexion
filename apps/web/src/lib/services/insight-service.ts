import { supabase } from "@/lib/supabase";

export interface Insight {
  id: number | string;
  title: string;
  description?: string;
  category?: string;
  responsible?: string;
  goal_id?: string;
  linked_jira_key?: string;
  summary_date?: string;
}

export async function getInsights(
  workspaceId: string,
  limitDays: number = 90
): Promise<{ success: boolean; data?: Insight[]; error?: string }> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - limitDays);
    const startStr = startDate.toISOString().split("T")[0];

    const { data: summaries, error } = await supabase
      .from("day_summaries")
      .select("summary_date, kpi_data")
      .eq("workspace_id", workspaceId)
      .gte("summary_date", startStr)
      .order("summary_date", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    const insights: Insight[] = [];

    for (const summary of summaries || []) {
      const kpi = summary.kpi_data || {};
      const dayInsights = (kpi.insights || []).map((a: any, idx: number) => ({
        ...a,
        id: `insight_${summary.summary_date}_${idx}`,
        summary_date: summary.summary_date,
        category: a.category || "Other",
      }));
      insights.push(...dayInsights);
    }

    return { success: true, data: insights };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}
