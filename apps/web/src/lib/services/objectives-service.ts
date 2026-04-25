import { supabase } from "@/lib/supabase";
import { refreshGoogleToken } from "./google-auth-service";

const OBJECTIVES_SHEET_ID = "1_2xmTZTSNKdjYO1oJ1H79UCQ6rlOQvwxXfOUdV6tbUI";

export interface Objective {
  team: string;
  owner: string;
  quarter: string;
  objective_title: string;
  narrative: string;
  type: string;
  key_result: string;
  weight: number;
  progress: number;
  score: number;
  initiatives_comments: string;
}

export interface Initiative {
  title: string;
  okrReference: string;
  owner: string;
  status: string;
  quarter: string;
  impact: string;
  effort: string;
  priority: string;
}

async function getGoogleToken() {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;
  if (!session) return null;

  return (session as any).provider_token ||
    (typeof window !== "undefined"
      ? (localStorage.getItem("google_provider_token") || sessionStorage.getItem("google_provider_token"))
      : null);
}

async function fetchSheetValues(spreadsheetId: string, range: string) {
  const token = await getGoogleToken();
  if (!token) throw new Error("No Google token found");

  const res = await fetch(`/api/google/sheets?spreadsheetId=${spreadsheetId}&range=${encodeURIComponent(range)}`, {
    headers: {
      "x-google-token": token,
    },
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      const newToken = await refreshGoogleToken();
      if (newToken) {
        const retryRes = await fetch(`/api/google/sheets?spreadsheetId=${spreadsheetId}&range=${encodeURIComponent(range)}`, {
          headers: {
            "x-google-token": newToken,
          },
        });
        if (retryRes.ok) return await retryRes.json();
      }
    }
    throw new Error(`Error fetching sheet: ${res.status}`);
  }

  return await res.json();
}

