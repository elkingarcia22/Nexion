import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const PDF_METRICS = [
  // Talent - Objetivos
  { name: "ARR Objetivos", category: "talent", subcategory: "objetivos", current_value: 117100, unit: "USD", source: "pdf_seed", sort_order: 1 },
  { name: "ARR Usabilidad Objetivos", category: "talent", subcategory: "objetivos", current_value: 67000, unit: "USD", source: "pdf_seed", sort_order: 2 },
  { name: "ARR NSM Objetivos", category: "talent", subcategory: "objetivos", current_value: 39700, unit: "USD", source: "pdf_seed", sort_order: 3 },
  // Talent - Encuestas
  { name: "ARR Encuestas", category: "talent", subcategory: "encuestas", current_value: 74300, unit: "USD", source: "pdf_seed", sort_order: 4 },
  { name: "ARR NSM Encuestas", category: "talent", subcategory: "encuestas", current_value: 29300, unit: "USD", source: "pdf_seed", sort_order: 5 },
  // Talent - Matriz de Talento
  { name: "ARR Matriz de Talento", category: "talent", subcategory: "matriz_talento", current_value: 43100, unit: "USD", source: "pdf_seed", sort_order: 6 },
  { name: "ARR NSM Matriz de Talento", category: "talent", subcategory: "matriz_talento", current_value: 3300, unit: "USD", source: "pdf_seed", sort_order: 7 },
  // Talent - 360
  { name: "ARR 360", category: "talent", subcategory: "360", current_value: 127600, unit: "USD", source: "pdf_seed", sort_order: 8 },
  { name: "ARR NSM 360", category: "talent", subcategory: "360", current_value: 48300, unit: "USD", source: "pdf_seed", sort_order: 9 },
  // Hiring - Reclutamiento
  { name: "ARR Reclutamiento (PYT)", category: "hiring", subcategory: "reclutamiento", current_value: 8200, unit: "USD", source: "pdf_seed", sort_order: 10 },
  { name: "ARR NSM Reclutamiento", category: "hiring", subcategory: "reclutamiento", current_value: 1300, unit: "USD", source: "pdf_seed", sort_order: 11 },
  // Talent - empresas NSM
  { name: "Empresas NSM Objetivos", category: "talent", subcategory: "objetivos", current_value: 39, unit: "number", source: "pdf_seed", sort_order: 12 },
  { name: "Empresas NSM Encuestas", category: "talent", subcategory: "encuestas", current_value: 967, unit: "number", source: "pdf_seed", sort_order: 13 },
  { name: "Empresas NSM 360", category: "talent", subcategory: "360", current_value: 96, unit: "number", source: "pdf_seed", sort_order: 14 },
  { name: "Empresas NSM Matriz", category: "talent", subcategory: "matriz_talento", current_value: 8, unit: "number", source: "pdf_seed", sort_order: 15 },
  // General
  { name: "ARR Total Empresas", category: "general", subcategory: null, current_value: 10200000, unit: "USD", source: "pdf_seed", sort_order: 0 },
];

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { workspaceId } = await request.json();
    
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId requerido" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];
    const records = PDF_METRICS.map(m => ({
      ...m,
      workspace_id: workspaceId,
      source_date: today,
      description: m.subcategory
        ? `Métrica de ${m.category} - ${m.subcategory.replace(/_/g, " ")}`
        : `Métrica general`,
    }));

    const { data, error } = await supabase
      .from("metrics")
      .upsert(records, { onConflict: "workspace_id,name", ignoreDuplicates: true })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: data?.length || 0, data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
