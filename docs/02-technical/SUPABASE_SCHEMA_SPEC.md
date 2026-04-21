# Nexión — Supabase Schema Spec
Version: v1.0
Status: Draft base
Owner: Product / Build System
Purpose: Definir la especificación lógica del schema principal de Supabase para Nexión, alineando producto, trazabilidad, automatización y construcción incremental.

---

## 1. Objetivo del documento

Este documento define:
- qué tablas principales debe tener Nexión en Supabase
- qué representa cada tabla
- cuáles son obligatorias por release
- qué relaciones e índices deben existir
- qué enums y convenciones conviene fijar desde el inicio
- cómo mantener trazabilidad entre fuente, análisis, propuestas, tareas, objetivos y estado del día

No define todavía:
- SQL final de creación
- políticas RLS finales
- triggers SQL exactos
- funciones RPC finales

Su función es servir como puente entre:
- el dominio del producto
- la arquitectura técnica
- la futura implementación SQL

---

## 2. Principio general del schema

Supabase debe ser la **fuente de verdad estructurada** de Nexión.

### Regla principal
El schema debe soportar esta cadena sin perder contexto:

**workspace → user → source → source_run → analysis → finding → proposal / entity → day summary / global modules**

### Reglas estructurales
1. Nada importante debe quedar sin trazabilidad a su origen.
2. El schema debe soportar procesamiento incremental.
3. La UI no debe depender de Google Drive/Sheets como backend.
4. La autoactualización debe ser visible y auditable.
5. Las tareas definitivas deben estar separadas de las tareas propuestas.

---

## 3. Convenciones generales

## 3.1 IDs
Todas las tablas principales deben usar:
- `id uuid primary key default gen_random_uuid()`

## 3.2 Timestamps
Todas las tablas principales deben contemplar:
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

## 3.3 Workspace scope
Toda tabla operativa central debe tener:
- `workspace_id uuid not null`

### Regla
Nexión debe poder separar claramente datos por workspace.

## 3.4 Soft delete
Para tablas principales operativas conviene prever:
- `deleted_at timestamptz null`

No es obligatorio activarlo desde el día 1 en todas, pero sí debe quedar previsto.

---

## 4. Tablas núcleo del sistema

## 4.1 workspaces

### Propósito
Contexto organizacional principal de Nexión.

### Campos base
- id
- name
- slug
- status
- created_at
- updated_at

### Notas
Un workspace agrupa usuarios, fuentes, tareas, objetivos sincronizados y resúmenes diarios.

---

## 4.2 profiles

### Propósito
Perfil del usuario dentro de Nexión, separado de auth nativo de Supabase.

### Relación
- 1:1 con `auth.users`

### Campos base
- id (uuid, igual al user auth id)
- workspace_id
- email
- full_name
- avatar_url
- role
- timezone
- is_active
- created_at
- updated_at

### Notas
El login vive en Supabase Auth; `profiles` vive en el dominio del producto.

---

## 4.3 workspace_memberships

### Propósito
Soportar relación flexible entre usuarios y workspaces.

### Campos base
- id
- workspace_id
- profile_id
- membership_role
- status
- joined_at
- created_at
- updated_at

### Nota
Si al inicio solo hay un workspace por usuario, esta tabla puede parecer redundante, pero ayuda a no rehacer después.

---

## 5. Fuentes y procesamiento

## 5.1 sources

### Propósito
Registrar toda fuente que entra al sistema.

### Campos base
- id
- workspace_id
- created_by_profile_id nullable
- source_type
- source_origin
- ingest_mode
- title
- original_url
- external_source_id nullable
- source_date nullable
- detected_at nullable
- last_seen_at nullable
- last_modified_at_external nullable
- current_status
- access_status
- current_hash nullable
- metadata jsonb default '{}'
- needs_reprocessing boolean default false
- created_at
- updated_at
- deleted_at nullable

### Ejemplos de source_type
- meeting_feedback
- meeting_note
- transcript
- google_doc
- google_sheet
- drive_file
- other

### Ejemplos de source_origin
- manual_link
- google_drive
- google_docs
- google_sheets
- calendar_context
- automated_detection

### Ejemplos de ingest_mode
- manual
- automatic
- scheduled

---

## 5.2 source_runs

### Propósito
Registrar cada intento de procesamiento de una fuente.

### Campos base
- id
- workspace_id
- source_id
- run_type
- run_trigger
- run_status
- started_at
- finished_at nullable
- error_code nullable
- error_message nullable
- model_provider nullable
- model_name nullable
- input_hash nullable
- output_version nullable
- execution_metadata jsonb default '{}'
- created_at
- updated_at

### Ejemplos de run_type
- initial
- retry
- reprocess
- daily_recheck
- manual_refresh

