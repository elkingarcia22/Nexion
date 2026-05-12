import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

async function syncSlackSources(supabase: any, workspaceId: string, date: Date) {
  const slackToken = process.env.NEXT_PUBLIC_SLACK_BOT_TOKEN;
  if (!slackToken) return 0;

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const dateStr = `${y}-${m}-${d}`;

  const todayStart = new Date(date);
  todayStart.setHours(0, 0, 0, 0);
  const oldest = Math.floor(todayStart.getTime() / 1000).toString();

  todayStart.setHours(23, 59, 59, 999);
  const latest = Math.floor(todayStart.getTime() / 1000).toString();

  // Get public channels via conversations.list
  const channelsResp = await fetch("https://slack.com/api/conversations.list", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${slackToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ types: "public_channel", limit: 200, exclude_archived: true }),
  });
  const channelsData = await channelsResp.json();
  if (!channelsData.ok) return 0;

  const allChannels: any[] = channelsData.channels?.filter((ch: any) => ch.is_member) || [];

  // Attempt cursor pagination
  let cursor = channelsData.response_metadata?.next_cursor;
  while (cursor) {
    const pageResp = await fetch("https://slack.com/api/conversations.list", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${slackToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ types: "public_channel", limit: 200, exclude_archived: true, cursor }),
    });
    const pageData = await pageResp.json();
    if (!pageData.ok) break;
    if (pageData.channels) {
      for (const ch of pageData.channels) {
        if (ch.is_member && !allChannels.some((c: any) => c.id === ch.id)) {
          allChannels.push(ch);
        }
      }
    }
    cursor = pageData.response_metadata?.next_cursor;
  }

  // Also try to load known private channels from DB
  const { data: dbPrivateChannels } = await supabase
    .from("app_slack_channels")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_private", true);

  if (dbPrivateChannels) {
    for (const pc of dbPrivateChannels) {
      if (!allChannels.some((c: any) => c.id === pc.channel_id)) {
        const infoResp = await fetch(`https://slack.com/api/conversations.info?channel=${pc.channel_id}`, {
          headers: { "Authorization": `Bearer ${slackToken}` },
        });
        const infoData = await infoResp.json();
        if (infoData.ok && infoData.channel?.is_member) {
          allChannels.push(infoData.channel);
        }
      }
    }
  }

  let added = 0;

  for (const channel of allChannels) {
    let allMessages: any[] = [];
    let msgCursor: string | undefined = undefined;

    do {
      const msgBody: any = { channel: channel.id, oldest, latest, limit: 200 };
      if (msgCursor) msgBody.cursor = msgCursor;

      const msgResp = await fetch("https://slack.com/api/conversations.history", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${slackToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(msgBody),
      });
      const msgData = await msgResp.json();
      if (!msgData.ok) break;

      if (msgData.messages) {
        allMessages = allMessages.concat(msgData.messages);
      }
      msgCursor = msgData.response_metadata?.next_cursor;
    } while (msgCursor);

    if (allMessages.length === 0) continue;

    const preview = allMessages.slice(0, 5).map((m: any) => m.text).join("\n---\n");
    const metadata = {
      channelId: channel.id,
      channelName: channel.name,
      isPrivate: channel.is_private || false,
      messageCount: allMessages.length,
      messages: allMessages.map((m: any) => ({ user: m.user, text: m.text, ts: m.ts })),
      preview: preview.substring(0, 2000),
    };

    const { data: existing } = await supabase
      .from("sources")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("source_origin", "slack")
      .eq("external_source_id", channel.id)
      .eq("source_date", dateStr)
      .single();

    if (existing) {
      await supabase.from("sources").update({ metadata, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("sources").insert([{
        workspace_id: workspaceId,
        title: `#${channel.name}`,
        source_type: "meeting",
        source_origin: "slack",
        ingest_mode: "slack",
        current_status: "pending",
        source_date: dateStr,
        external_source_id: channel.id,
        metadata,
      }]);
      added++;
    }
  }

  return added;
}

async function getSources(supabase: any, workspaceId: string, date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const dateStr = `${y}-${m}-${d}`;

  const { data } = await supabase
    .from("sources")
    .select("*")
    .eq("workspace_id", workspaceId)
    .gte("source_date", `${dateStr}T00:00:00.000Z`)
    .lt("source_date", getNextDayUtc(dateStr));

  return data || [];
}

function getNextDayUtc(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00.000Z");
  d.setDate(d.getDate() + 1);
  return d.toISOString();
}

async function getSourcesWithContent(sources: any[]) {
  return sources
    .map((s: any) => {
      let content = "";
      if (s.source_origin === "slack" && s.metadata?.messages) {
        content = s.metadata.messages.map((m: any) => m.text).join("\n");
      } else if (s.metadata?.content) {
        content = s.metadata.content;
      } else if (s.metadata?.preview) {
        content = s.metadata.preview;
      }
      return { id: s.id, name: s.title || s.name, type: s.source_origin, format: "TEXT", content };
    })
    .filter((s: any) => s.content && s.content.length > 0);
}

async function getObjectives(supabase: any, workspaceId: string) {
  const { data } = await supabase
    .from("workspace_objectives")
    .select("*")
    .eq("workspace_id", workspaceId)
    .limit(50);
  return data || [];
}

async function runGeminiAnalysis(data: any) {
  const apiKey = data.apiKey || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return null;

  const nextDayDate = new Date(data.date);
  nextDayDate.setDate(nextDayDate.getDate() + 1);
  const nextDay = nextDayDate.toISOString().split('T')[0];

  const hasTasksProductFilter = data.analysisConfig?.resolved_tasks?.length > 0;
  const hasOpenProductFilter = data.analysisConfig?.resolved_open?.length > 0;
  const hasResponsibleFilter = data.analysisConfig?.filter_responsibles && data.analysisConfig?.selected_responsibles?.length > 0;

  const openCategories = [
    ...(data.analysisConfig?.resolved_open || []),
    ...(data.analysisConfig?.custom_categories || []),
  ].filter(Boolean);
  const openCategoriesStr = openCategories.length > 0 ? openCategories.join(", ") : "cualquier categoría";

  const prompt = `
    🔴 REGLA ABSOLUTA: TODO el contenido de la respuesta debe estar 100% EN ESPAÑOL.

    Eres un Asistente de Inteligencia Operativa llamado Nexión.
    Tu misión es realizar un análisis jerárquico y profundo de la actividad del día ${data.date}.

    DATOS DEL USUARIO:
    - NOMBRE: ${data.userName || "Usuario"}

    CONTEXTO ESTRATÉGICO (Objetivos y KRs):
    ${JSON.stringify(data.objectives, null, 2)}

    CONTEXTO OPERATIVO (Jira User Stories y Subtasks):
    ${JSON.stringify(data.jiraContext, null, 2)}

    FUENTES A ANALIZAR:
    ${data.sources.map((s: any) => `
    --- FUENTE ---
    NOMBRE: ${s.name}
    CONTENIDO: ${s.content || "Sin contenido"}
    --- FIN ---
    `).join('\n')}

    ${hasTasksProductFilter ? `FILTRO DE TAREAS: Solo genera TAREAS relacionadas con estos productos: ${data.analysisConfig.resolved_tasks.join(", ")}. Ignora otros temas para las tareas.` : ""}

    ${hasOpenProductFilter ? `FILTRO DE INSIGHTS/MÉTRICAS/ALERTAS: Para insights, métricas y alertas usa estas categorías: ${openCategoriesStr}. Puedes usar cualquiera de estas.` : `CATEGORÍAS PARA INSIGHTS/MÉTRICAS/ALERTAS: Puedes usar cualquier categoría, incluyendo estas sugeridas: ${openCategoriesStr}.`}

    ${hasResponsibleFilter ? `FILTRO DE RESPONSABLES: Solo genera tareas e insights donde el responsable sea uno de: ${data.analysisConfig.selected_responsibles.join(", ")}. Ignora menciones de otras personas.` : ""}

    CATEGORÍAS VÁLIDAS para el campo "category": objetivos, encuestas, matriz_talento, evaluacion_360, aprendizaje, modo_ia_estudio, lms_creator, planes_formacion, universidad_corporativa, certificados, seguimientos, metricas_empresa, assessments, learning_map, gestion_usuarios, organigrama, gestion_empresa, personalizacion, roles_permisos, comunicaciones, api, app, core_ia, chat_soporte, planes_tareas, contratacion, pyt

    ESTRUCTURA DE RESPUESTA (JSON — todos los textos en español):
    {
      "summary": "Resumen ejecutivo del día",
      "tasks": [{ "title": "...", "priority": "alta/media/baja", "category": "objetivos/encuestas/matriz_talento/evaluacion_360/aprendizaje/modo_ia_estudio/lms_creator/planes_formacion/universidad_corporativa/certificados/seguimientos/metricas_empresa/assessments/learning_map/gestion_usuarios/organigrama/gestion_empresa/personalizacion/roles_permisos/comunicaciones/api/app/core_ia/chat_soporte/planes_tareas/contratacion/pyt", "responsible": "Nombre", "goal_id": "ID o null", "linked_jira_key": "Key o null", "due_date": "YYYY-MM-DD o null" }],
      "insights": [{ "title": "...", "description": "...", "category": "objetivos/encuestas/matriz_talento/evaluacion_360/aprendizaje/modo_ia_estudio/lms_creator/planes_formacion/universidad_corporativa/certificados/seguimientos/metricas_empresa/assessments/learning_map/gestion_usuarios/organigrama/gestion_empresa/personalizacion/roles_permisos/comunicaciones/api/app/core_ia/chat_soporte/planes_tareas/contratacion/pyt", "responsible": "..." }],
      "metrics": [{ "title": "...", "value": "...", "change": "...", "status": "alta/media/baja", "category": "objetivos/encuestas/matriz_talento/evaluacion_360/aprendizaje/modo_ia_estudio/lms_creator/planes_formacion/universidad_corporativa/certificados/seguimientos/metricas_empresa/assessments/learning_map/gestion_usuarios/organigrama/gestion_empresa/personalizacion/roles_permisos/comunicaciones/api/app/core_ia/chat_soporte/planes_tareas/contratacion/pyt" }],
      "alerts": [{ "title": "...", "description": "...", "priority": "critica/alta/media", "category": "objetivos/encuestas/matriz_talento/evaluacion_360/aprendizaje/modo_ia_estudio/lms_creator/planes_formacion/universidad_corporativa/certificados/seguimientos/metricas_empresa/assessments/learning_map/gestion_usuarios/organigrama/gestion_empresa/personalizacion/roles_permisos/comunicaciones/api/app/core_ia/chat_soporte/planes_tareas/contratacion/pyt" }],
      "feedback": [{ "title": "...", "content": "...", "type": "producto/laboral/personal", "category": "objetivos/encuestas/matriz_talento/evaluacion_360/aprendizaje/modo_ia_estudio/lms_creator/planes_formacion/universidad_corporativa/certificados/seguimientos/metricas_empresa/assessments/learning_map/gestion_usuarios/organigrama/gestion_empresa/personalizacion/roles_permisos/comunicaciones/api/app/core_ia/chat_soporte/planes_tareas/contratacion/pyt" }]
    }
  `;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[CRON] Gemini API Error:", errorText);
    return null;
  }

  const geminiData = await response.json();
  if (!geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
    console.error("[CRON] Invalid Gemini response:", JSON.stringify(geminiData));
    return null;
  }

  let text = geminiData.candidates[0].content.parts[0].text;
  if (text.includes("```json")) text = text.split("```json")[1].split("```")[0].trim();
  else if (text.includes("```")) text = text.split("```")[1].split("```")[0].trim();

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("[CRON] Failed to parse Gemini JSON:", e);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("x-api-key") || "";

    if (cronSecret && authHeader !== cronSecret) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { date: inputDate, workspaceId: explicitWs } = await request.json().catch(() => ({}));

    const targetDate = inputDate ? new Date(inputDate) : new Date();
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, "0");
    const d = String(targetDate.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    // Find workspaces
    let workspaceIds: string[] = [];
    if (explicitWs) {
      workspaceIds = [explicitWs];
    } else {
      const { data: workspaces } = await supabase.from("workspaces").select("id");
      if (!workspaces || workspaces.length === 0) {
        return NextResponse.json({ error: "No se encontró workspace" }, { status: 404 });
      }
      workspaceIds = workspaces.map((w: any) => w.id);
    }

    const log: string[] = [];
    log.push(`Iniciando análisis automático para ${dateStr} (${workspaceIds.length} workspace(s))`);

    for (const workspaceId of workspaceIds) {
      log.push(`--- Procesando workspace ${workspaceId} ---`);

      // 1. Sync Slack
      const slackCount = await syncSlackSources(supabase, workspaceId, targetDate);
      log.push(`Slack: ${slackCount} fuente(s) nueva(s)`);

      // 2. Get sources
      const dbSources = await getSources(supabase, workspaceId, targetDate);
      const sourcesWithContent = await getSourcesWithContent(dbSources);
      log.push(`Fuentes: ${dbSources.length} en DB, ${sourcesWithContent.length} con contenido`);

      // 3. Get objectives
      const objectives = await getObjectives(supabase, workspaceId);
      log.push(`Objetivos: ${objectives.length}`);

      // 4. Get Jira tasks + Gemini API key
      let jiraContext: any[] = [];
      let geminiApiKey: string | null = null;
      try {
        const { data: ws } = await supabase
          .from("workspaces")
          .select("jira_config, gemini_api_key")
          .eq("id", workspaceId)
          .single();

        if (ws?.gemini_api_key) geminiApiKey = ws.gemini_api_key;

        if (ws?.jira_config?.domain && ws?.jira_config?.email && ws?.jira_config?.api_token) {
          const auth = Buffer.from(`${ws.jira_config.email}:${ws.jira_config.api_token}`).toString("base64");
          const jql = "assignee = currentUser() AND updated >= -30d ORDER BY updated DESC";
          const jiraResp = await fetch(`https://${ws.jira_config.domain}/rest/agile/1.0/issue/search?jql=${encodeURIComponent(jql)}&maxResults=50`, {
            headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
          });

          if (jiraResp.ok) {
            const jiraData = await jiraResp.json();
            jiraContext = (jiraData.issues || []).map((issue: any) => ({
              key: issue.key,
              title: issue.fields?.summary || "",
              subtasks: (issue.fields?.subtasks || []).map((st: any) => ({ id: st.id, title: st.fields?.summary || "" })),
            }));
          }
        }
      } catch (e) {
        log.push(`Jira: error al obtener (${e instanceof Error ? e.message : "desconocido"})`);
      }
      log.push(`Jira: ${jiraContext.length} tareas`);

      // 5. Load analysis config for filtering
      let analysisConfig: any = {};
      try {
        const { data: wsConfig } = await supabase
          .from("workspaces")
          .select("analysis_config")
          .eq("id", workspaceId)
          .single();
        if (wsConfig?.analysis_config) {
          analysisConfig = wsConfig.analysis_config;
        }
      } catch (e) {
        log.push("Config: error al cargar (usando defaults)");
      }

      // 6. Run Gemini analysis
      if (sourcesWithContent.length === 0) {
        log.push("Análisis: saltado (sin fuentes con contenido)");
        continue;
      }

      const tasks = analysisConfig.tasks || {};
      const open = analysisConfig.open || {};

      const resolvedTasks = (tasks.selected_products || []).map((p: string) => p.toLowerCase());
      const resolvedOpen = (open.selected_products || []).map((p: string) => p.toLowerCase());
      const customCategories = open.custom_categories || [];

      const userName = "Usuario";
      const analysisResult = await runGeminiAnalysis({
        date: dateStr,
        sources: sourcesWithContent,
        userName,
        objectives,
        jiraContext,
        apiKey: geminiApiKey || undefined,
        analysisConfig: {
          resolved_tasks: resolvedTasks,
          resolved_open: resolvedOpen,
          custom_categories: customCategories,
          filter_responsibles: analysisConfig.filter_responsibles ?? false,
          selected_responsibles: analysisConfig.selected_responsibles || [],
        },
      });

      if (!analysisResult) {
        log.push("Gemini: falló el análisis");
        continue;
      }

      log.push(`Gemini: ${analysisResult.tasks?.length || 0} tareas, ${analysisResult.insights?.length || 0} insights`);

      const hasResponsibleFilter = analysisConfig.filter_responsibles && analysisConfig.selected_responsibles?.length > 0;

      // Post-filter tasks with tasks config
      const hasTasksFilter = resolvedTasks.length > 0;
      if (analysisResult.tasks && (hasTasksFilter || hasResponsibleFilter)) {
        analysisResult.tasks = analysisResult.tasks.filter((item: any) => {
          const catMatch = !hasTasksFilter || resolvedTasks.includes(item.category?.toLowerCase());
          const respMatch = !hasResponsibleFilter || (analysisConfig.selected_responsibles || []).some((r: string) =>
            (item.responsible || "").toLowerCase().includes(r.toLowerCase())
          );
          return catMatch && respMatch;
        });
      }

      // Post-filter insights/metrics/alerts with open config + custom categories
      const openFilterCategories = [...resolvedOpen, ...customCategories].filter(Boolean);
      const hasOpenFilter = openFilterCategories.length > 0;
      const filterOpenItem = (item: any) => {
        const catMatch = !hasOpenFilter || openFilterCategories.some((c: string) =>
          (item.category || "").toLowerCase().includes(c.toLowerCase())
        );
        const respMatch = !hasResponsibleFilter || (analysisConfig.selected_responsibles || []).some((r: string) =>
          (item.responsible || "").toLowerCase().includes(r.toLowerCase())
        );
        return catMatch && respMatch;
      };
      if (analysisResult.insights && (hasOpenFilter || hasResponsibleFilter)) analysisResult.insights = analysisResult.insights.filter(filterOpenItem);
      if (analysisResult.metrics && (hasOpenFilter || hasResponsibleFilter)) analysisResult.metrics = analysisResult.metrics.filter(filterOpenItem);
      if (analysisResult.alerts && (hasOpenFilter || hasResponsibleFilter)) analysisResult.alerts = analysisResult.alerts.filter(filterOpenItem);

      if (hasTasksFilter || hasOpenFilter || hasResponsibleFilter) {
        log.push(`Filtros: ${analysisResult.tasks?.length || 0} tareas, ${analysisResult.insights?.length || 0} insights restantes`);
      }

      // 7. Save day summary
      await supabase.from("day_summaries").upsert({
        workspace_id: workspaceId,
        summary_date: dateStr,
        summary_text: analysisResult.summary || "",
        focus_text: (analysisResult.summary || "").substring(0, 300),
        source_count: sourcesWithContent.length,
        finding_count: analysisResult.insights?.length || 0,
        proposal_count: analysisResult.tasks?.length || 0,
        alert_count: analysisResult.alerts?.length || 0,
        insight_count: analysisResult.insights?.length || 0,
        feedback_count: analysisResult.feedback?.length || 0,
        kpi_data: {
          summary_text: analysisResult.summary,
          tasks: analysisResult.tasks || [],
          insights: analysisResult.insights || [],
          metrics: analysisResult.metrics || [],
          alerts: analysisResult.alerts || [],
          feedback: analysisResult.feedback || [],
          tasks_count: analysisResult.tasks?.length || 0,
          insights_count: analysisResult.insights?.length || 0,
          alerts_count: analysisResult.alerts?.length || 0,
          feedback_count: analysisResult.feedback?.length || 0,
          metrics_count: analysisResult.metrics?.length || 0,
          source_count: sourcesWithContent.length,
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: "workspace_id,summary_date" });

      log.push("Resumen guardado exitosamente");
    }

    return NextResponse.json({ success: true, log });
  } catch (err) {
    console.error("[CRON] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
