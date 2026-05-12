import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { date, meetings, sources, userName, objectives, jiraContext, platformMetrics, workspaceId } = await request.json();

    // Try per-workspace key first, fall back to global env var
    let apiKey = process.env.GOOGLE_AI_API_KEY;
    if (workspaceId) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const { data: ws } = await supabase.from("workspaces").select("gemini_api_key").eq("id", workspaceId).single();
          if (ws?.gemini_api_key) apiKey = ws.gemini_api_key;
        }
      } catch (e) {
        console.error("Error fetching workspace Gemini key, using fallback:", e);
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "Clave de Gemini no configurada. Cada usuario debe configurar su propia clave en Configuración > Gemini AI, u obtenla gratis en aistudio.google.com" },
        { status: 500 }
      );
    }

    // Calculate next day for prompt context
    const currentAnalysisDate = new Date(date);
    const nextDayDate = new Date(currentAnalysisDate);
    nextDayDate.setDate(currentAnalysisDate.getDate() + 1);
    const nextDay = nextDayDate.toISOString().split('T')[0];

    const prompt = `
      🔴 REGLA ABSOLUTA: TODO el contenido de la respuesta debe estar 100% EN ESPAÑOL. NUNCA uses inglés. NUNCA. Títulos, descripciones, resúmenes, valores de campos — TODO en español. Si una fuente está en inglés, tradúcela al español en tu análisis.

      Eres un Asistente de Inteligencia Operativa llamado Nexión. 
      Tu misión es realizar un análisis jerárquico y profundo de la actividad del usuario para el día ${date}.

      DATOS DEL USUARIO:
      - NOMBRE: ${userName || "Usuario"}
      
      CONTEXTO ESTRATÉGICO (Objetivos y KRs):
      ${JSON.stringify(objectives, null, 2)}

      CONTEXTO OPERATIVO (Jira User Stories y Subtasks):
      ${JSON.stringify(jiraContext, null, 2)}

      MÉTRICAS DE LA PLATAFORMA (existentes en el sistema):
      ${JSON.stringify(platformMetrics || [], null, 2)}

      INSTRUCCIÓN ESPECIAL — VINCULACIÓN A MÉTRICAS:
      - Si en las fuentes se menciona alguna métrica que coincida con las de la lista "MÉTRICAS DE LA PLATAFORMA", vincula los elementos (tasks, alerts, insights) a la métrica correspondiente usando el campo "linked_metric_names": ["Nombre Exacto de la Métrica"].
      - Ejemplo: Si una fuente habla de "bajó el ARR de objetivos", vincula la alerta/task/insight a la métrica "ARR Objetivos".
      - Si no hay métrica vinculada, deja linked_metric_names como array vacío [].

      FUENTES A ANALIZAR (Contenido completo):
      ${sources.map((s: any) => `
      --- INICIO FUENTE ---
      ID: ${s.id}
      NOMBRE: ${s.name}
      CONTENIDO: ${s.content || "Sin contenido"}
      --- FIN FUENTE ---
      `).join('\n')}

      LÓGICA DE ANÁLISIS (PASO A PASO POR CADA FUENTE):
      1. CONTEXTO: ¿De qué trata este documento o reunión?
      2. VINCULACIÓN: 
         - ¿A qué OBJETIVO (goal_id) de la lista estratégica le aporta?
         - ¿A qué HISTORIA DE USUARIO (linked_jira_key) de Jira está asociado?
         - ¿A qué SUBTAREA (linked_jira_subtask_id) específica de esa HU se refiere?
      3. EXTRACCIÓN DE ELEMENTOS:
          - RESPONSABLE: ¿Para quién es esta tarea? Si es para ti (${userName}), usa "${userName}". Si es para otra persona (ej: "Juan va a hacer esto", "María necesita entregar"), extrae el nombre.
          - TAREAS: Extrae todas las acciones (especialmente las de ${userName}).
          - FECHAS Y VENCIMIENTO (due_date): 
             * REGLA 1: Si en la fuente se menciona explícitamente "mañana" o compromisos para el día siguiente (ej: "mañana entrego esto", "mañana lo ajusto"), el vencimiento (due_date) DEBE ser el día actual: ${date}.
             * REGLA 2: Si NO hay ninguna detección de fecha específica o mención de "mañana", el vencimiento por defecto DEBE ser el día siguiente: ${nextDay}.
          - OTROS: Extrae métricas, insights, alertas y feedback.

      REGLAS CRÍTICAS:
      - CRÍTICO: TODO CAMPO "category" DEBE tener un valor (Talent/Hiring/UX/Other). NUNCA null o vacío.
      - CRÍTICO: TODO CAMPO "responsible" DEBE tener un nombre. Si no está claro, usa "${userName}". NUNCA null o vacío.
      - Si detectas una tarea para ${userName}, asígnale prioridad ALTA.
      - Si una tarea es para otra persona, incluye su nombre en el título Y en el campo "responsible".
      - Vincula SIEMPRE que sea posible a los IDs de Objetivos y Jira proporcionados.
      - 🔴 RECUERDA: TODOS los textos (title, description, summary, content) deben estar en ESPAÑOL.

      ESTRUCTURA DE RESPUESTA (Responde ÚNICAMENTE en JSON — TODOS los textos en español):
      {
        "summary": "Resumen ejecutivo del día en español.",
        "tasks": [{ 
          "title": "Descripción de la tarea en español", 
          "priority": "alta/media/baja", 
          "category": "Talent/Hiring/UX/Other",
          "responsible": "Nombre de la persona responsable (${userName} si es para ti)",
          "goal_id": "ID del objetivo vinculado o null",
          "linked_jira_key": "Key de Jira vinculada o null",
          "linked_jira_subtask_id": "ID de la subtarea vinculada o null",
          "linked_metric_names": ["Nombre exacto de métrica vinculada o null"],
          "due_date": "YYYY-MM-DD o null"
        }],
        "insights": [{
          "title": "Título del insight en español",
          "description": "Descripción del insight en español",
          "category": "Talent/Hiring/UX/Other",
          "responsible": "Nombre del responsable o null",
          "goal_id": "...",
          "linked_jira_key": "...",
          "linked_metric_names": ["Nombre exacto de métrica vinculada o null"]
        }],
        "metrics": [{
          "title": "Nombre de la métrica en español",
          "value": "...",
          "change": "...",
          "status": "alta/media/baja",
          "category": "Talent/Hiring/UX/Other",
          "responsible": "Nombre del responsable o null",
          "goal_id": "...",
          "linked_metric_names": ["Nombre exacto de métrica vinculada o null"]
        }],
        "alerts": [{
          "title": "Título de la alerta en español",
          "description": "Descripción de la alerta en español",
          "priority": "critica/alta/media",
          "category": "Talent/Hiring/UX/Other",
          "responsible": "Nombre del responsable o null",
          "goal_id": "...",
          "linked_jira_key": "...",
          "linked_metric_names": ["Nombre exacto de métrica vinculada o null"]
        }],
        "feedback": [{
          "title": "Título del feedback en español",
          "content": "Contenido del feedback en español",
          "type": "producto/laboral/personal",
          "category": "Talent/Hiring/UX/Other",
          "responsible": "Nombre del responsable o null",
          "goal_id": "..."
        }]
      }
    `;

    // Call Gemini (Using stable 1.5 flash model)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API Error:", errorText);
      
      if (response.status === 429) {
        return NextResponse.json(
          { error: "Se ha excedido el límite de la API de Gemini. Por favor, espera un momento y reintenta." },
          { status: 429 }
        );
      }
      
      return NextResponse.json({ error: "Error al llamar a Gemini API" }, { status: response.status });
    }

    const data = await response.json();
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error("Unexpected Gemini response structure:", data);
      return NextResponse.json({ error: "Respuesta de IA inválida" }, { status: 500 });
    }

    let aiResponseText = data.candidates[0].content.parts[0].text;
    console.log("✅ Raw AI Response from Gemini:");
    console.log(aiResponseText);

    // Clean markdown if present
    if (aiResponseText.includes("```json")) {
      aiResponseText = aiResponseText.split("```json")[1].split("```")[0].trim();
    } else if (aiResponseText.includes("```")) {
      aiResponseText = aiResponseText.split("```")[1].split("```")[0].trim();
    }

    const result = JSON.parse(aiResponseText);

    // DEBUG: Log the parsed result and check for team/responsible fields
    console.log("\n🔍 === PARSED RESULT STRUCTURE ===");
    console.log("Tasks count:", result.tasks?.length || 0);
    if (result.tasks && result.tasks.length > 0) {
      console.log("\n📋 Sample task structure:");
      const sampleTask = result.tasks[0];
      console.log("Fields in task:", Object.keys(sampleTask));
      console.log("Sample task:", JSON.stringify(sampleTask, null, 2));

      console.log("\n🎯 Key fields check:");
      console.log("  - category:", sampleTask.category);
      console.log("  - responsible:", sampleTask.responsible);
      console.log("  - title:", sampleTask.title);
      console.log("  - priority:", sampleTask.priority);
    }
    console.log("===================================\n");

    // SAFETY: Ensure category and responsible are always filled
    if (result.tasks && Array.isArray(result.tasks)) {
      result.tasks = result.tasks.map((task: any) => ({
        ...task,
        category: task.category || "Other",
        responsible: task.responsible || userName || "Usuario",
      }));

      console.log("✅ AFTER SAFETY CHECK - Sample task:");
      console.log(JSON.stringify(result.tasks[0], null, 2));
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in analyze route:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
