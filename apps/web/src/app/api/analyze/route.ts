import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { date, meetings, sources, userName, objectives, jiraContext } = await request.json();
    const apiKey = process.env.GOOGLE_AI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GOOGLE_AI_API_KEY no configurada. Obtenla gratis en aistudio.google.com" },
        { status: 500 }
      );
    }

    // Calculate next day for prompt context
    const currentAnalysisDate = new Date(date);
    const nextDayDate = new Date(currentAnalysisDate);
    nextDayDate.setDate(currentAnalysisDate.getDate() + 1);
    const nextDay = nextDayDate.toISOString().split('T')[0];

    const prompt = `
      Eres un Asistente de Inteligencia Operativa llamado Nexión. 
      Tu misión es realizar un análisis jerárquico y profundo de la actividad del usuario para el día ${date}.

      DATOS DEL USUARIO:
      - NOMBRE: ${userName || "Usuario"}
      
      CONTEXTO ESTRATÉGICO (Objetivos y KRs):
      ${JSON.stringify(objectives, null, 2)}

      CONTEXTO OPERATIVO (Jira User Stories y Subtasks):
      ${JSON.stringify(jiraContext, null, 2)}

      FUENTES A ANALIZAR (Contenido completo):
      ${sources.map((s: any) => `
      --- INICIO FUENTE ---
      ID: ${s.id}
      NOMBRE: ${s.name}
      CONTENIDO: ${s.content || "Sin contenido"}
      --- FIN FUENTE ---
      `).join('\n')}

      LOGICA DE ANÁLISIS (PASO A PASO POR CADA FUENTE):
      1. CONTEXTO: ¿De qué trata este documento/reunión?
      2. VINCULACIÓN: 
         - ¿A qué OBJETIVO (goal_id) de la lista estratégica le pega?
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
      - Si detectas una tarea para ${userName}, asígnale prioridad ALTA.
      - Si una tarea es para otra persona, incluye su nombre en el título.
      - Vincula SIEMPRE que sea posible a los IDs de Objetivos y Jira proporcionados.

      ESTRUCTURA DE RESPUESTA (Responde ÚNICAMENTE en JSON):
      {
        "summary": "Resumen ejecutivo del día.",
        "tasks": [{ 
          "title": "...", 
          "priority": "alta/media/baja", 
          "category": "Talent/Hiring/UX/Other",
          "responsible": "Nombre de la persona responsable (${userName} si es para ti)",
          "goal_id": "ID del objetivo vinculado o null",
          "linked_jira_key": "Key de Jira vinculada o null",
          "linked_jira_subtask_id": "ID de la subtarea vinculada o null",
          "due_date": "YYYY-MM-DD o null"
        }],
        "insights": [{
          "title": "...",
          "description": "...",
          "category": "Talent/Hiring/UX/Other",
          "responsible": "Nombre del responsable o null",
          "goal_id": "...",
          "linked_jira_key": "..."
        }],
        "metrics": [{
          "title": "...",
          "value": "...",
          "change": "...",
          "status": "alta/media/baja",
          "category": "Talent/Hiring/UX/Other",
          "responsible": "Nombre del responsable o null",
          "goal_id": "..."
        }],
        "alerts": [{
          "title": "...",
          "description": "...",
          "priority": "critica/alta/media",
          "category": "Talent/Hiring/UX/Other",
          "responsible": "Nombre del responsable o null",
          "goal_id": "...",
          "linked_jira_key": "..."
        }],
        "feedback": [{
          "title": "...",
          "content": "...",
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
    console.log("AI Response:", aiResponseText);
    
    // Clean markdown if present
    if (aiResponseText.includes("```json")) {
      aiResponseText = aiResponseText.split("```json")[1].split("```")[0].trim();
    } else if (aiResponseText.includes("```")) {
      aiResponseText = aiResponseText.split("```")[1].split("```")[0].trim();
    }

    const result = JSON.parse(aiResponseText);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in analyze route:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
