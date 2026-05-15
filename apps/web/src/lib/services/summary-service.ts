import { supabase } from "@/lib/supabase";
import { deriveProductFromItem } from "./categorization-service";

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
          tasks: (analysis.tasks || []).map(t => ({ ...t, product: deriveProductFromItem(t) })),
          insights: (analysis.insights || []).map(i => ({ ...i, product: deriveProductFromItem(i) })),
          metrics: analysis.metrics || [],
          alerts: (analysis.alerts || []).map(a => ({ ...a, product: deriveProductFromItem(a) })),
          feedback: (analysis.feedback || []).map(f => ({ ...f, product: deriveProductFromItem(f) })),
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

      // Helper to extract team from title if not found in Gemini response
      const extractTeamFromTitle = (title: string): string | null => {
        if (!title) return null;

        // Pattern: "Team Something" in parentheses → (Team TalentOS)
        const teamMatch = title.match(/\(Team\s+([A-Za-z0-9]+)\)/i);
        if (teamMatch) return teamMatch[1];

        // Pattern: "Equipo: Something"
        const equipoMatch = title.match(/Equipo:\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
        if (equipoMatch) return equipoMatch[1];

        return null;
      };

      // Helper to extract all people names mentioned in title
      const extractAllResponsiblesFromTitle = (title: string): string[] => {
        if (!title) return [];

        const names: Set<string> = new Set();

        // Pattern: "(con Nombre Apellido)" or "(con Nombre Apellido, Otro Nombre)"
        const conMatches = title.match(/\(con\s+([^)]+)\)/i);
        if (conMatches) {
          const people = conMatches[1].split(',').map(p => p.trim());
          people.forEach(p => {
            if (p && p.length > 0) names.add(p);
          });
        }

        // Pattern: "Nombre Apellido:" at the start (e.g., "Elkin Garcia: Task")
        const startMatch = title.match(/^([A-Z][a-z]+ (?:[A-Z][a-z]+ )*[A-Z][a-z]+)\s*:/);
        if (startMatch) {
          names.add(startMatch[1]);
        }

        return Array.from(names);
      };

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

        // If category is "Other", try to extract team from title
        if (!teamValue || teamValue === "Other") {
          const titleTeam = extractTeamFromTitle(task.title);
          if (titleTeam) {
            teamValue = titleTeam;
          }
        }

        // Extract ALL people mentioned in the title and combine with Gemini's responsible
        const titleResponsibles = extractAllResponsiblesFromTitle(task.title);
        const allResponsibles = new Set<string>();

        if (responsibleValue) allResponsibles.add(responsibleValue);
        if (titleResponsibles.length > 0) {
          titleResponsibles.forEach(r => allResponsibles.add(r));
        }

        // Store all responsibles separated by " | " for multi-person filtering
        const allResponsiblesArray = Array.from(allResponsibles);
        if (allResponsiblesArray.length > 0) {
          responsibleValue = allResponsiblesArray.join(" | ");
          console.log(`   All responsibles combined: "${responsibleValue}"`);
        }

        // Trim whitespace and convert empty strings to null for database
        teamValue = teamValue?.trim() || null;
        responsibleValue = responsibleValue?.trim() || null;

        // Validate goal_id: only save if Gemini returned a real UUID (FK safety)
        const validGoalId = (task.goal_id &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(task.goal_id)))
          ? task.goal_id
          : null;

        // Convert AI due_date (YYYY-MM-DD) to ISO string for TIMESTAMPTZ column
        // Use T12:00:00 to avoid midnight UTC timezone shift issues
        const dueDateIso = task.due_date
          ? new Date(task.due_date + 'T12:00:00').toISOString()
          : null;

        console.log(`   Task: "${task.title?.substring(0, 40)}..." | team: "${teamValue}" | responsible: "${responsibleValue}" | due_date: "${task.due_date}" → "${dueDateIso}" | jira: "${task.linked_jira_key || null}" | goal: "${validGoalId}"`);

        return {
          workspace_id: workspaceId,
          title: task.title || task.name || "Tarea sin título",
          description: task.description || "",
          priority: mappedPriority,
          status: "pending_review",
          suggested_date: date,
          due_date: dueDateIso,
          proposal_status: "pending_review",
          team: teamValue,
          responsible: responsibleValue,
          goal_id: validGoalId,
          linked_jira_key: task.linked_jira_key || null,
          linked_jira_subtask_id: task.linked_jira_subtask_id || null,
          metadata: {
            auto_generated: true,
            team: teamValue,
            responsable: responsibleValue,
            product: deriveProductFromItem(task),
            analysis_date: new Date().toISOString(),
            ...task.metadata
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });

      // LOG: Linking summary before insert
      console.log(`\n📊 === LINKING SUMMARY (${tasksToInsert.length} tasks) ===`);
      const withGoal = tasksToInsert.filter(t => t.goal_id).length;
      const withJira = tasksToInsert.filter(t => t.linked_jira_key).length;
      const withBoth = tasksToInsert.filter(t => t.goal_id && t.linked_jira_key).length;
      const withNone = tasksToInsert.filter(t => !t.goal_id && !t.linked_jira_key).length;
      console.log(`  ✅ With goal_id: ${withGoal}/${tasksToInsert.length}`);
      console.log(`  ✅ With jira_key: ${withJira}/${tasksToInsert.length}`);
      console.log(`  🔗 With both: ${withBoth}/${tasksToInsert.length}`);
      console.log(`  ❌ With neither: ${withNone}/${tasksToInsert.length}`);
      console.log("  ── Per-task detail ──");
      tasksToInsert.forEach((t, i) => {
        console.log(`  ${i + 1}. "${t.title.substring(0, 40)}" | goal:${t.goal_id ? t.goal_id.substring(0, 8) : '—'} | jira:${t.linked_jira_key || '—'}`);
      });
      console.log("================================\n");

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

    // ════════════════════════════════════════════════════════════════
    // 🧠 PERSISTENCE TRACEABILITY AUDIT
    // ════════════════════════════════════════════════════════════════
    console.log("\n" + "💾".repeat(20));
    console.log("💾  PERSISTENCE TRACEABILITY AUDIT");
    console.log("💾" + "=".repeat(57));

    const allIncoming = [
      ...(analysis.tasks || []).map((e: any) => ({ ...e, _type: "TASK" })),
      ...(analysis.insights || []).map((e: any) => ({ ...e, _type: "INSIGHT" })),
      ...(analysis.metrics || []).map((e: any) => ({ ...e, _type: "METRIC" })),
      ...(analysis.alerts || []).map((e: any) => ({ ...e, _type: "ALERT" })),
      ...(analysis.feedback || []).map((e: any) => ({ ...e, _type: "FEEDBACK" })),
    ];

    const SEP = "\n  " + "─".repeat(50);

    // 3a. Team/Category grouping across ALL incoming entities
    console.log(SEP);
    console.log("📊  GRUPOS POR CATEGORÍA/EQUIPO (todos los tipos)");

    // Product distribution per team
    console.log(SEP);
    console.log("🏷️  DISTRIBUCIÓN POR PRODUCTO (derivado vía deriveProductFromItem)");
    const productGroups: Record<string, { total: number; TASK: number; INSIGHT: number; ALERT: number; FEEDBACK: number }> = {};
    for (const e of allIncoming) {
      const prod = deriveProductFromItem(e) || "sin_producto";
      if (!productGroups[prod]) productGroups[prod] = { total: 0, TASK: 0, INSIGHT: 0, ALERT: 0, FEEDBACK: 0 };
      productGroups[prod].total++;
      const t = e._type as keyof typeof productGroups[string];
      productGroups[prod][t]++;
    }
    for (const [prod, g] of Object.entries(productGroups).sort((a, b) => b[1].total - a[1].total)) {
      const parts = [];
      if (g.TASK > 0) parts.push(`Tareas:${g.TASK}`);
      if (g.INSIGHT > 0) parts.push(`Insights:${g.INSIGHT}`);
      if (g.ALERT > 0) parts.push(`Alertas:${g.ALERT}`);
      if (g.FEEDBACK > 0) parts.push(`Feedback:${g.FEEDBACK}`);
      console.log(`  🏷️  ${prod.padEnd(25)} → ${g.total} total [${parts.join(", ")}]`);
    }
    const catGroups: Record<string, { total: number; TASK: number; INSIGHT: number; METRIC: number; ALERT: number; FEEDBACK: number }> = {};
    for (const e of allIncoming) {
      const cat = e.category || e.team || "sin_categoria";
      if (!catGroups[cat]) catGroups[cat] = { total: 0, TASK: 0, INSIGHT: 0, METRIC: 0, ALERT: 0, FEEDBACK: 0 };
      catGroups[cat].total++;
      const t = e._type as keyof typeof catGroups[string];
      catGroups[cat][t]++;
    }
    for (const [cat, g] of Object.entries(catGroups).sort((a, b) => b[1].total - a[1].total)) {
      const parts = [];
      if (g.TASK > 0) parts.push(`Tareas:${g.TASK}`);
      if (g.INSIGHT > 0) parts.push(`Insights:${g.INSIGHT}`);
      if (g.METRIC > 0) parts.push(`Metrics:${g.METRIC}`);
      if (g.ALERT > 0) parts.push(`Alertas:${g.ALERT}`);
      if (g.FEEDBACK > 0) parts.push(`Feedback:${g.FEEDBACK}`);
      console.log(`  📁 ${cat.padEnd(20)} → ${g.total} total [${parts.join(", ")}]`);
    }

    // 3b. Responsible grouping
    console.log(SEP);
    console.log("👤  GRUPOS POR RESPONSABLE");
    const respGroups: Record<string, number> = {};
    for (const e of allIncoming) {
      const r = e.responsible || "sin_asignar";
      respGroups[r] = (respGroups[r] || 0) + 1;
    }
    for (const [r, c] of Object.entries(respGroups).sort((a, b) => b[1] - a[1])) {
      console.log(`  👤 ${r.padEnd(20)} → ${c} entidades`);
    }

    // 3c. Objective linking breakdown
    console.log(SEP);
    console.log("🎯  VINCULACIÓN A OBJETIVOS EN PERSISTENCIA");
    const withGoal = allIncoming.filter((e: any) => e.goal_id);
    const withoutGoal = allIncoming.filter((e: any) => !e.goal_id);
    console.log(`  Vinculados a objetivo:   ${withGoal.length}/${allIncoming.length}`);
    console.log(`  Sin objetivo:            ${withoutGoal.length}/${allIncoming.length}`);
    if (withGoal.length > 0) {
      const goalMap: Record<string, number> = {};
      for (const e of withGoal) {
        goalMap[e.goal_id] = (goalMap[e.goal_id] || 0) + 1;
      }
      for (const [gid, cnt] of Object.entries(goalMap)) {
        console.log(`  🔗 ${gid.substring(0, 8)}... → ${cnt} entidades`);
      }
    }

    // 3d. Jira linking breakdown
    console.log(SEP);
    console.log("🟢  VINCULACIÓN A JIRA EN PERSISTENCIA");
    const withJira = allIncoming.filter((e: any) => e.linked_jira_key);
    const withoutJira = allIncoming.filter((e: any) => !e.linked_jira_key);
    console.log(`  Vinculados a Jira:       ${withJira.length}/${allIncoming.length}`);
    console.log(`  Sin Jira:                ${withoutJira.length}/${allIncoming.length}`);
    if (withJira.length > 0) {
      const jiraMap: Record<string, number> = {};
      for (const e of withJira) {
        jiraMap[e.linked_jira_key] = (jiraMap[e.linked_jira_key] || 0) + 1;
      }
      for (const [jk, cnt] of Object.entries(jiraMap)) {
        console.log(`  🔗 ${jk.padEnd(12)} → ${cnt} entidades`);
      }
    }

    // 3e. Cross-entity association matrix (shared objectives/Jira/metrics)
    console.log(SEP);
    console.log("🔗  MATRIZ DE ASOCIACIÓN CRUZADA (persistencia)");
    const allEntityTypes = ["TASK", "INSIGHT", "METRIC", "ALERT", "FEEDBACK"];

    const sharedObj = new Set<string>();
    for (const e of withGoal) {
      const types = allIncoming.filter((o: any) => o.goal_id === e.goal_id).map((o: any) => o._type);
      const uniqueTypes = [...new Set<string>(types)];
      if (uniqueTypes.length > 1) {
        sharedObj.add(`${e.goal_id.substring(0, 8)}: ${uniqueTypes.join(" ⟷ ")}`);
      }
    }
    if (sharedObj.size > 0) {
      console.log("  Por OBJETIVO compartido:");
      for (const s of sharedObj) console.log(`    🔗 ${s}`);
    } else {
      console.log("  (sin asociaciones multi-tipo por objetivo compartido)");
    }

    const sharedJira = new Set<string>();
    for (const e of withJira) {
      const types = allIncoming.filter((o: any) => o.linked_jira_key === e.linked_jira_key).map((o: any) => o._type);
      const uniqueTypes = [...new Set<string>(types)];
      if (uniqueTypes.length > 1) {
        sharedJira.add(`${e.linked_jira_key}: ${uniqueTypes.join(" ⟷ ")}`);
      }
    }
    if (sharedJira.size > 0) {
      console.log("  Por JIRA compartido:");
      for (const s of sharedJira) console.log(`    🔗 ${s}`);
    } else {
      console.log("  (sin asociaciones multi-tipo por Jira compartido)");
    }

    const withMetric = allIncoming.filter((e: any) => e.linked_metric_names?.length > 0);
    if (withMetric.length > 0) {
      const metricMap: Record<string, Set<string>> = {};
      for (const e of withMetric) {
        for (const m of e.linked_metric_names) {
          if (!metricMap[m]) metricMap[m] = new Set();
          metricMap[m].add(e._type);
        }
      }
      const multiMetric = Object.entries(metricMap).filter(([, s]) => s.size > 1);
      if (multiMetric.length > 0) {
        console.log("  Por MÉTRICA compartida:");
        for (const [mn, ts] of multiMetric) {
          console.log(`    📊 "${mn.substring(0, 30)}": ${[...ts].join(" ⟷ ")}`);
        }
      }
    }

    // 3f. Tasks traceability dump (all tasks with their associations)
    if (analysis.tasks && analysis.tasks.length > 0) {
      console.log(SEP);
      console.log("📋  DUMP COMPLETO DE TAREAS CON ASOCIACIONES");
      analysis.tasks.forEach((task: any, i: number) => {
        const assocs = [];
        if (task.goal_id) assocs.push(`OBJETIVO:${task.goal_id.substring(0, 8)}`);
        if (task.linked_jira_key) assocs.push(`JIRA:${task.linked_jira_key}`);
        if (task.linked_jira_subtask_id) assocs.push(`SUB:${task.linked_jira_subtask_id}`);
        if (task.linked_metric_names?.length > 0) assocs.push(`MET:${task.linked_metric_names.join(",")}`);
        const team = task.category || task.team || "—";
        const resp = task.responsible || "—";
        const due = task.due_date || "—";
        console.log(`  ${i + 1}. [${task.priority}] "${task.title?.substring(0, 55)}"`);
        console.log(`     equipo:${team} | resp:${resp} | vence:${due}`);
        if (assocs.length > 0) {
          console.log(`     → ${assocs.join(" | ")}`);
        } else {
          console.log(`     → (sin asociaciones)`);
        }
      });
    }

    console.log("\n" + "💾".repeat(20));
    console.log("💾  FIN PERSISTENCE TRACEABILITY AUDIT");
    console.log("💾" + "=".repeat(57) + "\n");
    // ════════════════════════════════════════════════════════════════

    // 4. Persist Gemini-detected metrics to metrics table + metric_daily_logs + entity_links
    const daySummaryId = data?.[0]?.id;
    if (daySummaryId && analysis.metrics && analysis.metrics.length > 0) {
      console.log(`\n📈 Processing ${analysis.metrics.length} metrics from Gemini for persistence...`);
      const period = getPeriodFromDate(date);

      for (const geminiMetric of analysis.metrics) {
        const metricName = geminiMetric.title || geminiMetric.name;
        if (!metricName) {
          console.warn("   ⚠️ Skipping metric without title/name");
          continue;
        }

        const numericValue = extractNumericValue(geminiMetric.value);
        const unit = inferUnit(geminiMetric.value, geminiMetric.unit);

        const { data: existingMetrics } = await supabase
          .from("metrics")
          .select("id, name, current_value")
          .eq("workspace_id", workspaceId)
          .eq("name", metricName);

        const existingMetric = existingMetrics?.[0] || null;
        let metricId: string | null = existingMetric?.id || null;
        const previousValue = existingMetric?.current_value != null ? Number(existingMetric.current_value) : 0;

        if (existingMetric && numericValue !== null) {
          await supabase
            .from("metrics")
            .update({
              current_value: numericValue,
              previous_value: previousValue,
              source_date: date,
              period,
              source: "gemini_analysis",
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingMetric.id);
          console.log(`   ✅ Updated existing metric "${metricName}": ${previousValue} → ${numericValue}`);
        } else if (!existingMetric && numericValue !== null) {
          const { data: inserted } = await supabase
            .from("metrics")
            .insert({
              workspace_id: workspaceId,
              name: metricName,
              category: normalizeCategory(geminiMetric.category),
              current_value: numericValue,
              unit,
              source: "gemini_analysis",
              source_date: date,
              period,
              sort_order: 100,
              metadata: {},
            })
            .select()
            .single();
          metricId = inserted?.id || null;
          if (metricId) {
            console.log(`   ✅ Inserted new metric "${metricName}" = ${numericValue} ${unit}`);
          }
        } else {
          console.warn(`   ⚠️ Skipping metric "${metricName}": no numeric value and no existing record`);
          continue;
        }

        if (!metricId) continue;

        const delta = numericValue !== null ? numericValue - previousValue : null;

        const { error: logError } = await supabase
          .from("metric_daily_logs")
          .insert({
            workspace_id: workspaceId,
            metric_id: metricId,
            day_summary_id: daySummaryId,
            value: numericValue,
            delta,
            context_text: geminiMetric.change || geminiMetric.description || `Detectado en análisis del ${date}`,
            source: "gemini_analysis",
          });

        if (logError) {
          console.error(`   ❌ Error creating metric_daily_log for "${metricName}":`, logError);
        } else {
          console.log(`   📝 metric_daily_log created for "${metricName}" (delta: ${delta})`);
        }

        const { error: linkError } = await supabase
          .from("entity_links")
          .insert({
            workspace_id: workspaceId,
            source_type: "day_summary",
            source_id: daySummaryId,
            target_type: "metric",
            target_id: metricId,
            relationship: "detected_metric",
            metadata: { metric_name: metricName, value: numericValue, source: "gemini_analysis" },
          });

        if (linkError) {
          console.warn(`   ⚠️ Entity link error for "${metricName}":`, linkError);
        }
      }
    }

    // 4. Create entity_links from day_summary → each source analyzed
    if (daySummaryId && data?.[0]?.source_count && data[0].source_count > 0) {
      // Link back to the day_summary's sources is implicit via the date/workspace.
      // Sources are already linked by workspace_id and summary_date.
      console.log(`   ℹ️ Day summary ${daySummaryId} has ${data[0].source_count} source(s) analyzed`);
    }

    console.log("\n✅ === SAVE DAY ANALYSIS COMPLETE ===");
    console.log("📦 Summary of saved data:");
    console.log("   - day_summaries: KPI metadata + JSON blob (tasks, insights, metrics, alerts, feedback)");
    console.log(`   - task_proposals: ${analysis.tasks?.length || 0} task records`);
    console.log(`   - metrics upserted: ${analysis.metrics?.length || 0}`);
    console.log(`   - metric_daily_logs created: ${analysis.metrics?.length || 0}`);
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

// ── Helper functions ──────────────────────────────────────────────────────

function getPeriodFromDate(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth();
  const year = d.getFullYear();
  const quarter = month < 3 ? "Q1" : month < 6 ? "Q2" : month < 9 ? "Q3" : "Q4";
  return `${quarter} ${year}`;
}

function extractNumericValue(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return value;
  const str = String(value);
  const cleaned = str.replace(/[$€£\s]/g, "").replace(/%/g, "");
  const match = cleaned.match(/-?\d+(?:[\d,.]*\d)?/);
  if (match) {
    const num = parseFloat(match[0].replace(/,/g, ""));
    if (!isNaN(num)) return num;
  }
  return null;
}

function inferUnit(value: unknown, explicitUnit?: string): string {
  if (explicitUnit) return explicitUnit;
  if (value == null) return "USD";
  const str = String(value);
  if (str.includes("%")) return "percent";
  if (str.includes("$")) return "USD";
  if (str.includes("€")) return "EUR";
  if (str.includes("h") || str.includes("hour") || str.includes("hr")) return "hours";
  return "USD";
}

function normalizeCategory(cat: string | undefined | null): string {
  if (!cat) return "general";
  const lower = cat.toLowerCase().trim();
  const valid = ["objetivos", "360", "encuestas", "learning", "matrix", "hiring", "asx", "pyt", "general", "talent", "ux"];
  if (valid.includes(lower)) return lower;
  return "general";
}
