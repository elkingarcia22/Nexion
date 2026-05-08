import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const KNOWN_PRIVATE_CHANNELS = [
  { id: "C084AP7K4Q2", name: "triada-growth" },
];

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

  const channelsResp = await fetch("https://slack.com/api/users.conversations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${slackToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ types: "public_channel,private_channel", limit: 200, exclude_archived: true }),
  });
  const channelsData = await channelsResp.json();
  if (!channelsData.ok) return 0;

  const channels = [...(channelsData.channels || []), ...KNOWN_PRIVATE_CHANNELS];
  let added = 0;

  for (const channel of channels) {
    const msgResp = await fetch("https://slack.com/api/conversations.history", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${slackToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ channel: channel.id, oldest, latest, limit: 50 }),
    });
    const msgData = await msgResp.json();
    if (!msgData.ok) continue;

    const messages = msgData.messages || [];
    if (messages.length === 0) continue;

    const preview = messages.slice(0, 5).map((m: any) => m.text).join("\n---\n");
    const metadata = {
      channelId: channel.id,
      channelName: channel.name,
      messageCount: messages.length,
      messages: messages.map((m: any) => ({ user: m.user, text: m.text, ts: m.ts })),
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
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return null;

  const nextDayDate = new Date(data.date);
  nextDayDate.setDate(nextDayDate.getDate() + 1);
  const nextDay = nextDayDate.toISOString().split('T')[0];

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

    ESTRUCTURA DE RESPUESTA (JSON — todos los textos en español):
    {
      "summary": "Resumen ejecutivo del día",
      "tasks": [{ "title": "...", "priority": "alta/media/baja", "category": "Talent/Hiring/UX/Other", "responsible": "Nombre", "goal_id": "ID o null", "linked_jira_key": "Key o null", "due_date": "YYYY-MM-DD o null" }],
      "insights": [{ "title": "...", "description": "...", "category": "Talent/Hiring/UX/Other", "responsible": "..." }],
      "metrics": [{ "title": "...", "value": "...", "change": "...", "status": "alta/media/baja", "category": "Talent/Hiring/UX/Other" }],
      "alerts": [{ "title": "...", "description": "...", "priority": "critica/alta/media", "category": "Talent/Hiring/UX/Other" }],
      "feedback": [{ "title": "...", "content": "...", "type": "producto/laboral/personal", "category": "Talent/Hiring/UX/Other" }]
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

    // Find workspace
    let workspaceId = explicitWs;
    if (!workspaceId) {
      const { data: workspaces } = await supabase.from("workspaces").select("id").limit(1);
      if (!workspaces || workspaces.length === 0) {
        return NextResponse.json({ error: "No se encontró workspace" }, { status: 404 });
      }
      workspaceId = workspaces[0].id;
    }

    const log: string[] = [];
    log.push(`Iniciando análisis automático para ${dateStr} (workspace: ${workspaceId})`);

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

    // 4. Get Jira tasks
    let jiraContext: any[] = [];
    try {
      const { data: workspaces } = await supabase
        .from("workspaces")
        .select("jira_config")
        .eq("id", workspaceId)
        .single();

      if (workspaces?.jira_config?.domain && workspaces?.jira_config?.email && workspaces?.jira_config?.api_token) {
        const auth = Buffer.from(`${workspaces.jira_config.email}:${workspaces.jira_config.api_token}`).toString("base64");
        const jql = "assignee = currentUser() AND updated >= -30d ORDER BY updated DESC";
        const jiraResp = await fetch(`https://${workspaces.jira_config.domain}/rest/agile/1.0/issue/search?jql=${encodeURIComponent(jql)}&maxResults=50`, {
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

    // 5. Run Gemini analysis
    if (sourcesWithContent.length === 0) {
      log.push("Análisis: saltado (sin fuentes con contenido)");
      return NextResponse.json({ success: true, log, note: "Sin fuentes para analizar" });
    }

    const userName = "Usuario";
    const analysisResult = await runGeminiAnalysis({
      date: dateStr,
      sources: sourcesWithContent,
      userName,
      objectives,
      jiraContext,
    });

    if (!analysisResult) {
      log.push("Gemini: falló el análisis");
      return NextResponse.json({ success: false, log, error: "Falló el análisis de Gemini" }, { status: 500 });
    }

    log.push(`Gemini: ${analysisResult.tasks?.length || 0} tareas, ${analysisResult.insights?.length || 0} insights`);

    // 6. Save day summary
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

    return NextResponse.json({ success: true, log, summary: analysisResult.summary });
  } catch (err) {
    console.error("[CRON] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
