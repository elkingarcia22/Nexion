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

Su función es servir como capa intermedia entre:
- producto
- arquitectura técnica
- schema de Supabase
- workflows de n8n
- futura implementación en repo

---

## 2. Principio general

Nexión no debe construirse como una mezcla caótica de pantallas, tablas y workflows sin fronteras claras.

La lógica del sistema debe separarse en servicios comprensibles que respondan a una pregunta simple:

- ¿quién registra una fuente?
- ¿quién la procesa?
- ¿quién construye el día?
- ¿quién crea propuestas?
- ¿quién aprueba?
- ¿quién expone datos al frontend?

### Regla principal
Cada servicio debe tener:
- una responsabilidad clara
- entradas esperadas
- salidas esperadas
- relación explícita con otras capas del sistema
- trazabilidad sobre qué entidad crea o actualiza

---

## 3. Tipos de servicio en Nexión

La arquitectura de Nexión debe contemplar cuatro tipos de servicio:

1. **Servicios de dominio**
2. **Servicios de integración**
3. **Servicios de automatización**
4. **Servicios de lectura para UI**

### Regla
Aunque al inicio parte de esta lógica viva repartida entre Supabase, n8n y frontend, la documentación debe tratarla desde ya como servicios separados.

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

### Entradas conceptuales
- workspace_id
- user/profile_id
- original_url
- contexto del día
- ingest_mode
- metadata opcional

### Salidas conceptuales
- source_id
- source_status inicial
- metadata detectada
- señal para iniciar procesamiento

### No debe hacer
- análisis profundo del contenido
- creación de tareas
- consolidación del día completa

### Consumidores típicos
- Día > Fuentes
- Añadir recurso
- workflow manual de n8n

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

### Entradas conceptuales
- source_id
- source_run_type
- trigger_context
- force_reprocess boolean opcional

### Salidas conceptuales
- source_run
- analysis
- findings
- status final de la fuente
- errores si aplica

### No debe hacer
- crear tareas definitivas
- aprobar propuestas
- sustituir Day Engine

### Dependencias
- Integrations Service
- Analysis Service
- Persistence layer

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

### Entradas conceptuales
- normalized_text
- chunks si aplica
- metadata de fuente
- contexto opcional de producto / día

### Salidas conceptuales
- summary
- findings
- proposed_tasks
- alerts
- feedback
- metric_signals
- insights
- objective_link_suggestions

### Regla
Este servicio interpreta y propone.
No toma decisiones finales sensibles.

### Dependencias
- proveedor de IA (inicialmente Gemini)
- reglas de prompts / plantillas
- límites de contexto y chunking

---

## 7. Servicio 04 — Day Engine Service

### Propósito
Construir y mantener el contexto operativo diario.

### Responsabilidades
- consolidar fuentes del día
- consolidar análisis del día
- construir foco del día
- construir resumen operativo
- combinar agenda, tareas, alertas, métricas e insights
- mostrar autoactualización y propuestas pendientes

### Entradas conceptuales
- summary_date
- sources del día
- analyses y findings del día
- task proposals
- tasks abiertas relevantes
- alerts activas
- metric signals del día
- calendar events
- update proposals

### Salidas conceptuales
- day_summary
- bloques de Día > Hoy
- agrupaciones de tabs del día
- señales para Dashboard

### No debe hacer
- depender de recálculo completo en cada render del frontend
- crear tareas finales automáticamente

---

## 8. Servicio 05 — Task Proposal Service

### Propósito
Transformar hallazgos accionables en propuestas de tarea.

### Responsabilidades
- decidir si un finding amerita propuesta
- construir la propuesta con contexto suficiente
- sugerir prioridad, fecha y vínculo estratégico si aplica
- guardar TaskProposal
- exponerla para revisión

### Entradas conceptuales
- finding_id o set de findings
- source_context
- urgency signals
- objective/KR context opcional

### Salidas conceptuales
- task_proposal
- reason/rationale
- suggested priority
- suggested due date
- suggested strategic link

### Regla
No crea Task definitiva.
Solo propuesta.

---

## 9. Servicio 06 — Approval Service

### Propósito
Aplicar decisiones humanas sobre propuestas del sistema.

### Responsabilidades
- aprobar/rechazar/editar propuestas
- registrar ApprovalAction
- crear entidad definitiva si corresponde
- mantener trazabilidad de la decisión

### Entradas conceptuales
- proposal_kind
- proposal_id
- action_type
- acting_profile_id
- edits opcionales
- notes opcionales

### Salidas conceptuales
- approval_action
- task definitiva o cambio aplicado
- estado actualizado de la propuesta

### Casos principales
- aprobación de TaskProposal
- aprobación de UpdateProposal

### Regla crítica
Toda decisión humana relevante debe quedar auditada.

---