export async function syncObjectives(workspaceId: string) {
  try {
    console.log("Starting full strategic sync...");

    // Check for Demo Mode - Bypass Google Sync
    const isDemoMode = typeof window !== 'undefined' && localStorage.getItem('NEXION_DEMO_MODE') === 'true';
    if (isDemoMode) {
      console.log("[ObjectivesSync] Demo Mode active. Bypassing Google Sheets sync.");
      return { success: true, count: 0, mode: 'demo' };
    }

    const token = await getGoogleToken();
    if (!token) {
      console.warn("[ObjectivesSync] No Google token found. Skipping sync.");
      return { success: false, error: "No token" };
    }

    const metaResponse = await fetch(`/api/google/sheets?spreadsheetId=${OBJECTIVES_SHEET_ID}`, {
      headers: { "x-google-token": token }
    });
    
    if (!metaResponse.ok) throw new Error(`Meta fetch failed: ${metaResponse.status}`);
    
    const meta = await metaResponse.json();
    console.log(`[ObjectivesSync] Sheets found: ${meta.sheets?.map((s: any) => s.properties.title).join(", ")}`);
    
    // Sync Q1, Q2, Q3, Q4 sheets
    const sheets = (meta.sheets || []) as any[];
    let qSheets = sheets.filter((s: any) => 
      s.properties.title.toUpperCase().match(/^Q[1-4]/)
    );

    if (qSheets.length === 0) {
      qSheets = [
        { properties: { title: "Q1" } },
        { properties: { title: "Q2" } }
      ];
    }

    console.log(`[ObjectivesSync] Selected for sync: ${qSheets.map((s: any) => s.properties.title).join(", ")}`);

    const processRows = (rows: any[], sheetName: string) => {
      let lastTeam = "";
      let lastOwner = "";
      let lastObjective = "";
      let lastNarrative = "";
      let lastType = "";

      return rows.map((row, index) => {
        // --- ANCHOR LOGIC ---
        let tIdx = row.findIndex((c: any) => 
          typeof c === 'string' && (
            /^(OUTPUT|OUTCOME|ESTRATÉGICO|OPERATIVO)$/i.test(c.trim()) || 
            (c.trim().length < 15 && (c.includes("Output") || c.includes("Outcome")))
          )
        );
        const anchor = tIdx !== -1 ? tIdx : 5;
        if (anchor === -1) return null;

        const clean = (val: string) => (val || "").toString().replace(/Squad:|Equipo:|Colaborador:|Responsable:|Objetivo:|Narrativa:/gi, "").trim();

        const rawTeam = (anchor >= 4 && row[anchor - 4]) ? row[anchor - 4].toString().trim() : "";
        const rawOwner = (anchor >= 3 && row[anchor - 3]) ? row[anchor - 3].toString().trim() : "";
        const rawObjective = (anchor >= 2 && row[anchor - 2]) ? row[anchor - 2].toString().trim() : "";
        const rawNarrative = (anchor >= 1 && row[anchor - 1]) ? row[anchor - 1].toString().trim() : "";
        const rawType = row[anchor] ? row[anchor].toString().trim() : "";

        const cleanTeam = clean(rawTeam);
        const cleanOwner = clean(rawOwner);
        const cleanObjective = clean(rawObjective);
        const cleanNarrative = clean(rawNarrative);
        const cleanType = clean(rawType);

        // 1. CAPTURE CONTEXT
        const teamHeaderCell = row.slice(0, 5).find((c: any) => 
          typeof c === 'string' && /^(squad|equipo)([:\s]|$)/i.test(c.trim())
        );
        
        if (teamHeaderCell) {
          const extracted = clean(teamHeaderCell.toString().replace(/^(squad|equipo)[:\s]*/i, ""));
          if (extracted && extracted.length > 2 && extracted.length < 30) {
            lastTeam = extracted;
            lastObjective = ""; 
            lastNarrative = "";
            lastOwner = "";
          }
          return null;
        }

        // Context heuristics
        const isSentence = cleanTeam.includes(".") || cleanTeam.includes(",") || cleanTeam.split(" ").length > 5;
        const isProbablyKR = cleanTeam.length > 40 || cleanTeam.toLowerCase().includes("key result") || cleanTeam.toLowerCase().includes("resultado clave");
        
        if (!isProbablyKR && !isSentence && cleanTeam && cleanTeam.length > 2 && cleanTeam.length < 35) {
          const noise = [
            "objetivo", "narrativa", "colaborador", "responsable", "tipo", "output", "outcome", 
            "porque", "debido", "este", "esta", "key result", "kr", "resultado clave",
            "q1", "q2", "q3", "q4", "2024", "2025", "indicador", "métrica", "meta", 
            "avance", "estado", "fecha", "comentario", "link", "enlace", "evidencia"
          ];
          if (!noise.some(n => cleanTeam.toLowerCase().includes(n))) {
            if (lastTeam !== cleanTeam) {
              lastTeam = cleanTeam;
            }
          }
        }

        if (cleanOwner && cleanOwner.length > 2 && cleanOwner.length < 50 && 
            !cleanOwner.toLowerCase().includes("colaborador") && !cleanOwner.toLowerCase().includes("responsable")) {
          lastOwner = cleanOwner;
        }
        if (cleanObjective && cleanObjective.length > 5 && !cleanObjective.toLowerCase().includes("objetivo")) {
          lastObjective = cleanObjective;
        }
        if (cleanNarrative && cleanNarrative.length > 5 && !cleanNarrative.toLowerCase().includes("narrativa")) {
          lastNarrative = cleanNarrative;
        }
        if (cleanType && (cleanType.toLowerCase().includes("output") || cleanType.toLowerCase().includes("outcome") || cleanType.toLowerCase().includes("estrat") || cleanType.toLowerCase().includes("opera"))) {
          lastType = cleanType;
        }

        // 2. KR DETECTION
        const rawKrText = (row[anchor + 1] || "").toString().trim();
        const rowString = row.join(" ").toLowerCase();
        const isHeader = (rowString.includes("squad") && rowString.includes("objetivo")) || 
                         (rowString.includes("colaborador") && rowString.includes("tipo")) ||
                         cleanObjective.toLowerCase() === "objetivo" ||
                         cleanTeam.toLowerCase() === "squad" ||
                         rawKrText.toLowerCase() === "key result";

        const hasKrContentReal = rawKrText.length > 5 && !rawKrText.toLowerCase().includes("key result");
        if (isHeader || !hasKrContentReal) return null;        // --- SUBTASK DETECTION (Enhanced) ---
        let krTitle = "";
        let tasks: string[] = [];
        
        // Normalize text and split by line breaks
        const cleanRawText = rawKrText.replace(/^[\n\r]+|[\n\r]+$/g, "");
        const lines = cleanRawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        
        if (lines.length > 0) {
          // Identify if the first line is a title
          // A title usually doesn't start with a bullet marker and isn't a checkbox
          const taskMarkerRegex = /^([-—–*•·∙○■□]|([0-9]|[a-z])+[.)]|[\[\(\{].*?[\]\)\}])[ ]*/i;
          const firstLineHasMarker = taskMarkerRegex.test(lines[0]);
          
          if (!firstLineHasMarker && lines.length > 1) {
            // First line is title, others are tasks
            krTitle = lines[0];
            tasks = lines.slice(1).map(l => l.replace(taskMarkerRegex, "").trim());
          } else if (!firstLineHasMarker && lines.length === 1) {
            // Single line, check for inline separators
            const inlineSeparators = /([ ]+[-—–*•·∙○■□][ ]+)|([;][ ]+)|([ ]{3,})|([.][ ]+(?=[A-Z]))/;
            const parts = lines[0].split(inlineSeparators).filter(p => p && p.trim().length > 2 && !taskMarkerRegex.test(p));
            
            if (parts.length > 1) {
              krTitle = parts[0];
              tasks = parts.slice(1).map(p => p.trim());
            } else {
              // Try split by colon if it's "Title: Task 1, Task 2"
              const colonParts = lines[0].split(/[:：][ ]*/);
              if (colonParts.length > 1 && colonParts[0].length < 60) {
                krTitle = colonParts[0];
                tasks = colonParts.slice(1).join(": ").split(/[,;][ ]+/).map(t => t.trim());
              } else {
                krTitle = lines[0];
                tasks = [];
              }
            }
          } else {
            // First line has a marker or it's a list without a clear title
            krTitle = lines[0].replace(taskMarkerRegex, "").trim();
            tasks = lines.slice(1).map(l => l.replace(taskMarkerRegex, "").trim());
            
            // If the title we extracted is too generic, use a default
            if (/^(resultado clave|kr|key result|meta|entregable)$/i.test(krTitle)) {
              krTitle = tasks.length > 0 ? tasks[0] : lines[0];
              if (tasks.length > 0) tasks = tasks.slice(1);
            }
          }
        }

        // Final cleanup
        krTitle = (krTitle || "Resultado Clave").replace(/^(key result|kr|entregable|resultado clave|meta|indicador)[:\s]*/i, "").trim();
        tasks = tasks.filter(t => t.length > 2 && !t.toLowerCase().includes("escribe aquí") && t.toLowerCase() !== krTitle.toLowerCase());

        const isCompleted = sheetName.toUpperCase().includes("Q1");
        const subTasks = tasks.map(t => ({
          title: t,
          status: isCompleted ? "completed" : "todo",
          progress: isCompleted ? 100 : 0
        }));

        return {
          workspace_id: workspaceId,
          team: lastTeam || "General",
          owner: lastOwner || "NEXIÓN TEAM",
          quarter: sheetName,
          objective_title: lastObjective || "Objetivo Estratégico",
          narrative: lastNarrative,
          type: lastType || "ESTRATÉGICO",
          key_result: krTitle,
          sub_tasks: subTasks,
          weight: parseFloat(row[anchor + 2]?.toString().replace('%', '')) || 0,
          progress: parseFloat(row[anchor + 3]?.toString().replace('%', '')) || 0,
          score: parseFloat(row[anchor + 4]) || 0,
          initiatives_comments: row[anchor + 5] || "",
          external_row_index: index,
          last_synced_at: new Date().toISOString(),
        };
      }).filter(obj => obj && obj.objective_title && obj.key_result);
    };

    const allObjectives = [];
    for (const sheet of qSheets) {
      const title = sheet.properties.title;
      const data = await fetchSheetValues(OBJECTIVES_SHEET_ID, `${title}!A2:L500`);
      if (data.values) {
        console.log(`[ObjectivesSync] Processing ${data.values.length} rows from ${title}...`);
        const processed = processRows(data.values, title);
        console.log(`[ObjectivesSync] Successfully processed ${processed.length} objectives from ${title}`);
        allObjectives.push(...processed);
      }
    }
    
    const uniqueTeams = [...new Set(allObjectives.map(o => o.team))];
    console.log(`[ObjectivesSync] Total unique teams found: ${uniqueTeams.join(", ")}`);

    if (allObjectives.length > 0) {
      const uniqueObjectives = Array.from(new Map(
        allObjectives.map(o => [`${o.workspace_id}-${o.quarter}-${o.objective_title}-${o.key_result}-${o.owner}`, o])
      ).values());

      // Clean up previous data for these quarters to avoid mixing (e.g. Q1 with Q2)
      const distinctQuarters = [...new Set(uniqueObjectives.map(o => o.quarter))];
      await supabase
        .from("workspace_objectives")
        .delete()
        .eq("workspace_id", workspaceId)
        .in("quarter", distinctQuarters);

      const { error } = await supabase
        .from("workspace_objectives")
        .upsert(uniqueObjectives, { onConflict: 'workspace_id,quarter,objective_title,key_result,owner' });
      
      if (error) throw error;
    }

    // Sync Initiatives
    const initiativesData = await fetchSheetValues(OBJECTIVES_SHEET_ID, "'Tablero Producto'!A2:H200");
    const initiatives = (initiativesData.values || []).map((row: any) => ({
      workspace_id: workspaceId,
      title: row[0] || "",
      okr_reference: row[1] || "",
      owner: row[2] || "",
      status: row[3] || "",
      quarter: row[4] || "",
      impact: row[5] || "",
      effort: row[6] || "",
      priority: row[7] || "",
      last_synced_at: new Date().toISOString(),
    })).filter(ini => ini.title);

    if (initiatives.length > 0) {
      const uniqueInitiatives = Array.from(new Map(
        initiatives.map(i => [`${i.workspace_id}-${i.title}-${i.quarter}`, i])
      ).values());

      await supabase
        .from("workspace_initiatives")
        .upsert(uniqueInitiatives, { onConflict: 'workspace_id,title,quarter' });
    }

    return { success: true, count: allObjectives.length };
  } catch (err) {
    console.error("Strategic sync failed:", err);
    return { success: false, error: err };
  }
}

export async function createObjective(objective: any) {
  const { data, error } = await supabase
    .from("workspace_objectives")
    .insert([objective])
    .select();
  
  return { success: !error, data, error };
}

export async function getObjectives(workspaceId: string, quarter?: string) {
  let query = supabase
    .from("workspace_objectives")
    .select("*")
    .eq("workspace_id", workspaceId);
  
  if (quarter) query = query.eq("quarter", quarter);

  const { data, error } = await query.order('team', { ascending: true });
  return { success: !error, data, error };
}

export async function getInitiatives(workspaceId: string, quarter?: string) {
  let query = supabase
    .from("workspace_initiatives")
    .select("*")
    .eq("workspace_id", workspaceId);
  
  if (quarter) query = query.eq("quarter", quarter);

  const { data, error } = await query.order('created_at', { ascending: false });
  return { success: !error, data, error };
}
