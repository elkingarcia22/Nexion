import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { date, meetings, sources } = await request.json();
    const apiKey = process.env.GOOGLE_AI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GOOGLE_AI_API_KEY no configurada. Obtenla gratis en aistudio.google.com" },
        { status: 500 }
      );
    }

    // Prepare the prompt for Gemini
    const prompt = `
      Eres un Asistente de Inteligencia Operativa llamado Nexión.
      Tu tarea es analizar la actividad de un usuario para el día ${date} y generar un resumen ejecutivo, una lista de tareas pendientes y hallazgos clave.

      REUNIONES DEL DÍA:
      ${JSON.stringify(meetings, null, 2)}

      FUENTES Y DOCUMENTOS TRABAJADOS:
      ${JSON.stringify(sources, null, 2)}

      INSTRUCCIONES:
      1. Genera un "summary" (máximo 3 párrafos) que resuma lo más importante del día.
      2. Extrae "tasks": Tareas detectadas. Cada tarea debe tener: title, priority (alta, media, baja), category.
      3. Extrae "insights": Hallazgos u observaciones. Cada uno con: title, description, category.
      4. Extrae "metrics": Señales de métricas o KPIs mencionados. Cada uno con: title, value, change (ej: "+15%"), status (critica, alta, media, baja).
      5. Extrae "alerts": Riesgos o alertas detectadas. Cada uno con: title, description, priority (critica, alta, media).
      6. Extrae "feedback": Comentarios de clientes o equipo. Cada uno con: title, content, type (producto, laboral, personal), priority (critica, alta, media).
      
      Responde ÚNICAMENTE en formato JSON con la siguiente estructura:
      {
        "summary": "texto",
        "tasks": [{ "title": "...", "priority": "...", "category": "..." }],
        "insights": [{ "title": "...", "description": "...", "category": "..." }],
        "metrics": [{ "title": "...", "value": "...", "change": "...", "status": "..." }],
        "alerts": [{ "title": "...", "description": "...", "priority": "..." }],
        "feedback": [{ "title": "...", "content": "...", "type": "...", "priority": "..." }]
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
