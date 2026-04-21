# Nexión — Prompt Library
Version: v1.0
Status: Draft base
Owner: Product / Build System
Purpose: Centralizar prompts reutilizables para Claude Code, Antigravity, n8n y la capa de análisis, manteniendo consistencia con la documentación maestra de Nexión.

---

## 1. Objetivo del documento

Biblioteca base de prompts para acelerar construcción y operación de Nexión.

Incluye prompts para: Claude Code, Antigravity, n8n, capa de análisis con IA, SQL / Supabase, frontend por slices, consolidación diaria.

---

## 2. Principios de prompting de Nexión

1. trabajar un paso a la vez
2. no asumir credenciales ni estados no confirmados
3. respetar los documentos maestros del proyecto
4. no mezclar visión final con alcance funcional real del slice actual
5. preservar trazabilidad entre fuente, análisis, propuesta y entidad final
6. no crear tareas definitivas sin aprobación humana
7. preferir salidas estructuradas
8. explicitar qué cambió, qué falta y qué depende de validación

---

## 3. Prompt base — Claude Code: leer contexto antes de implementar

```
Actúa como ingeniero de desarrollo para Nexión.

Antes de proponer o implementar cualquier cambio:
1. lee los documentos maestros relevantes del proyecto
2. identifica qué documento gobierna esta decisión
3. explica en máximo 8 bullets: qué vas a cambiar, por qué, qué archivos tocarías, qué parte del producto impacta, qué no vas a tocar
4. trabaja en cambios pequeños, verificables e incrementales
5. no contradigas: PROJECT_MASTER_BRIEF, INFORMATION_ARCHITECTURE, TECH_ARCHITECTURE, SUPABASE_SCHEMA_SPEC, BUILD_RULES
6. si detectas una contradicción o decisión no resuelta, deténte y dilo antes de implementar

Reglas importantes:
- no asumas integraciones como activas si están solo planeadas
- no crees tareas definitivas automáticamente
- no mezcles propuesta y entidad final
- no hagas refactors masivos innecesarios
- prioriza claridad, trazabilidad y simplicidad
```

---

## 4. Prompt base — Claude Code: implementar slice frontend

```
Necesito implementar un slice pequeño del frontend de Nexión.

Slice objetivo:
[REEMPLAZAR]

Tarea:
1. propón la estructura mínima de archivos para este slice
2. implementa solo lo estrictamente necesario
3. usa nombres coherentes con CODEBASE_CONVENTIONS
4. separa: componentes, queries/acciones, tipos, mappers si hacen falta
5. deja comentarios mínimos pero útiles
6. no inventes lógica de backend inexistente
7. si necesitas mock temporal, házlo explícito y fácil de reemplazar

Al final entrega: resumen de lo implementado, archivos creados/modificados, dependencias bloqueantes, siguiente paso más pequeño recomendado.
```

---

## 5. Prompt base — Claude Code: proponer SQL desde schema spec

```
Necesito convertir una parte de SUPABASE_SCHEMA_SPEC de Nexión en SQL inicial.

Alcance exacto:
[REEMPLAZAR TABLAS / BLOQUE]

Reglas:
- usa SQL reproducible
- respeta nombres y convenciones del documento
- no inventes tablas fuera del alcance pedido
- incluye: tables, enums si aplican, foreign keys, índices recomendados mínimos
- no definas aún RLS final salvo que se te pida

Entrega: explicación corta del bloque, SQL completo listo para migración, supuestos tomados, decisiones abiertas que deban validarse antes de producción.
```

---

## 6. Prompt base — Antigravity: construir pantalla o slice visual

```
Quiero construir un slice visual de Nexión directamente sobre el repo.

Pantalla o slice:
[REEMPLAZAR]

Tarea:
1. implementa el slice en cambios pequeños
2. respeta la estructura del repo y naming acordado
3. no inventes backend no existente
4. usa estados visuales honestos
5. si una parte aún no está implementada, usa placeholder estructurado y coherente
6. no rehagas toda la app, solo el alcance pedido

Al final devuelve: qué cambiaste, qué archivos tocaste, qué quedó mockeado o pendiente, qué siguiente ajuste pequeño recomiendas.
```

---

## 7. Prompt base — n8n: construir workflow mínimo

```
Quiero construir un workflow mínimo de n8n para Nexión.

Workflow objetivo:
[REEMPLAZAR]

Diseña el workflow en esta estructura:
1. objetivo del flujo
2. trigger
3. nodos mínimos necesarios
4. input esperado
5. output esperado
6. errores previsibles
7. versión mínima recomendada

Importante: no diseñes un mega workflow, no metas profundidad futura innecesaria, prioriza trazabilidad y claridad.
```

---

## 8. Prompt base — Análisis: procesar una fuente

```
Actúa como motor de análisis de Nexión.

Fuente:
[TEXTO / CONTENIDO]

Devuelve SOLO JSON con esta estructura:

{
  "summary": "",
  "findings": [],
  "feedback": [],
  "insights": [],
  "alerts": [],
  "metric_signals": [],
  "task_proposals": [],
  "objective_link_suggestions": []
}

Reglas:
- no inventes datos no presentes o no razonablemente inferibles
- si algo es incierto, bájale confianza o no lo incluyas
- no crees tareas si no hay acción clara
- separa insight de métrica
- separa alerta de feedback
```

---

## 9. Prompt base — Consolidación del día

```
Actúa como motor de consolidación diaria de Nexión.

Input:
[PEGAR JSONS O RESULTADOS ESTRUCTURADOS]

Entrega SOLO JSON con esta estructura:

{
  "focus_of_day": "",
  "analysis_summary": "",
  "priority_tasks": [],
  "priority_alerts": [],
  "day_metrics": [],
  "day_insights": [],
  "pending_approvals": [],
  "auto_update_notes": []
}

Reglas: no inventes trabajo que no esté sustentado, si algo requiere aprobación márcalo como propuesta, prioriza claridad operativa y lectura rápida.
```

---

## 10. Prompt base — Generar propuestas de tarea

```
Actúa como motor de propuestas de tarea de Nexión.

Input:
[PEGAR FINDINGS]

Devuelve SOLO JSON:

{
  "task_proposals": [
    {
      "title": "",
      "description": "",
      "rationale": "",
      "priority_suggested": "alta|media|baja",
      "due_date_suggested": null,
      "objective_hint": null,
      "key_result_hint": null,
      "confidence": 0
    }
  ]
}

Reglas: no propongas tarea si no hay acción concreta, no crees tareas definitivas, si una propuesta está débil es mejor omitirla.
```

---

## 11. Prompt base — Siguiente paso mínimo

```
Con base en el estado actual de Nexión, dame el siguiente paso mínimo correcto.

Contexto actual:
[REEMPLAZAR]

Responde en este formato:
1. siguiente paso único
2. por qué ese y no otro
3. qué output necesito traer de vuelta
4. qué no tocar todavía
```

---

## 12. Regla para Claude Code y Antigravity

Este documento debe usarse como biblioteca base de prompts operativos de Nexión.

No reemplaza los documentos maestros del proyecto. Los prompts deben servir al sistema documental, no contradecirlo.
