# Nexión — API and Service Contracts
Version: v1.0
Status: Draft base
Owner: Product / Build System
Purpose: Definir los servicios lógicos de Nexión, sus responsabilidades, límites y contratos funcionales mínimos para alinear frontend, Supabase, n8n, IA e integraciones externas.

---

## 1. Objetivo del documento

Este documento define:
- qué servicios lógicos existen en Nexión
- qué responsabilidad tiene cada servicio
- qué entradas y salidas conceptuales maneja
- cómo se relacionan entre sí
- qué contratos mínimos debe respetar cada uno
- qué parte del sistema depende de frontend, backend, automatización o IA

No define todavía:
- endpoints HTTP finales
- payloads exactos de producción
- RPCs SQL finales
- implementación concreta en código

Su función es servir como capa intermedia entre producto, arquitectura técnica, schema de Supabase, workflows de n8n y futura implementación en repo.

---

## 2. Principio general

Nexión no debe construirse como una mezcla caótica de pantallas, tablas y workflows sin fronteras claras.

Cada servicio debe tener:
- una responsabilidad clara
- entradas esperadas
- salidas esperadas
- relación explícita con otras capas del sistema
- trazabilidad sobre qué entidad crea o actualiza

---

## 3. Tipos de servicio en Nexión

1. Servicios de dominio
2. Servicios de integración
3. Servicios de automatización
4. Servicios de lectura para UI

---

## 4. Servicio 01 — Source Intake Service

### Propósito
Registrar una fuente nueva en Nexión.

### Responsabilidades
- recibir ingreso manual desde la UI
- validar formato mínimo
- crear el registro base de la fuente
- marcar estado inicial
- disparar procesamiento cuando aplique

### Entradas
- workspace_id, user/profile_id, original_url, contexto del día, ingest_mode, metadata opcional

### Salidas
- source_id, source_status inicial, metadata detectada, señal para iniciar procesamiento

---

## 5. Servicio 02 — Source Processing Service

### Propósito
Convertir una fuente registrada en salida estructurada.

### Responsabilidades
- validar acceso a la fuente
- leer o extraer contenido
- preprocesar/chunkear si hace falta
- llamar a la capa de análisis
- persistir analysis, findings y estado final
- marcar entidades afectadas para consolidación

### Entradas
- source_id, source_run_type, trigger_context, force_reprocess boolean opcional

### Salidas
- source_run, analysis, findings, status final, errores si aplica

---

## 6. Servicio 03 — Analysis Service

### Propósito
Interpretar contenido y devolver salida estructurada.

### Responsabilidades
- resumir contenido
- detectar hallazgos
- clasificar categorías
- proponer tareas
- detectar feedback, métricas, alerts e insights
- sugerir vínculos con objetivos cuando aplique

### Entradas
- normalized_text, chunks si aplica, metadata de fuente, contexto opcional

### Salidas
- summary, findings, proposed_tasks, alerts, feedback, metric_signals, insights, objective_link_suggestions

### Regla
Este servicio interpreta y propone. No toma decisiones finales sensibles.

---

## 7. Servicio 04 — Day Engine Service

### Propósito
Construir y mantener el contexto operativo diario.

### Responsabilidades
- consolidar fuentes del día
- construir foco del día
- combinar agenda, tareas, alertas, métricas e insights
- mostrar autoactualización y propuestas pendientes

### Entradas
- summary_date, sources del día, analyses y findings, task proposals, tasks abiertas, alerts activas, metric signals, calendar events, update proposals

### Salidas
- day_summary, bloques de Día > Hoy, agrupaciones de tabs del día, señales para Dashboard

---

## 8. Servicio 05 — Task Proposal Service

### Propósito
Transformar hallazgos accionables en propuestas de tarea.

### Regla
No crea Task definitiva. Solo propuesta.

---

## 9. Servicio 06 — Approval Service

### Propósito
Aplicar decisiones humanas sobre propuestas del sistema.

### Regla crítica
Toda decisión humana relevante debe quedar auditada.

---

## 10. Servicio 07 — Task Service

### Propósito
Gestionar tareas definitivas del sistema.

### Regla
No debe nacer sin origen rastreable ni ignorar aprobación humana.

---

## 11. Servicio 08 — Objectives Sync Service

### Propósito
Consumir la fuente oficial externa de OKRs/KRs y reflejarla dentro de Nexión.

### Regla
No convierte a Nexión en fuente maestra de OKRs.

---

## 12. Servicios 09–16

- Servicio 09 — Metrics Service: consolida y expone métricas diarias y globales. No mezclar métrica con insight.
- Servicio 10 — Insights Service: persiste y expone hallazgos interpretativos.
- Servicio 11 — Alerts Service: persiste y gestiona alertas operativas. Una alerta no equivale automáticamente a una tarea.
- Servicio 12 — Feedback Service: persiste feedback estructurado por producto/tema.
- Servicio 13 — Calendar Context Service: aporta contexto de agenda al módulo Día. Es contexto operativo, no módulo autónomo.
- Servicio 14 — Auto Update Service: propone o aplica cambios automáticos derivados de corrida diaria. Cambios sensibles no se aplican silenciosamente.
- Servicio 15 — Dashboard Read Service: expone vista panorámica global. Debe ser sobrio, útil y ligero.
- Servicio 16 — Integration Status Service: expone estado de integraciones y permisos del sistema.

---

## 13. Contratos mínimos entre servicios

- Source Intake → Source Processing: source_id + trigger_context → run initiated
- Source Processing → Analysis: normalized content + metadata → structured analysis payload
- Analysis → Task Proposal / Insights / Alerts / Feedback / Metrics: findings + context → proposed entities
- Objectives Sync → Task / Metrics / Day: objectives + KRs normalizados → contexto estratégico disponible
- Auto Update → Approval: detected change proposals → update proposals o cambios aplicados

---

## 14. Qué debe consumir el frontend

El frontend consume lecturas estables. No orquesta lógica profunda del sistema.

Payloads principales: login/session state, dashboard payload, day summary payload, fuentes del día, detalle de fuente, tareas del día, tareas globales, objetivos y KRs, métricas, insights, alerts, propuestas pendientes, integration status.

---

## 15. n8n vs backend

### n8n orquesta
- triggers, lectura de fuentes externas, sync de Google, llamadas al modelo, corridas diarias, update proposals, consolidación programada

### backend / Supabase sostiene
- modelo estructurado, relaciones, estado persistido, lecturas para UI, decisiones auditables

---

## 16. Relación con releases

- Release 1: Source Intake, Source Processing, Analysis, Day Engine básico, Dashboard Read básico
- Release 2: Task Proposal, Approval, Task Service
- Release 3: Objectives Sync, vínculos estratégicos
- Release 4: Metrics, Insights, Alerts, Feedback maduros
- Release 5: Calendar Context, Auto Update, Dashboard más potente, Integration Status visible

---

## 17. Regla para Claude Code y Antigravity

Toda implementación debe respetar:
- servicios con frontera clara
- backend y dominio separados de UI
- n8n como orquestador
- IA como servicio de análisis
- aprobación humana para tareas definitivas
- trazabilidad de extremo a extremo
