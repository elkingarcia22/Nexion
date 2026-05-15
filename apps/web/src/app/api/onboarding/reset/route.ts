import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workspaceId } = body;

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "workspaceId requerido" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from("metrics").update({ category: "matriz_talento" }).eq("workspace_id", workspaceId).eq("category", "matrix");
    await supabase.from("metrics").update({ category: "evaluacion_360" }).eq("workspace_id", workspaceId).eq("category", "360");
    await supabase.from("metrics").update({ category: "contratacion" }).eq("workspace_id", workspaceId).eq("category", "hiring");
    await supabase.from("metrics").update({ category: "lms_creator" }).eq("workspace_id", workspaceId).eq("category", "creator");
    await supabase.from("metrics").delete().eq("workspace_id", workspaceId).eq("source", "pdf_seed");
    await supabase.from("workspace_objectives").delete().eq("workspace_id", workspaceId);
    await supabase.from("workspace_initiatives").delete().eq("workspace_id", workspaceId);
    await supabase.from("sources").delete().eq("workspace_id", workspaceId);
    await supabase.from("analyses").delete().eq("workspace_id", workspaceId);
    await supabase.from("day_summaries").delete().eq("workspace_id", workspaceId);
    await supabase.from("task_proposals").delete().eq("workspace_id", workspaceId);

    const { error } = await supabase
      .from("workspaces")
      .update({
        analysis_config: {
          onboarding_completed: false,
          onboarding_step: 0,
        },
        objectives_config: {},
        metrics_config: {},
        jira_config: {},
        updated_at: new Date().toISOString(),
      })
      .eq("id", workspaceId);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