### Ejemplos de run_trigger
- user_action
- scheduled_job
- source_changed
- recovery

---

## 5.3 source_contents

### Propósito
Guardar representación normalizada del contenido extraído de la fuente.

### Campos base
- id
- workspace_id
- source_id
- source_run_id
- content_version
- extraction_status
- raw_text nullable
- normalized_text nullable
- content_hash
- token_estimate nullable
- chunk_count nullable
- extraction_metadata jsonb default '{}'
- created_at
- updated_at

### Regla
No es obligatorio guardar siempre el bruto completo si luego decides moverlo a storage, pero el schema debe prever esta pieza.

---

## 5.4 source_chunks

### Propósito
Soportar chunking para textos largos.

### Campos base
- id
- workspace_id
- source_id
- source_run_id
- source_content_id
- chunk_index
- chunk_text
- chunk_hash
- token_estimate nullable
- created_at
- updated_at

### Regla
Permite análisis incremental y evita llamadas gigantes al modelo.

---

## 6. Análisis y hallazgos

## 6.1 analyses

### Propósito
Guardar el resultado estructurado principal del análisis de una fuente.

### Campos base
- id
- workspace_id
- source_id
- source_run_id
- analysis_status
- summary_short nullable
- summary_structured jsonb default '{}'
- confidence_score nullable
- model_provider nullable
- model_name nullable
- analysis_version
- needs_review boolean default false
- created_at
- updated_at

### Nota
Un source_run puede producir un análisis principal y, si luego hace falta, análisis parciales o versiones.

---

## 6.2 findings

### Propósito
Representar unidades estructuradas detectadas por el análisis.

### Campos base
- id
- workspace_id
- source_id
- source_run_id
- analysis_id
- finding_type
- title
- description nullable
- evidence_text nullable
- confidence_score nullable
- severity nullable
- priority_suggestion nullable
- due_date_suggestion nullable
- product_area nullable
- metadata jsonb default '{}'
- created_at
- updated_at

### Ejemplos de finding_type
- task_candidate
- insight_candidate
- alert_candidate
- feedback_candidate
- metric_candidate
- decision_candidate
- change_candidate

---

## 7. Propuestas y aprobaciones

## 7.1 task_proposals

### Propósito
Guardar propuestas de tarea antes de aprobación humana.

### Campos base
- id
- workspace_id
- source_id
- analysis_id
- finding_id
- proposal_status
- title
- description nullable
- priority_suggested nullable
- due_date_suggested nullable
- objective_id nullable
- key_result_id nullable
- rationale nullable
- proposed_by_system boolean default true
- created_at
- updated_at

### Ejemplos de proposal_status
- proposed
- approved
- rejected
- edited_before_approval
- expired

---

## 7.2 update_proposals

### Propósito
Registrar cambios sugeridos por autoactualización antes de aplicar.

### Campos base
- id
- workspace_id
- auto_update_run_id nullable
- target_entity_type
- target_entity_id
- proposal_type
- current_value jsonb default '{}'
- proposed_value jsonb default '{}'
- rationale nullable
- confidence_score nullable
- proposal_status
- created_at
- updated_at

### Ejemplos de target_entity_type
- task
- alert
- insight
- feedback_item
- metric_record

### Ejemplos de proposal_type
- change_status
- close_entity
- update_summary
- consolidate_signal
- create_task_from_day
- deprecate_task

---

## 7.3 approval_actions

### Propósito
Auditar decisiones humanas sobre propuestas.

### Campos base
- id
- workspace_id
- profile_id
- proposal_kind
- task_proposal_id nullable
- update_proposal_id nullable
- action_type
- action_notes nullable
- action_payload jsonb default '{}'
- created_at
- updated_at

### Ejemplos de proposal_kind
- task_proposal
- update_proposal

### Ejemplos de action_type
- approved
- rejected
- approved_with_edits
- deferred

---

## 8. Tareas definitivas

## 8.1 tasks

### Propósito
Guardar trabajo operable definitivo dentro del sistema.

### Campos base
- id
- workspace_id
- task_proposal_id nullable
- created_from_finding_id nullable
- created_from_source_id nullable
- approved_by_profile_id nullable
- title
- description nullable
- task_status
- priority
- due_date nullable
- completed_at nullable
- deprecated_at nullable
- paused_at nullable
- objective_id nullable
- key_result_id nullable
- day_date nullable
- metadata jsonb default '{}'
- created_at
- updated_at
- deleted_at nullable

### Estados oficiales
- por_iniciar
- completada
- incompleta
- en_pausa
- deprecada

### Prioridades base
- alta
- media
- baja

---

## 9. Entidades globales derivadas

## 9.1 insights

### Propósito
Persistir insights consolidados o relevantes.

