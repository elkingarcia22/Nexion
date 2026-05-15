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
          const { data: ws } = await supabase.from("workspaces").select("gemini_api_key, analysis_config").eq("id", workspaceId).single();
          if (ws?.gemini_api_key) {
            apiKey = ws.gemini_api_key;
          } else if ((ws?.analysis_config as any)?.gemini_api_key) {
            apiKey = (ws?.analysis_config as any).gemini_api_key;
          }
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
      - CRÍTICO: TODO CAMPO "category" DEBE tener un valor. Categorías válidas: Talent, Hiring, UX, Learn, Core AI, Operations. NUNCA uses "Other". NUNCA null o vacío. Usa "Operations" solo cuando pertenezca claramente al equipo de operaciones (app, chat, soporte).
      - CRÍTICO: TODO CAMPO "responsible" DEBE tener un nombre. Si no está claro, usa "${userName}". NUNCA null o vacío.
      - CAMPO "product": Asigna un producto específico según la categoría cuando sea posible. Talent → "Objetivos" | "Encuestas" | "Matriz de Talento" | "Evaluación 360". Learn → "Aprendizaje" | "Certificados" | "LMS Creator" | "Planes de Formación" | "Universidad Corporativa" | "Seguimientos" | "Métricas de Empresa" | "Assessments" | "Learning Map". Core → "Gestión de Usuarios" | "Organigrama" | "Roles y Permisos" | "API" | "Comunicaciones" | "Personalización". Hiring → "Contratación". Operations → "Core IA" | "App" | "Chat de Soporte" | "Planes y Tareas". Si no está claro, usa null.
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
          "category": "Talent | Hiring | UX | Learn | Core AI | Operations",
          "product": "nombre del producto específico según la categoría o null",
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
          "category": "Talent | Hiring | UX | Learn | Core AI | Operations",
          "product": "nombre del producto específico según la categoría o null",
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
          "category": "Talent | Hiring | UX | Learn | Core AI | Operations",
          "responsible": "Nombre del responsable o null",
          "goal_id": "...",
          "linked_metric_names": ["Nombre exacto de métrica vinculada o null"]
        }],
        "alerts": [{
          "title": "Título de la alerta en español",
          "description": "Descripción de la alerta en español",
          "priority": "critica/alta/media",
          "category": "Talent | Hiring | UX | Learn | Core AI | Operations",
          "product": "nombre del producto específico según la categoría o null",
          "responsible": "Nombre del responsable o null",
          "goal_id": "...",
          "linked_jira_key": "...",
          "linked_metric_names": ["Nombre exacto de métrica vinculada o null"]
        }],
        "feedback": [{
          "title": "Título del feedback en español",
          "content": "Contenido del feedback en español",
          "type": "producto/laboral/personal",
          "category": "Talent | Hiring | UX | Learn | Core AI | Operations",
          "product": "nombre del producto específico según la categoría o null",
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

    // LOG: What objectives and Jira context are available for re-linking
    console.log("\n📦 === RE-LINKING INPUT CONTEXT ===");
    console.log(`Objectives available: ${objectives?.length || 0}`);
    if (objectives && objectives.length > 0) {
      console.log("Sample objectives (first 3):");
      objectives.slice(0, 3).forEach((o: any) => {
        console.log(`  [${o.id?.substring(0, 8)}] "${o.title}" (team: ${o.team})`);
      });
    }
    console.log(`Jira context available: ${jiraContext?.length || 0}`);
    if (jiraContext && jiraContext.length > 0) {
      console.log("Sample Jira context (first 3):");
      jiraContext.slice(0, 3).forEach((j: any) => {
        console.log(`  ${j.key} — "${j.title?.substring(0, 50)}"`);
      });
    }
    console.log("===============================\n");

    // SAFETY: Ensure category and responsible are always filled
    if (result.tasks && Array.isArray(result.tasks)) {
      result.tasks = result.tasks.map((task: any) => ({
        ...task,
        category: task.category || "Other",
        responsible: task.responsible || userName || "Usuario",
      }));
    }

    // ════════════════════════════════════════════════════════════════
    // 🎯 POST-PROCESSING: Semantic re-linking of goal_id and jira_key
    // Gemini is unreliable at reproducing UUIDs and foreign keys, so
    // we re-link by title/category similarity after the fact.
    // ════════════════════════════════════════════════════════════════

    const STOP_WORDS = ['para', 'esta', 'con', 'del', 'las', 'los', 'una', 'uno', 'que', 'por', 'como', 'entre', 'tiene', 'este', 'todo', 'más', 'pero', 'sus'];
    const VALID_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const buildKeywords = (text: string) =>
      (text || '').toLowerCase().split(/[\s,.-]+/).filter((w: string) => w.length > 3 && !STOP_WORDS.includes(w));

    const matchObjective = (entity: any, objs: any[], debugLabel: string = ''): string | null => {
      if (!objs || objs.length === 0) {
        console.log(`   ⚠️ matchObjective(${debugLabel}): NO OBJECTIVES AVAILABLE`);
        return null;
      }
      const entityTitle = (entity.title || '').toLowerCase();
      const entityCategory = (entity.category || '').toLowerCase();
      const entityKeywords = buildKeywords(entityTitle);
      if (entityKeywords.length === 0 && !entityCategory) {
        console.log(`   ⚠️ matchObjective(${debugLabel}): no keywords extracted from title`);
        return null;
      }

      let bestMatch: string | null = null;
      let bestScore = 0;
      const topCandidates: { title: string; score: number; id: string }[] = [];

      for (const obj of objs) {
        let score = 0;
        const objTitle = (obj.title || '').toLowerCase();
        const objTeam = (obj.team || '').toLowerCase();
        const objKr = (obj.key_result || '').toLowerCase();

        // Full title containment (strong signal)
        if (entityTitle.includes(objTitle) || objTitle.includes(entityTitle)) score += 80;
        else {
          // Keyword overlap
          const objKeywords = buildKeywords(objTitle);
          const overlap = objKeywords.filter((kw: string) => entityKeywords.includes(kw)).length;
          score += overlap * 15;
        }

        // Category matches team (multiplier, not flat bonus — team context alone should not create a match)
        if (entityCategory && objTeam && (entityCategory === objTeam || objTeam.includes(entityCategory) || entityCategory.includes(objTeam))) {
          score = Math.round(score * 1.5);
        }

        // Key Result mentions in entity
        if (objKr) {
          const krKeywords = buildKeywords(objKr);
          const krOverlap = krKeywords.filter((kw: string) => entityKeywords.includes(kw)).length;
          score += krOverlap * 10;
        }

        if (score > 0) {
          topCandidates.push({ title: obj.title, score, id: obj.id });
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = obj.id;
        }
      }

      // Log top candidates for debugging
      if (topCandidates.length > 0) {
        topCandidates.sort((a, b) => b.score - a.score);
        console.log(`   📊 matchObjective(${debugLabel}) top matches:`);
        topCandidates.slice(0, 3).forEach(c => {
          console.log(`      ${c.score}pts → [${c.id.substring(0, 8)}] "${c.title.substring(0, 40)}"`);
        });
      } else {
        console.log(`   📊 matchObjective(${debugLabel}): no matches found (all 0 scores)`);
      }

      if (bestScore >= 60) {
        console.log(`   ✅ Selected: [${bestMatch?.substring(0, 8)}] with score ${bestScore}`);
      } else {
        console.log(`   ❌ Below threshold (${bestScore} < 60) — returning null`);
      }
      return bestScore >= 60 ? bestMatch : null;
    };

    const matchJiraKey = (entity: any, jiraList: any[], debugLabel: string = ''): { key: string | null; score: number } => {
      if (!jiraList || jiraList.length === 0) {
        console.log(`   ⚠️ matchJiraKey(${debugLabel}): NO JIRA CONTEXT AVAILABLE`);
        return { key: null, score: 0 };
      }
      const entityTitle = (entity.title || '').toLowerCase();
      const entityKeywords = buildKeywords(entityTitle);
      if (entityKeywords.length === 0) {
        console.log(`   ⚠️ matchJiraKey(${debugLabel}): no keywords extracted from title`);
        return { key: null, score: 0 };
      }

      let bestMatch: string | null = null;
      let bestScore = 0;
      const topCandidates: { key: string; title: string; score: number }[] = [];

      for (const jt of jiraList) {
        let score = 0;
        const jtTitle = (jt.title || '').toLowerCase();
        const jtKeywords = buildKeywords(jtTitle);

        if (entityTitle.includes(jtTitle) || jtTitle.includes(entityTitle)) score += 80;
        else {
          const overlap = jtKeywords.filter((kw: string) => entityKeywords.includes(kw)).length;
          score += overlap * 15;
        }

        // Also check subtask titles
        if (jt.subtasks) {
          for (const st of jt.subtasks) {
            const stTitle = (st.title || '').toLowerCase();
            if (entityTitle.includes(stTitle) || stTitle.includes(entityTitle)) score += 40;
            else {
              const stKeywords = buildKeywords(stTitle);
              const stOverlap = stKeywords.filter((kw: string) => entityKeywords.includes(kw)).length;
              score += stOverlap * 10;
            }
          }
        }

        if (score > 0) {
          topCandidates.push({ key: jt.key, title: jt.title, score });
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = jt.key;
        }
      }

      // Log top candidates
      if (topCandidates.length > 0) {
        topCandidates.sort((a, b) => b.score - a.score);
        console.log(`   📊 matchJiraKey(${debugLabel}) top matches:`);
        topCandidates.slice(0, 3).forEach(c => {
          console.log(`      ${c.score}pts → ${c.key} "${c.title.substring(0, 40)}"`);
        });
      } else {
        console.log(`   📊 matchJiraKey(${debugLabel}): no matches found (all 0 scores)`);
      }

      if (bestScore >= 15) {
        console.log(`   ✅ Selected: ${bestMatch} with score ${bestScore}`);
      } else {
        console.log(`   ❌ Below threshold (${bestScore} < 15) — returning null`);
      }
      return { key: bestScore >= 15 ? bestMatch : null, score: bestScore };
    };

    const reLink = (entity: any, entityIndex: number = 0, entityType: string = 'unknown') => {
      const label = `${entityType}[${entityIndex}] "${(entity.title || '').substring(0, 30)}"`;
      const linked: any = { ...entity };

      console.log(`\n  ── reLink ${label} ──`);
      console.log(`  Before: goal_id="${entity.goal_id || 'null'}" jira_key="${entity.linked_jira_key || 'null'}"`);

      // goal_id: keep if valid UUID that exists in objectives, else re-match
      const existingGoalObj = objectives?.find((o: any) => o.id === entity.goal_id);
      if (!entity.goal_id || !VALID_UUID.test(String(entity.goal_id)) || !existingGoalObj) {
        console.log(`  goal_id is invalid or missing, attempting re-match...`);
        const matchedGoal = matchObjective(entity, objectives, label);
        if (matchedGoal) {
          linked.goal_id = matchedGoal;
          console.log(`   ✅ Re-linked goal_id → ${matchedGoal.substring(0, 8)}...`);
        } else {
          linked.goal_id = null;
          console.log(`   goal_id → null (no match found)`);
        }
      } else {
        console.log(`  goal_id "${entity.goal_id?.substring(0, 8)}..." is valid — keeping as-is`);
      }

      // linked_jira_key: conservative re-link — compare scores before overriding
      const { key: jiraKey, score: jiraScore } = matchJiraKey(entity, jiraContext, label);
      const geminiHasKey = entity.linked_jira_key && jiraContext?.some((j: any) => j.key === entity.linked_jira_key);
      if (jiraKey && jiraScore >= 15) {
        if (geminiHasKey && entity.linked_jira_key !== jiraKey) {
          if (jiraScore > 30) {
            console.log(`   ⚠️ Gemini "${entity.linked_jira_key}" vs matcher "${jiraKey}" (${jiraScore}pts) — overriding (score > 30)`);
            linked.linked_jira_key = jiraKey;
          } else {
            console.log(`   ℹ️ Gemini "${entity.linked_jira_key}" kept — matcher "${jiraKey}" (${jiraScore}pts) below override threshold (≤30)`);
            linked.linked_jira_key = entity.linked_jira_key;
          }
        } else if (geminiHasKey && entity.linked_jira_key === jiraKey) {
          linked.linked_jira_key = jiraKey;
          console.log(`   ✅ jira_key → ${jiraKey} (Gemini and matcher agree)`);
        } else {
          linked.linked_jira_key = jiraKey;
          console.log(`   ✅ jira_key → ${jiraKey} (matcher, score ${jiraScore})`);
        }
      } else {
        if (geminiHasKey) {
          console.log(`   ℹ️ Gemini "${entity.linked_jira_key}" kept — matcher found nothing valid`);
          linked.linked_jira_key = entity.linked_jira_key;
        } else {
          linked.linked_jira_key = null;
          console.log(`   jira_key → null (no match)`);
        }
      }

      console.log(`  After: goal_id="${linked.goal_id ? linked.goal_id.substring(0, 8) + '...' : 'null'}" jira_key="${linked.linked_jira_key || 'null'}"`);
      return linked;
    };

    // Apply to all entity types
    console.log("\n🔄 === SEMANTIC RE-LINKING ===");
    for (const type of ['tasks', 'insights', 'alerts'] as const) {
      if (result[type] && Array.isArray(result[type])) {
        const before = result[type].filter((e: any) => e.goal_id || e.linked_jira_key).length;
        result[type] = result[type].map((e: any, i: number) => reLink(e, i, type));
        const after = result[type].filter((e: any) => e.goal_id || e.linked_jira_key).length;
        console.log(`   ${type}: ${before} → ${after} entidades vinculadas (+${after - before})`);
      }
    }
    console.log("🔄 === RE-LINKING DONE ===\n");

    // ════════════════════════════════════════════════════════════════
    // 🧠 TRACEABILITY AUDIT — Análisis detallado de agrupación y asociación
    // ════════════════════════════════════════════════════════════════
    console.log("\n" + "🧩".repeat(20));
    console.log("🧩  TRACEABILITY AUDIT — ANÁLISIS DE GEMINI");
    console.log("🧩" + "=".repeat(57));

    // 1. Category/Team distribution across ALL entity types
    const CATEGORY_SEPARATOR = "\n  " + "─".repeat(50);
    console.log(CATEGORY_SEPARATOR);
    console.log("📊  DISTRIBUCIÓN POR CATEGORÍA/EQUIPO");
    console.log("📊  (Cómo agrupó Gemini cada entidad por equipo)");

    const allEntities = [
      ...(result.tasks || []).map((e: any) => ({ ...e, _type: "TASK" })),
      ...(result.insights || []).map((e: any) => ({ ...e, _type: "INSIGHT" })),
      ...(result.metrics || []).map((e: any) => ({ ...e, _type: "METRIC" })),
      ...(result.alerts || []).map((e: any) => ({ ...e, _type: "ALERT" })),
      ...(result.feedback || []).map((e: any) => ({ ...e, _type: "FEEDBACK" })),
    ];

    const catCounts: Record<string, { total: number; tasks: number; insights: number; metrics: number; alerts: number; feedback: number }> = {};
    for (const e of allEntities) {
      const cat = e.category || "sin_categoria";
      if (!catCounts[cat]) catCounts[cat] = { total: 0, tasks: 0, insights: 0, metrics: 0, alerts: 0, feedback: 0 };
      catCounts[cat].total++;
      catCounts[cat][e._type.toLowerCase() as keyof typeof catCounts[string]]++;
    }
    for (const [cat, counts] of Object.entries(catCounts).sort((a, b) => b[1].total - a[1].total)) {
      const detail = [];
      if (counts.tasks > 0) detail.push(`T${counts.tasks}`);
      if (counts.insights > 0) detail.push(`I${counts.insights}`);
      if (counts.metrics > 0) detail.push(`M${counts.metrics}`);
      if (counts.alerts > 0) detail.push(`A${counts.alerts}`);
      if (counts.feedback > 0) detail.push(`F${counts.feedback}`);
      console.log(`  📁 ${cat.padEnd(25)} → ${counts.total} entidades [${detail.join(", ")}]`);
    }

    // 2. Responsible distribution
    console.log(CATEGORY_SEPARATOR);
    console.log("👤  DISTRIBUCIÓN POR RESPONSABLE");
    console.log("👤  (A quién asignó Gemini cada entidad)");
    const respCounts: Record<string, number> = {};
    for (const e of allEntities) {
      const r = e.responsible || "sin_asignar";
      respCounts[r] = (respCounts[r] || 0) + 1;
    }
    for (const [resp, count] of Object.entries(respCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  👤 ${resp.padEnd(25)} → ${count} entidades`);
    }

    // 3. Objective linking analysis
    console.log(CATEGORY_SEPARATOR);
    console.log("🎯  VINCULACIÓN A OBJETIVOS (goal_id)");
    console.log("🎯  (Qué entidades vinculó Gemini a objetivos estratégicos)");
    const entitiesWithGoal = allEntities.filter((e: any) => e.goal_id);
    const entitiesWithoutGoal = allEntities.filter((e: any) => !e.goal_id);
    console.log(`  ✅ Con goal_id:      ${entitiesWithGoal.length}/${allEntities.length}`);
    console.log(`  ❌ Sin goal_id:       ${entitiesWithoutGoal.length}/${allEntities.length}`);
    if (entitiesWithGoal.length > 0) {
      const goalGroups: Record<string, any[]> = {};
      for (const e of entitiesWithGoal) {
        const g = e.goal_id;
        if (!goalGroups[g]) goalGroups[g] = [];
        goalGroups[g].push(e);
      }
      for (const [gid, items] of Object.entries(goalGroups)) {
        const types = items.map(i => i._type);
        const typeCounts: Record<string, number> = {};
        types.forEach(t => { typeCounts[t] = (typeCounts[t] || 0) + 1; });
        const typeSummary = Object.entries(typeCounts).map(([t, c]) => `${c} ${t}`).join(", ");
        console.log(`  🔗 goal ${gid.substring(0, 8)}... → ${items.length} entidades [${typeSummary}]`);
      }
    }

    // 4. Jira linking analysis
    console.log(CATEGORY_SEPARATOR);
    console.log("🟢  VINCULACIÓN A JIRA (linked_jira_key)");
    console.log("🟢  (Qué entidades vinculó Gemini a historias de usuario)");
    const entitiesWithJira = allEntities.filter((e: any) => e.linked_jira_key);
    const entitiesWithoutJira = allEntities.filter((e: any) => !e.linked_jira_key);
    console.log(`  ✅ Con Jira key:     ${entitiesWithJira.length}/${allEntities.length}`);
    console.log(`  ❌ Sin Jira key:      ${entitiesWithoutJira.length}/${allEntities.length}`);
    if (entitiesWithJira.length > 0) {
      const jiraGroups: Record<string, any[]> = {};
      for (const e of entitiesWithJira) {
        const j = e.linked_jira_key;
        if (!jiraGroups[j]) jiraGroups[j] = [];
        jiraGroups[j].push(e);
      }
      for (const [jkey, items] of Object.entries(jiraGroups)) {
        const types = items.map(i => i._type);
        const typeCounts: Record<string, number> = {};
        types.forEach(t => { typeCounts[t] = (typeCounts[t] || 0) + 1; });
        const typeSummary = Object.entries(typeCounts).map(([t, c]) => `${c} ${t}`).join(", ");
        console.log(`  🔗 ${jkey.padEnd(12)} → ${items.length} entidades [${typeSummary}]`);
      }
    }

    // 5. Metric linking analysis
    console.log(CATEGORY_SEPARATOR);
    console.log("📈  VINCULACIÓN A MÉTRICAS (linked_metric_names)");
    console.log("📈  (Qué entidades vinculó Gemini a métricas de plataforma)");
    const entitiesWithMetrics = allEntities.filter((e: any) => e.linked_metric_names?.length > 0);
    const entitiesWithoutMetrics = allEntities.filter((e: any) => !e.linked_metric_names || e.linked_metric_names.length === 0);
    console.log(`  ✅ Con métricas vinculadas: ${entitiesWithMetrics.length}/${allEntities.length}`);
    console.log(`  ❌ Sin métricas vinculadas: ${entitiesWithoutMetrics.length}/${allEntities.length}`);
    if (entitiesWithMetrics.length > 0) {
      const metricLinks: Record<string, number> = {};
      for (const e of entitiesWithMetrics) {
        for (const m of e.linked_metric_names) {
          metricLinks[m] = (metricLinks[m] || 0) + 1;
        }
      }
      for (const [mname, count] of Object.entries(metricLinks).sort((a, b) => b[1] - a[1])) {
        console.log(`  📊 "${mname}" → vinculada a ${count} entidades`);
      }
    }

    // 6. Cross-entity association matrix
    console.log(CATEGORY_SEPARATOR);
    console.log("🔗  MATRIZ DE ASOCIACIÓN CRUZADA");
    console.log("🔗  (Qué tipos de entidad aparecen juntos vinculados al mismo objetivo/Jira/métrica)");
    console.log("── Asociaciones por OBJETIVO compartido ──");
    if (entitiesWithGoal.length > 0) {
      const goalEntityTypes: Record<string, Set<string>> = {};
      for (const e of entitiesWithGoal) {
        if (!goalEntityTypes[e.goal_id]) goalEntityTypes[e.goal_id] = new Set();
        goalEntityTypes[e.goal_id].add(e._type);
      }
      const multiTypeGoals = Object.entries(goalEntityTypes).filter(([, types]) => types.size > 1);
      if (multiTypeGoals.length > 0) {
        for (const [gid, types] of multiTypeGoals) {
          console.log(`  🔗 Objetivo ${gid.substring(0, 8)}... → asocia: ${Array.from(types).join(" ⟷ ")}`);
        }
      } else {
        console.log("  (sin asociaciones multi-tipo por objetivo)");
      }
    }

    console.log("── Asociaciones por JIRA compartido ──");
    if (entitiesWithJira.length > 0) {
      const jiraEntityTypes: Record<string, Set<string>> = {};
      for (const e of entitiesWithJira) {
        if (!jiraEntityTypes[e.linked_jira_key]) jiraEntityTypes[e.linked_jira_key] = new Set();
        jiraEntityTypes[e.linked_jira_key].add(e._type);
      }
      const multiTypeJiras = Object.entries(jiraEntityTypes).filter(([, types]) => types.size > 1);
      if (multiTypeJiras.length > 0) {
        for (const [jkey, types] of multiTypeJiras) {
          console.log(`  🔗 ${jkey.padEnd(12)} → asocia: ${Array.from(types).join(" ⟷ ")}`);
        }
      } else {
        console.log("  (sin asociaciones multi-tipo por Jira)");
      }
    }

    console.log("── Asociaciones por MÉTRICA compartida ──");
    if (entitiesWithMetrics.length > 0) {
      const metricEntityTypes: Record<string, Set<string>> = {};
      for (const e of entitiesWithMetrics) {
        for (const m of e.linked_metric_names) {
          if (!metricEntityTypes[m]) metricEntityTypes[m] = new Set();
          metricEntityTypes[m].add(e._type);
        }
      }
      const multiTypeMetrics = Object.entries(metricEntityTypes).filter(([, types]) => types.size > 1);
      if (multiTypeMetrics.length > 0) {
        for (const [mname, types] of multiTypeMetrics) {
          console.log(`  📊 "${mname.substring(0, 30)}..." → asocia: ${Array.from(types).join(" ⟷ ")}`);
        }
      } else {
        console.log("  (sin asociaciones multi-tipo por métrica)");
      }
    }

    // 7. Full per-entity trace dump (first 3 of each type)
    console.log(CATEGORY_SEPARATOR);
    console.log("📋  DUMP DE TRAZABILIDAD POR ENTIDAD (primeras 3 de cada tipo)");
    for (const entityType of ["tasks", "insights", "metrics", "alerts", "feedback"]) {
      const items = result[entityType] || [];
      if (items.length === 0) continue;
      console.log(`\n── ${entityType.toUpperCase()} (${items.length} total) ──`);
      for (let i = 0; i < Math.min(items.length, 3); i++) {
        const item = items[i];
        const assocs = [];
        if (item.goal_id) assocs.push(`obj:${item.goal_id.substring(0, 8)}`);
        if (item.linked_jira_key) assocs.push(`jira:${item.linked_jira_key}`);
        if (item.linked_jira_subtask_id) assocs.push(`sub:${item.linked_jira_subtask_id}`);
        if (item.linked_metric_names?.length > 0) assocs.push(`met:${item.linked_metric_names.join(",")}`);
        console.log(`  ${i + 1}. "${item.title?.substring(0, 50)}"`);
        console.log(`     cat:${item.category} | resp:${item.responsible || "—"} | asoc:[${assocs.join(", ") || "ninguna"}]`);
        if (item.goal_id) console.log(`     → vinculado a OBJETIVO: ${item.goal_id}`);
        if (item.linked_jira_key) console.log(`     → vinculado a JIRA: ${item.linked_jira_key}${item.linked_jira_subtask_id ? ` / subtask: ${item.linked_jira_subtask_id}` : ""}`);
        if (item.linked_metric_names?.length > 0) console.log(`     → vinculado a MÉTRICAS: ${item.linked_metric_names.join(", ")}`);
      }
    }

    console.log("\n" + "🧩".repeat(20));
    console.log("🧩  FIN TRACEABILITY AUDIT");
    console.log("🧩" + "=".repeat(57) + "\n");
    // ════════════════════════════════════════════════════════════════

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in analyze route:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
