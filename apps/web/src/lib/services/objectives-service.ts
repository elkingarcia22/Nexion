import { supabase } from "@/lib/supabase";
import { refreshGoogleToken } from "./google-auth-service";

const OBJECTIVES_SHEET_ID = "1_2xmTZTSNKdjYO1oJ1H79UCQ6rlOQvwxXfOUdV6tbUI";

export interface Objective {
  team: string;
  quarter: string;
  title: string;
  narrative: string;
  type: string;
  keyResult: string;
  weight: number;
  progress: number;
  score: number;
  comments: string;
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

async function fetchSheetValues(range: string) {
  const token = await getGoogleToken();
  if (!token) throw new Error("No Google token found");

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;

  const res = await fetch(`/api/google/sheets/values?spreadsheetId=${OBJECTIVES_SHEET_ID}&range=${encodeURIComponent(range)}`, {
    headers: {
      Authorization: `Bearer ${session?.access_token}`,
      "x-google-token": token,
    },
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      const newToken = await refreshGoogleToken();
      if (newToken) {
        const retryRes = await fetch(`/api/google/sheets/values?spreadsheetId=${OBJECTIVES_SHEET_ID}&range=${encodeURIComponent(range)}`, {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
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
    console.log("Starting sync for Objectives...");
    
    // 1. Fetch Q1 and Q2
    const q1Data = await fetchSheetValues("Q1!A2:J100");
    const q2Data = await fetchSheetValues("Q2!A2:J100");
    
    const allRows = [
      ...(q1Data.values || []),
      ...(q2Data.values || [])
    ];

    const objectives = allRows.map((row: any, index: number) => ({
      workspace_id: workspaceId,
      team: row[0] || "",
      quarter: row[1] || "",
      objective_title: row[2] || "",
      narrative: row[3] || "",
      type: row[4] || "",
      key_result: row[5] || "",
      weight: parseFloat(row[6]) || 0,
      progress: parseFloat(row[7]?.replace('%', '')) || 0,
      score: parseFloat(row[8]) || 0,
      initiatives_comments: row[9] || "",
      external_row_index: index,
      last_synced_at: new Date().toISOString(),
    })).filter(obj => obj.objective_title); // Only sync rows with a title

    if (objectives.length > 0) {
      // Upsert into Supabase
      const { error } = await supabase
        .from("workspace_objectives")
        .upsert(objectives, { onConflict: 'workspace_id,quarter,objective_title,key_result' });
      
      if (error) throw error;
    }

    // 2. Fetch Initiatives (Tablero Producto)
    console.log("Starting sync for Initiatives...");
    const initiativesData = await fetchSheetValues("'Tablero Producto'!A2:H200");
    
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
      const { error } = await supabase
        .from("workspace_initiatives")
        .upsert(initiatives, { onConflict: 'workspace_id,title,quarter' });
      
      if (error) throw error;
    }

    return { success: true, objectivesCount: objectives.length, initiativesCount: initiatives.length };
  } catch (err) {
    console.error("Error syncing objectives:", err);
    return { success: false, error: err };
  }
}

export async function getObjectives(workspaceId: string, quarter?: string) {
  let query = supabase
    .from("workspace_objectives")
    .select("*")
    .eq("workspace_id", workspaceId);
  
  if (quarter) {
    query = query.eq("quarter", quarter);
  }

  const { data, error } = await query.order('team', { ascending: true });
  return { success: !error, data, error };
}

export async function getInitiatives(workspaceId: string, quarter?: string) {
  let query = supabase
    .from("workspace_initiatives")
    .select("*")
    .eq("workspace_id", workspaceId);
  
  if (quarter) {
    query = query.eq("quarter", quarter);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  return { success: !error, data, error };
}