### Campos base
- id
- workspace_id
- source_id nullable
- analysis_id nullable
- finding_id nullable
- title
- description
- confidence_score nullable
- status
- product_area nullable
- created_at
- updated_at

---

## 9.2 alerts

### Propósito
Persistir alertas activas o históricas.

### Campos base
- id
- workspace_id
- source_id nullable
- analysis_id nullable
- finding_id nullable
- title
- description nullable
- severity
- alert_status
- product_area nullable
- opened_at nullable
- closed_at nullable
- created_at
- updated_at

### Ejemplos de alert_status
- active
- resolved
- ignored
- proposed_close

---

## 9.3 feedback_items

### Propósito
Persistir feedback estructurado.

### Campos base
- id
- workspace_id
- source_id
- analysis_id nullable
- finding_id nullable
- product_area nullable
- feedback_type nullable
- text
- recurrence_count integer default 1
- status
- created_at
- updated_at

---

## 9.4 metric_signals

### Propósito
Registrar señales métricas detectadas en fuentes o corridas.

### Campos base
- id
- workspace_id
- source_id nullable
- analysis_id nullable
- finding_id nullable
- signal_type
- metric_name
- metric_value_text nullable
- metric_value_numeric nullable
- unit nullable
- signal_date nullable
- context_text nullable
- product_area nullable
- created_at
- updated_at

---

## 9.5 metric_records

### Propósito
Guardar estado consolidado de métricas globales o diarias.

### Campos base
- id
- workspace_id
- metric_name
- metric_category
- metric_level
- product_area nullable
- current_value_numeric nullable
- current_value_text nullable
- previous_value_numeric nullable
- previous_value_text nullable
- delta_absolute nullable
- delta_percent nullable
- unit nullable
- cutoff_date
- objective_id nullable
- key_result_id nullable
- summary_context nullable
- update_status
- metadata jsonb default '{}'
- created_at
- updated_at

### metric_level
- daily
- global

### metric_category
- business
- usability
- adoption
- objective_progress

---

## 10. Objetivos y KRs

## 10.1 objectives

### Propósito
Representar objetivos sincronizados desde la fuente oficial externa.

### Campos base
- id
- workspace_id
- external_objective_id nullable
- title
- description nullable
- owner_name nullable
- period_label nullable
- objective_status nullable
- progress_text nullable
- progress_numeric nullable
- source_sync_ref nullable
- metadata jsonb default '{}'
- created_at
- updated_at

---

## 10.2 key_results

### Propósito
Representar KRs sincronizados desde la fuente oficial externa.

### Campos base
- id
- workspace_id
- objective_id
- external_key_result_id nullable
- title
- target_value nullable
- current_value nullable
- unit nullable
- key_result_status nullable
- owner_name nullable
- source_sync_ref nullable
- metadata jsonb default '{}'
- created_at
- updated_at

---

## 10.3 entity_objective_links

### Propósito
Guardar vínculos detectados, sugeridos o confirmados entre entidades y objetivos/KRs.

### Campos base
- id
- workspace_id
- entity_type
- entity_id
- objective_id nullable
- key_result_id nullable
- link_status
- impact_type nullable
- linked_by_system boolean default true
- linked_by_profile_id nullable
- rationale nullable
- created_at
- updated_at

### entity_type
- task
- task_proposal
- finding
- insight
- alert
- metric_record
- feedback_item

### link_status
- detected
- suggested
- confirmed
- edited
- removed

### impact_type
- impulsa
- habilita
- bloquea
- pone_en_riesgo
- informa
- requiere_validacion

---

## 11. Día y autoactualización

## 11.1 day_summaries

### Propósito
Persistir consolidación diaria para el módulo Día.

### Campos base
- id
- workspace_id
- summary_date
- focus_of_day nullable
- agenda_summary nullable
- work_time_summary nullable
- analysis_summary nullable
- auto_update_status
- last_auto_update_at nullable
- next_expected_update_at nullable
- summary_payload jsonb default '{}'
- created_at
- updated_at

### Regla
Debe existir un registro por workspace + fecha.

---

## 11.2 auto_update_runs

### Propósito
Registrar cada corrida diaria de autoactualización.

### Campos base
- id
- workspace_id
- summary_date
- run_status
- started_at
- finished_at nullable
- changes_applied_count integer default 0
- proposals_created_count integer default 0
- notes nullable
- created_at
- updated_at

---

## 11.3 calendar_events

### Propósito
Persistir eventos mínimos de calendario para contexto del día.

### Campos base
- id
- workspace_id
- external_event_id
- profile_id
- title
- starts_at
- ends_at
- duration_minutes nullable
- is_meeting boolean default true
- source_calendar nullable
- metadata jsonb default '{}'
- created_at
- updated_at

---

## 12. Tabla de integraciones y sync

## 12.1 integrations

