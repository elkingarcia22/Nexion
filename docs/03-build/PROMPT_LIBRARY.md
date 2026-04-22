# Nexión — Prompt Library
Version: v1.0
Status: Draft base
Owner: Product / Build System
Purpose: Centralizar prompts reutilizables para Claude Code, Antigravity, n8n y la capa de análisis, manteniendo consistencia con la documentación maestra de Nexión.

---

## 1. Objetivo del documento

Este documento define una biblioteca base de prompts para acelerar construcción y operación de Nexión.

Incluye prompts para:
- Claude Code
- Antigravity
- n8n
- capa de análisis con IA
- SQL / Supabase
- frontend por slices
- consolidación diaria

No define todavía:
- prompts finales de producción para todos los casos
- variables sensibles o credenciales
- plantillas definitivas de system prompts por entorno

Su función es servir como punto de partida coherente y versionable.

---

## 2. Principios de prompting de Nexión

Todo prompt de Nexión debe respetar estas reglas:

1. trabajar un paso a la vez
2. no asumir credenciales ni estados no confirmados
3. respetar los documentos maestros del proyecto
4. no mezclar visión final con alcance funcional real del slice actual
5. preservar trazabilidad entre fuente, análisis, propuesta y entidad final
6. no crear tareas definitivas sin aprobación humana
7. preferir salidas estructuradas
8. explicitar qué cambió, qué falta y qué depende de validación

---

## 3. Prompt base para Claude Code — leer contexto antes de implementar

```text
Actúa como ingeniero de desarrollo para Nexión.

Antes de proponer o implementar cualquier cambio:
1. lee los documentos maestros relevantes del proyecto
2. identifica qué documento gobierna esta decisión
3. explica en máximo 8 bullets:
   - qué vas a cambiar
   - por qué
   - qué archivos tocarías
   - qué parte del producto impacta
   - qué no vas a tocar
4. trabaja en cambios pequeños, verificables e incrementales
5. no contradigas:
   - PROJECT_MASTER_BRIEF
   - INFORMATION_ARCHITECTURE
   - TECH_ARCHITECTURE
   - SUPABASE_SCHEMA_SPEC
   - BUILD_RULES
6. si detectas una contradicción o decisión no resuelta, detente y dilo antes de implementar

Reglas importantes:
- no asumas integraciones como activas si están solo planeadas
- no crees tareas definitivas automáticamente
- no mezcles propuesta y entidad final
- no hagas refactors masivos innecesarios
- prioriza claridad, trazabilidad y simplicidad
```

---

## 4. Prompt base para Claude Code — implementar slice frontend

```text
Necesito implementar un slice pequeño del frontend de Nexión.

Slice objetivo:
[REEMPLAZAR]

Contexto fijo del producto:
- Nexión es una plataforma basada en fuentes de información
- el home operativo real es Día > Hoy
- el frontend no debe orquestar automatización compleja
- debe consumir lecturas estructuradas
- la UI puede mostrar placeholders o estados base cuando una capacidad aún no está madura

Tarea:
1. propón la estructura mínima de archivos para este slice
2. implementa solo lo estrictamente necesario
3. usa nombres coherentes con CODEBASE_CONVENTIONS
4. separa:
   - componentes
   - queries/acciones
   - tipos
   - mappers si hacen falta
5. deja comentarios mínimos pero útiles
6. no inventes lógica de backend inexistente
7. si necesitas mock temporal, hazlo explícito y fácil de reemplazar

Al final entrega:
- resumen de lo implementado
- archivos creados/modificados
- dependencias bloqueantes
- siguiente paso más pequeño recomendado
```

---

## 5. Prompt base para Claude Code — proponer SQL desde schema spec

```text
Necesito convertir una parte de SUPABASE_SCHEMA_SPEC de Nexión en SQL inicial.

Alcance exacto:
[REEMPLAZAR TABLAS / BLOQUE]

Reglas:
- usa SQL reproducible
- respeta nombres y convenciones del documento
- no inventes tablas fuera del alcance pedido
- incluye:
  - tables
  - enums si aplican
  - foreign keys
  - índices recomendados mínimos
- no definas aún RLS final salvo que se te pida
- no agregues triggers innecesarios

Entrega:
1. explicación corta del bloque
2. SQL completo listo para migración
3. supuestos tomados
4. decisiones abiertas que deban validarse antes de producción
```

---

## 6. Prompt base para Claude Code — revisar impacto de arquitectura

