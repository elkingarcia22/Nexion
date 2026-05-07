import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Supabase credentials not configured" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get columns info for task_proposals table
    const { data, error } = await supabase
      .from("task_proposals")
      .select("*")
      .limit(1);

    if (error) {
      return NextResponse.json({
        error: error.message,
        hint: error.hint,
      });
    }

    // Get sample data to check structure
    const { data: sampleTasks, error: sampleError } = await supabase
      .from("task_proposals")
      .select("id, title, team, responsible, metadata, created_at")
      .limit(3)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      success: true,
      message: "Database schema check",
      sampleTasks: sampleTasks,
      note: "If team and responsible are null or missing, the columns may not exist or data wasn't saved",
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
    });
  }
}