### Propósito
Registrar estado de conectores por workspace o usuario.

### Campos base
- id
- workspace_id
- profile_id nullable
- integration_type
- integration_status
- auth_scope_summary nullable
- connected_at nullable
- last_sync_at nullable
- last_error nullable
- metadata jsonb default '{}'
- created_at
- updated_at

### integration_type
- google_auth
- google_drive
- google_docs
- google_sheets
- google_calendar
- gemini_api
- slack

### integration_status
- not_connected
- connected
- partially_connected
- pending_setup
- access_error
- pending_reauth

---

## 13. Relaciones clave obligatorias

Estas relaciones deben existir como mínimo:

- workspaces 1:n profiles
- workspaces 1:n sources
- sources 1:n source_runs
- source_runs 1:n analyses
- analyses 1:n findings
- findings 1:0..1 task_proposals
- task_proposals 1:0..1 tasks
- objectives 1:n key_results
- day_summaries 1:n auto_update_runs
- auto_update_runs 1:n update_proposals
- proposals 1:n approval_actions (según tipo)

### Trazabilidad obligatoria
Toda task, alert, insight, feedback_item o metric_signal debe poder volver a:
- finding
- analysis
- source

cuando aplique.

---

## 14. Índices recomendados

Como mínimo, deben existir índices sobre:

### Generales
- `workspace_id`
- `created_at`
- `updated_at`

### Operativos
- `sources(current_status)`
- `sources(source_date)`
- `source_runs(source_id, started_at desc)`
- `analyses(source_id, created_at desc)`
- `findings(analysis_id, finding_type)`
- `task_proposals(proposal_status)`
- `tasks(task_status, priority)`
- `tasks(objective_id)`
- `metric_records(metric_name, cutoff_date desc)`
- `day_summaries(summary_date)`
- `auto_update_runs(summary_date, run_status)`
- `update_proposals(proposal_status, target_entity_type)`
- `entity_objective_links(entity_type, entity_id)`

### Únicos sugeridos
- `day_summaries(workspace_id, summary_date)` unique
- `calendar_events(profile_id, external_event_id)` unique cuando la fuente lo permita
- `integrations(workspace_id, profile_id, integration_type)` unique parcial según necesidad

---

## 15. Enums sugeridos

Conviene modelar como enums o catálogos controlados:

- task_status
- task_priority
- source_type
- source_origin
- ingest_mode
- run_status
- run_type
- analysis_status
- finding_type
- proposal_status
- alert_status
- integration_type
- integration_status
- metric_level
- metric_category
- link_status
- impact_type

### Regla
No mezclar texto libre con estados estructurales si el valor es parte del comportamiento del sistema.

---

## 16. Release mapping del schema

## Release 1 — obligatorio
- workspaces
- profiles
- workspace_memberships
- sources
- source_runs
- source_contents
- source_chunks (opcional si se activa chunking desde inicio)
- analyses
- findings
- day_summaries

## Release 2 — obligatorio
- task_proposals
- approval_actions
- tasks

## Release 3 — obligatorio
- objectives
- key_results
- entity_objective_links

## Release 4 — obligatorio
- insights
- alerts
- feedback_items
- metric_signals
- metric_records

## Release 5 — obligatorio
- auto_update_runs
- update_proposals
- calendar_events
- integrations

---

## 17. Consideraciones de RLS

Sin definir políticas finales aún, el schema debe estar preparado para RLS por:
- workspace
- usuario autenticado
- rol del membership

### Regla
Ninguna tabla operativa relevante debe diseñarse ignorando desde el principio la necesidad de partición por workspace.

---

## 18. Consideraciones de auditoría mínima

Conviene que el schema permita auditar al menos:
- quién creó una fuente
- qué corrida generó un análisis
- qué hallazgo produjo una propuesta
- quién aprobó o rechazó una propuesta
- qué auto update run produjo un cambio
- cuándo cambió el estado de una tarea o alerta

No hace falta resolver todo con tablas de auditoría desde el día 1, pero la estructura debe permitirlo.

---

## 19. Qué no debe hacer el schema

El schema no debe:
- colapsar propuestas y entidades finales en una sola tabla si rompe trazabilidad
- usar Google Sheets como sustituto del modelo interno
- mezclar métricas con insights
- guardar tareas sin origen rastreable
- asumir que una fuente tiene solo una corrida o una sola versión
- obligar a recalcular el día completo en cada lectura UI

---

## 20. Regla para Claude Code y Antigravity

Este documento debe usarse como referencia base antes de escribir SQL o migraciones.

Toda implementación debe respetar:
- centralidad de Supabase como modelo estructurado
- separación entre propuesta y entidad definitiva
- soporte para procesamiento incremental
- trazabilidad total desde fuente hasta acción
- soporte futuro para autoactualización y aprobaciones