```text
Quiero que evalúes una propuesta de cambio técnico en Nexión.

Cambio propuesto:
[REEMPLAZAR]

Analízalo contra estos documentos:
- PROJECT_MASTER_BRIEF
- TECH_ARCHITECTURE
- API_AND_SERVICE_CONTRACTS
- BUILD_RULES

Responde en este formato exacto:
1. Qué problema resuelve
2. Qué documentos toca o tensiona
3. Riesgos de trazabilidad
4. Riesgos de complejidad innecesaria
5. Si conviene hacerlo ahora o después
6. Recomendación final

No implementes nada todavía.
Solo evalúa.
```

---

## 7. Prompt base para Antigravity — construir pantalla o slice visual

```text
Quiero construir un slice visual de Nexión directamente sobre el repo.

Pantalla o slice:
[REEMPLAZAR]

Contexto fijo:
- Nexión es una plataforma SaaS B2B basada en fuentes de información
- Día > Hoy es el home operativo real
- la UI debe verse completa, pero sin sobreprometer profundidad funcional inexistente
- priorizar limpieza, claridad, jerarquía visual y utilidad operativa
- seguir la arquitectura de información ya definida

Tarea:
1. implementa el slice en cambios pequeños
2. respeta la estructura del repo y naming acordado
3. no inventes backend no existente
4. usa estados visuales honestos
5. si una parte aún no está implementada, usa placeholder estructurado y coherente
6. no rehagas toda la app, solo el alcance pedido

Al final devuelve:
- qué cambiaste
- qué archivos tocaste
- qué quedó mockeado o pendiente
- qué siguiente ajuste pequeño recomiendas
```

---

## 8. Prompt base para Antigravity — refinar una pantalla existente

```text
Necesito refinar una pantalla ya existente de Nexión.

Pantalla:
[REEMPLAZAR]

Objetivo del refinamiento:
[REEMPLAZAR]

Reglas:
- no cambies la arquitectura general
- no rehagas componentes sin necesidad
- mantén consistencia visual con Nexión
- mejora jerarquía, claridad, estados y utilidad operativa
- si cambias estructura, que sea en pequeño
- explica cualquier tradeoff

Entrega:
1. cambios realizados
2. por qué mejoran la pantalla
3. archivos tocados
4. pendientes si los hay
```

---

## 9. Prompt base para n8n / Antigravity — construir workflow mínimo

```text
Quiero construir un workflow mínimo de n8n para Nexión.

Workflow objetivo:
[REEMPLAZAR]

Contexto:
- n8n es el orquestador principal
- Supabase es la fuente estructurada principal
- la IA solo analiza; no decide tareas definitivas
- debemos trabajar un nodo o bloque a la vez
- primero quiero una versión mínima que funcione

Diseña el workflow en esta estructura:
1. objetivo del flujo
2. trigger
3. nodos mínimos necesarios
4. input esperado
5. output esperado
6. errores previsibles
7. versión mínima recomendada

Importante:
- no diseñes un mega workflow
- no metas profundidad futura innecesaria
- prioriza trazabilidad y claridad
```

---

## 10. Prompt base para n8n / refinamiento nodo por nodo

```text
Vamos a refinar un workflow de n8n de Nexión nodo por nodo.

Contexto del flujo:
[REEMPLAZAR]

Nodo actual:
[REEMPLAZAR]

Input real del nodo:
[PEGAR INPUT]

Output real del nodo:
[PEGAR OUTPUT]

Necesito que respondas en este formato exacto:
1. Qué hizo bien el nodo
2. Qué problema o riesgo ves
3. Qué ajuste mínimo recomiendas
4. Cómo debería verse el output correcto
5. Qué revisar después de cambiarlo

No propongas rehacer todo el workflow.
Solo el siguiente ajuste mínimo.
```

---

## 11. Prompt base para capa de análisis — procesar una fuente

```text
Actúa como motor de análisis de Nexión.

Tu trabajo es analizar una fuente y devolver salida estructurada, no escribir texto libre innecesario.

Contexto:
- Nexión transforma fuentes en hallazgos operables
- no toda señal debe convertirse en tarea
- las tareas detectadas son propuestas, no tareas definitivas
- debes separar claramente:
  - resumen
  - feedback
  - insights
  - alertas
  - métricas
  - propuestas de tarea
  - vínculos sugeridos con objetivos/KRs

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

## 12. Prompt base para análisis — consolidación del día

```text
Actúa como motor de consolidación diaria de Nexión.

Tu tarea es consolidar el contexto del día a partir de múltiples resultados estructurados ya analizados.