## 10. Servicio 07 — Task Service

### Propósito
Gestionar tareas definitivas del sistema.

### Responsabilidades
- crear tareas a partir de propuestas aprobadas
- exponer tareas para UI global y diaria
- cambiar estado
- editar prioridad, fecha y relación con objetivos
- mantener trazabilidad con origen

### Entradas conceptuales
- task_proposal aprobada
- cambios manuales del usuario
- update proposal aprobada si aplica

### Salidas conceptuales
- task actualizada
- task status
- vínculo con objetivo/KR
- señales para Día y Dashboard

### No debe hacer
- nacer sin origen rastreable
- ignorar aprobación humana

---

## 11. Servicio 08 — Objectives Sync Service

### Propósito
Consumir la fuente oficial externa de OKRs/KRs y reflejarla dentro de Nexión.

### Responsabilidades
- leer Google Sheet oficial
- normalizar objetivos y KRs
- sincronizar representación interna
- mantener relación con tareas, métricas, alerts e insights

### Entradas conceptuales
- source_sync_ref o config de Sheet
- workspace_id
- mapping de columnas

### Salidas conceptuales
- objectives actualizados
- key_results actualizados
- estados y progreso si existe
- señales de cambio relevantes

### Regla
No convierte a Nexión en fuente maestra de OKRs.

---

## 12. Servicio 09 — Metrics Service

### Propósito
Consolidar y exponer métricas diarias y globales.

### Responsabilidades
- registrar señales métricas detectadas
- consolidar métricas globales
- calcular comparativos contra corte previo
- relacionar métricas con objetivos, alerts y tareas
- servir datos para Día > Métricas, módulo Métricas y Dashboard

### Entradas conceptuales
- metric_signals
- fuentes externas vivas
- cortes previos
- objective context opcional

### Salidas conceptuales
- metric_records
- metric deltas
- context summaries
- foco o alertas derivadas si aplica

### Regla
No mezclar métrica con insight.

---

## 13. Servicio 10 — Insights Service

### Propósito
Persistir y exponer hallazgos interpretativos del sistema.

### Responsabilidades
- materializar insights a partir de findings
- consolidar insights globales
- servir insights diarios y globales
- relacionarlos con fuentes, métricas, alerts y objetivos

### Entradas conceptuales
- findings interpretativos
- day context
- agrupaciones históricas

### Salidas conceptuales
- insight entities
- insight groupings
- contexto para UI

---

## 14. Servicio 11 — Alerts Service

### Propósito
Persistir y gestionar alertas operativas.

### Responsabilidades
- crear alertas desde findings o métricas
- actualizar estado de alertas
- exponer alertas del día y globales
- relacionarlas con tareas y objetivos cuando aplique

### Entradas conceptuales
- alert findings
- metric thresholds o signals
- update proposals

### Salidas conceptuales
- alert entities
- alert status
- alert visibility para Día y módulo global

### Regla
Una alerta no equivale automáticamente a una tarea.
Puede requerirla después.

---

## 15. Servicio 12 — Feedback Service

### Propósito
Persistir feedback estructurado y exponerlo por día o globalmente.

### Responsabilidades
- extraer feedback desde findings
- agrupar por producto/tema
- mantener recurrencia
- servir datos para Día > Feedback y futuras vistas globales

### Entradas conceptuales
- feedback findings
- source metadata
- product/area tags opcionales

### Salidas conceptuales
- feedback items
- agrupaciones
- recurrencia detectada

---

## 16. Servicio 13 — Calendar Context Service

### Propósito
Aportar contexto de agenda al módulo Día.

### Responsabilidades
- leer eventos del calendario
- persistir eventos o resumen del día
- calcular tiempo en reuniones vs tiempo libre
- alimentar foco y propuesta de organización del día

### Entradas conceptuales
- profile_id
- fecha
- integración Google Calendar conectada

### Salidas conceptuales
- calendar events del día
- occupied time
- available time
- agenda summary

### Regla
Es contexto operativo, no un módulo autónomo del producto.

---

## 17. Servicio 14 — Auto Update Service

### Propósito
Proponer o aplicar cambios automáticos derivados de la corrida diaria.

### Responsabilidades
- revisar tareas, alerts, insights, feedback y métricas
- decidir si hay cambio aplicable o sugerible
- separar cambios automáticos vs pendientes de aprobación
- registrar AutoUpdateRun y UpdateProposals
- hacer visible el resultado en Día > Hoy

### Entradas conceptuales
- day summary actual
- entidades operativas del día
- reglas de actualización
- señales nuevas vs anteriores

### Salidas conceptuales
- auto_update_run
- update_proposals
- cambios aplicados
- contexto de autoactualización para UI

### Regla crítica
Cambios sensibles no se aplican silenciosamente.

---

