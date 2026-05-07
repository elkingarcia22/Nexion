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

      // Map Gemini response fields to frontend field names
      const mapGeminiTask = (task: any) => ({
        ...task,
        assignee_name: task.responsible,  // Gemini sends "responsible", map to assignee_name
        team: task.category,               // Gemini sends "category", map to team
      });

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
          tasks: (kpi.tasks || []).map(mapGeminiTask),
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
    console.log("\n📊 === SAVE DAY ANALYSIS START ===");
    console.log(`📌 Workspace ID: ${workspaceId}, Date: ${date}`);
    console.log("📥 Incoming analysis data counts:", {
      tasks: analysis.tasks?.length || 0,
      insights: analysis.insights?.length || 0,
      metrics: analysis.metrics?.length || 0,
      alerts: analysis.alerts?.length || 0,
      feedback: analysis.feedback?.length || 0,
      source_count: analysis.source_count,
    });

    // 1. Save day summary (metadata and KPIs)
    console.log("\n💾 Saving day_summaries row...");
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

    if (error) {
      console.error("❌ Error upserting day_summaries:", error);
      throw error;
    }
    console.log("✅ day_summaries saved successfully");
    console.log("   Stored KPI data:", {
      tasks_count: analysis.tasks?.length || 0,
      insights_count: analysis.insights?.length || 0,
      alerts_count: analysis.alerts?.length || 0,
      feedback_count: analysis.feedback?.length || 0,
      metrics_count: analysis.metrics?.length || 0,
    });

    // 2. Save individual tasks to task_proposals table
    if (analysis.tasks && analysis.tasks.length > 0) {
      console.log(`\n📋 Processing ${analysis.tasks.length} tasks for insertion...`);
      console.log("🔍 FULL Sample Gemini task BEFORE extraction:");
      console.log(JSON.stringify(analysis.tasks[0], null, 2));
      console.log("📌 Task fields available:", Object.keys(analysis.tasks[0]));
      console.log("   - category:", analysis.tasks[0].category);
      console.log("   - responsible:", analysis.tasks[0].responsible);
      console.log("   - team:", analysis.tasks[0].team);
      console.log("   - title:", analysis.tasks[0].title);

      // First, fetch existing auto-generated tasks for this date to delete only those
      console.log(`🔍 Checking for existing auto-generated tasks for date: ${date}`);
      const { data: existingTasks, error: fetchError } = await supabase
        .from("task_proposals")
        .select("id, metadata")
        .eq("workspace_id", workspaceId)
        .eq("suggested_date", date);

      if (fetchError) {
        console.error("❌ Error fetching existing tasks:", fetchError);
      } else {
        console.log(`   Found ${existingTasks?.length || 0} tasks for this date`);
      }

      // Filter for auto-generated tasks and delete them
      const autoGeneratedTaskIds = existingTasks
        ?.filter((t: any) => t.metadata?.auto_generated === true)
        .map((t: any) => t.id) || [];

      if (autoGeneratedTaskIds.length > 0) {
        console.log(`🗑️  Deleting ${autoGeneratedTaskIds.length} previous auto-generated tasks...`);
        const { error: deleteError } = await supabase
          .from("task_proposals")
          .delete()
          .in("id", autoGeneratedTaskIds);

        if (deleteError) {
          console.error("❌ Error deleting old tasks:", deleteError);
        } else {
          console.log(`✅ Deleted ${autoGeneratedTaskIds.length} old tasks`);
        }
      }

      // Then insert new tasks
      const tasksToInsert = analysis.tasks.map((task: any) => {
        // Map Spanish priority values from Gemini to English
        const priority = task.priority?.toLowerCase();
        let mappedPriority = "medium";
        if (priority === "alta" || priority === "highest" || priority === "high") {
          mappedPriority = "high";
        } else if (priority === "baja" || priority === "lowest" || priority === "low") {
          mappedPriority = "low";
        }

        // Extract team and responsible from Gemini response
        // Gemini sends: category (for team), responsible (for person)
        let teamValue = task.category || task.team || task.equipo || task.grupo || "";
        let responsibleValue = task.responsible || task.responsable || task.assignee_name || task.assigned_to || "";

        // Trim whitespace and convert empty strings to null for database
        teamValue = teamValue?.trim() || null;
        responsibleValue = responsibleValue?.trim() || null;

        console.log(`   Task: "${task.title?.substring(0, 40)}..." | category: "${task.category}" | responsible: "${task.responsible}" → team: "${teamValue}", responsible: "${responsibleValue}"`);

        return {
          workspace_id: workspaceId,
          title: task.title || task.name || "Tarea sin título",
          description: task.description || "",
          priority: mappedPriority,
          status: "pending_review",
          suggested_date: date,
          proposal_status: "pending_review",
          team: teamValue,
          responsible: responsibleValue,
          metadata: {
            auto_generated: true,
            team: teamValue,
            responsable: responsibleValue,
            analysis_date: new Date().toISOString(),
            ...task.metadata
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });

      console.log(`💾 Inserting ${tasksToInsert.length} new tasks to task_proposals...`);
      console.log("   Sample task data:", tasksToInsert.slice(0, 2).map(t => ({
        title: t.title,
        priority: t.priority,
        team: t.metadata?.team,
        responsable: t.metadata?.responsable
      })));

      const { error: insertError, data: insertedData } = await supabase
        .from("task_proposals")
        .insert(tasksToInsert)
        .select();

      if (insertError) {
        console.error("❌ Error inserting tasks:", insertError);
        console.error("   Error code:", insertError.code);
        console.error("   Error message:", insertError.message);
      } else {
        console.log(`✅ Successfully inserted ${tasksToInsert.length} tasks to task_proposals`);
        console.log(`   Returned ${insertedData?.length || 0} rows`);
      }
    } else {
      console.log("⏭️  No tasks to insert");
    }

    // Log summary of what was saved
    console.log("\n✅ === SAVE DAY ANALYSIS COMPLETE ===");
    console.log("📦 Summary of saved data:");
    console.log("   - day_summaries: KPI metadata + JSON blob (tasks, insights, metrics, alerts, feedback)");
    console.log(`   - task_proposals: ${analysis.tasks?.length || 0} task records`);
    console.log("   - Alerts stored in: day_summaries.kpi_data.alerts (JSON)");
    console.log("   - Metrics stored in: day_summaries.kpi_data.metrics (JSON)");
    console.log("   - Insights stored in: day_summaries.kpi_data.insights (JSON)");
    console.log("   - Feedback stored in: day_summaries.kpi_data.feedback (JSON)\n");

    return { success: true, data };
  } catch (err) {
    console.error("\n❌ === SAVE DAY ANALYSIS FAILED ===");
    console.error("Error:", err);
    if (err instanceof Error) {
      console.error("Error message:", err.message);
      console.error("Error stack:", err.stack);
    }
    return { success: false, error: err };
  }
}