Debes producir:
- foco del día
- resumen operativo
- tareas más relevantes
- alertas más relevantes
- métricas del día relevantes
- insights del día
- propuestas pendientes destacables

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

Reglas:
- no inventes trabajo que no esté sustentado
- si algo requiere aprobación, márcalo como propuesta
- prioriza claridad operativa y lectura rápida
- no conviertas el resumen en narrativa larga
```

---

## 13. Prompt base para análisis — generar propuestas de tarea

```text
Actúa como motor de propuestas de tarea de Nexión.

Debes revisar findings accionables y devolver solo propuestas de tarea suficientemente claras para revisión humana.

Input:
[PEGAR FINDINGS]

Devuelve SOLO JSON con esta estructura:

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

Reglas:
- no propongas tarea si no hay acción concreta o razonablemente inferible
- no crees tareas definitivas
- si una propuesta está débil, es mejor omitirla
- usa prioridad según urgencia, impacto y señal estratégica disponible
```

---

## 14. Prompt base para análisis — detectar cambios de autoactualización

```text
Actúa como motor de autoactualización de Nexión.

Debes comparar el estado actual con nuevas señales del día y proponer:
- cambios aplicables automáticamente de bajo riesgo
- cambios que deben quedar pendientes de aprobación

Input actual:
[ESTADO ACTUAL]

Input nuevo:
[NUEVAS SEÑALES]

Devuelve SOLO JSON con esta estructura:

{
  "applied_changes": [],
  "update_proposals": []
}

Reglas:
- no cierres tareas definitivamente sin aprobación humana
- no depreques tareas automáticamente salvo evidencia muy clara y regla explícita
- cambios interpretativos fuertes deben ir como propuesta
- todo cambio debe incluir rationale breve
```

---

## 15. Prompt base para revisión de outputs de IA

```text
Quiero auditar la calidad de un output de IA de Nexión.

Contexto:
[REEMPLAZAR]

Input fuente:
[PEGAR FUENTE]

Output IA:
[PEGAR OUTPUT]

Evalúa en este formato exacto:
1. Qué está correcto
2. Qué está sobredetectado o inventado
3. Qué categorías están mal mezcladas
4. Qué faltó detectar
5. Qué ajustes harías al prompt o al pipeline

No reescribas todo el sistema.
Solo audita este caso.
```

---

## 16. Prompt base para crear mock data coherente con Nexión

```text
Necesito mock data coherente con Nexión para un slice específico.

Slice:
[REEMPLAZAR]

Genera datos mock consistentes con:
- Día > Hoy como home operativo real
- categorías separadas: tareas, insights, alertas, métricas, feedback
- objetivos/KRs externos sincronizados
- propuestas pendientes cuando aplique
- estados realistas

Entrega:
- tipos de datos generados
- JSON o estructuras listas para usar
- sin lorem ipsum genérico
- con contexto creíble para producto B2B
```

---

## 17. Prompt base para escribir documentación técnica nueva

```text
Necesito crear un documento nuevo para Nexión.

Documento:
[REEMPLAZAR]

Contexto:
- debe alinearse con PROJECT_MASTER_BRIEF y demás docs maestros
- debe servir para build real
- debe ser claro, estructurado y accionable
- no debe contradecir arquitectura ni reglas existentes

Quiero que lo redactes con esta estructura:
1. objetivo del documento
2. principio general
3. definición del área
4. reglas obligatorias
5. relación con otros bloques del sistema
6. preguntas abiertas
7. regla para Claude Code y Antigravity
```

---

## 18. Plantilla corta para pedir siguiente paso mínimo

```text
Con base en el estado actual de Nexión, dame el siguiente paso mínimo correcto.

Contexto actual:
[REEMPLAZAR]

Necesito que respondas en este formato:
1. siguiente paso único
2. por qué ese y no otro
3. qué output necesito traer de vuelta
4. qué no tocar todavía
```

---

## 19. Regla para mantener esta librería

Esta biblioteca debe evolucionar.
Pero todo prompt nuevo importante debe:
- apuntar a un problema real
- respetar documentos maestros
- evitar ambigüedad innecesaria
- producir outputs reutilizables
- diferenciar claramente propuesta vs entidad final cuando aplique

---

## 20. Regla para Claude Code y Antigravity

Este documento debe usarse como biblioteca base de prompts operativos de Nexión.

No reemplaza los documentos maestros del proyecto.
Los prompts deben servir al sistema documental, no contradecirlo.