## 18. Servicio 15 — Dashboard Read Service

### Propósito
Exponer una vista panorámica global del sistema.

### Responsabilidades
- reunir señales ejecutivas
- resumir estado general
- mostrar carga operativa, métricas relevantes y alertas
- ofrecer lectura global sin reemplazar Día > Hoy

### Entradas conceptuales
- day_summary actual
- metric_records globales
- alerts relevantes
- tasks abiertas prioritarias
- señales estratégicas

### Salidas conceptuales
- dashboard payload resumido

### Regla
Debe ser sobrio, útil y ligero.

---

## 19. Servicio 16 — Integration Status Service

### Propósito
Exponer el estado de integraciones y permisos del sistema.

### Responsabilidades
- registrar estado de Google Auth, Drive, Docs, Sheets, Calendar, Gemini y otros
- mostrar si una integración está conectada, parcial o rota
- alimentar UX de errores de acceso y estados de setup

### Entradas conceptuales
- tabla de integrations
- resultados de sync
- errores de autenticación/acceso

### Salidas conceptuales
- integration state by workspace/profile
- status for UI
- flags de reauth/setup

---

## 20. Contratos mínimos entre servicios

Aun sin definir HTTP final, estos contratos deben existir conceptualmente.

### 20.1 Source Intake → Source Processing
Entrada:
- source_id
- trigger_context

Salida:
- run initiated / source en processing

### 20.2 Source Processing → Analysis
Entrada:
- normalized content
- source metadata
- processing context

Salida:
- structured analysis payload

### 20.3 Analysis → Task Proposal / Insights / Alerts / Feedback / Metrics
Entrada:
- findings
- category mappings
- source and day context

Salida:
- proposed entities or structured signals

### 20.4 Objectives Sync → Task / Metrics / Day
Entrada:
- objectives + KRs normalizados

Salida:
- contexto estratégico disponible para el resto del sistema

### 20.5 Auto Update → Approval
Entrada:
- detected change proposals

Salida:
- update proposals o cambios aplicados

---

## 21. Qué debe consumir el frontend

El frontend no debe conocer toda la complejidad interna.
Debe consumir vistas estructuradas.

### Vistas/payloads principales esperados
- login/session state
- dashboard payload
- day summary payload
- fuentes del día
- detalle de fuente
- tareas del día
- tareas globales
- objetivos y KRs
- métricas diarias/globales
- insights diarios/globales
- alerts diarias/globales
- propuestas pendientes
- integration status

### Regla
El frontend consume lecturas estables.
No orquesta lógica profunda del sistema.

---

## 22. Qué debe orquestar n8n vs qué debe vivir en backend

### n8n debe orquestar
- triggers
- lectura de fuentes externas
- sync de Google
- llamadas al modelo
- corridas diarias
- update proposals
- consolidación programada

### backend / Supabase / capa de dominio debe sostener
- modelo estructurado
- relaciones
- estado persistido
- lecturas para UI
- decisiones auditables

### Regla
No esconder el dominio del producto dentro de workflows solamente.

---

## 23. Relaciones críticas que estos contratos deben preservar

Todo contrato debe respetar:
- trazabilidad completa hacia source
- separación entre proposal y entidad final
- separación entre daily context y global modules
- vínculo opcional con objective/KR
- visibilidad de cambios automáticos y pendientes

---

## 24. Qué no debe pasar

Los servicios de Nexión no deben:
- fusionarse sin criterio hasta perder claridad
- permitir creación automática definitiva de tareas
- exponer al frontend estructuras demasiado crudas o inestables
- mezclar auth con sync de datos sin distinguir responsabilidades
- depender de Google Sheets o Drive como modelo interno del producto
- esconder reglas de negocio críticas dentro de prompts sin documentación

---

## 25. Relación con releases

### Release 1
Obligatorios:
- Source Intake Service
- Source Processing Service
- Analysis Service
- Day Engine Service básico
- Dashboard Read Service básico

### Release 2
Agrega:
- Task Proposal Service
- Approval Service
- Task Service

### Release 3
Agrega:
- Objectives Sync Service
- vínculos estratégicos en Task / Day / Metrics

### Release 4
Agrega madurez en:
- Metrics Service
- Insights Service
- Alerts Service
- Feedback Service

### Release 5
Agrega madurez en:
- Calendar Context Service
- Auto Update Service
- Dashboard Read Service más potente
- Integration Status Service visible

---

## 26. Regla para Claude Code y Antigravity

Este documento debe usarse como referencia antes de diseñar endpoints, hooks, servicios internos o workflows acoplados.

Toda implementación debe respetar:
- servicios con frontera clara
- backend y dominio separados de UI
- n8n como orquestador
- IA como servicio de análisis
- aprobación humana para tareas definitivas
- trazabilidad de extremo a extremo
