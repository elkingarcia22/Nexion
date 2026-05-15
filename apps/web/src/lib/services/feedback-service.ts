import { supabase } from "@/lib/supabase";

export interface FeedbackItem {
  id: number | string;
  title: string;
  content?: string;
  type?: string;
  category?: string;
  product?: string | null;
  responsible?: string;
  goal_id?: string;
  summary_date?: string;
}

export async function getFeedback(
  workspaceId: string,
  limitDays: number = 90
): Promise<{ success: boolean; data?: FeedbackItem[]; error?: string }> {
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

    const feedback: FeedbackItem[] = [];

    for (const summary of summaries || []) {
      const kpi = summary.kpi_data || {};
      const dayFeedback = (kpi.feedback || []).map((a: any, idx: number) => ({
        ...a,
        id: `feedback_${summary.summary_date}_${idx}`,
        summary_date: summary.summary_date,
        category: a.category || "Other",
        type: a.type || "general",
      }));
      feedback.push(...dayFeedback);
    }

    return { success: true, data: feedback };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}
