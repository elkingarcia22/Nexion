# Nexión — Codebase Conventions
Version: v1.0
Status: Draft base
Owner: Product / Build System
Purpose: Definir convenciones obligatorias de organización de repo, naming, estructura de código, patrones de implementación y reglas de consistencia para Claude Code, Antigravity y cualquier colaborador técnico que construya Nexión.

---

## 1. Objetivo del documento

Este documento define:
- cómo debe organizarse el repo de Nexión
- cómo nombrar archivos, carpetas, servicios, tablas y componentes
- qué convenciones seguir para frontend, backend, automatización y documentación
- cómo mantener consistencia entre producto, datos y código
- qué patrones mínimos deben respetarse para no degradar el sistema

No define todavía:
- framework exacto final del frontend si cambia
- detalle fino de testing o CI/CD
- formato final de linters/formatters

Su función es reducir ambigüedad y evitar que el repo crezca de forma caótica.

---

## 2. Principio general

El codebase de Nexión debe ser:
- claro
- predecible
- incremental
- trazable
- fácil de leer por humanos y agentes

### Regla principal
Toda decisión de estructura debe favorecer:
1. claridad
2. trazabilidad
3. separación de responsabilidades
4. facilidad de cambio futuro
5. velocidad de validación

---

## 3. Convención general de naming

## 3.1 Reglas de idioma
### Código técnico
Usar **inglés** para:
- nombres de carpetas
- archivos
- variables
- funciones
- tablas
- enums
- servicios
- rutas internas
- tipos/interfaces

### Producto/UI visible
Usar **español** donde corresponda al producto:
- labels
- textos visibles
- nombres de tabs visibles
- copy UX

### Regla
No mezclar idiomas dentro del mismo naming técnico.

---

## 3.2 Estilo por tipo de elemento

### Carpetas
- kebab-case  
Ejemplo:
- `day-engine`
- `source-processing`
- `task-proposals`

### Archivos TypeScript / JS
- kebab-case para módulos, utilidades y servicios
- PascalCase para componentes React si el stack final usa esta convención

Ejemplos:
- `source-intake-service.ts`
- `day-summary-query.ts`
- `TaskCard.tsx`

### Variables y funciones
- camelCase  
Ejemplo:
- `createTaskFromProposal`
- `getDaySummary`

### Tipos / interfaces / clases
- PascalCase  
Ejemplo:
- `TaskProposal`
- `DaySummaryPayload`

### Constantes globales
- UPPER_SNAKE_CASE  
Ejemplo:
- `DEFAULT_DAY_REFRESH_HOUR`
- `TASK_PRIORITY_ORDER`

### Tablas SQL
- snake_case plural  
Ejemplo:
- `task_proposals`
- `day_summaries`

### Columnas SQL
- snake_case  
Ejemplo:
- `workspace_id`
- `created_at`
- `proposal_status`

### Enums SQL / dominio
- snake_case para valores  
Ejemplo:
- `por_iniciar`
- `pending_review`
- `meeting_feedback`

---

## 4. Estructura base recomendada del repo

```text
/docs
  /00-foundation
  /01-product-logic
  /02-technical
  /03-build
  /04-decisions

/apps
  /web

/packages
  /ui
  /types
  /config
  /lib

/supabase
  /migrations
  /seeds
  /functions (solo si luego aplica)

/automation
  /n8n
    /exports
    /docs
    /prompts

/scripts

/.github
```

### Regla
Aunque el repo empiece pequeño, debe quedar listo para crecer sin reordenamientos traumáticos.

---

## 5. Estructura recomendada del frontend

Si el frontend vive en `/apps/web`, la estructura recomendada debe acercarse a esto:

```text
/apps/web
  /src
    /app
    /components
      /layout
      /dashboard
      /day
      /tasks
      /objectives
      /metrics
      /insights
      /alerts
      /shared
    /features
      /auth
      /sources
      /analysis
      /day
      /tasks
      /objectives
      /metrics
      /insights
      /alerts
      /approvals
      /integrations
    /services
    /queries
    /actions
    /hooks
    /lib
    /types
    /constants
    /mappers
    /validators
    /styles
```

### Regla
Separar:
- UI reusable
- lógica por feature
- acceso a datos
- validaciones
- mapeos
- tipos

No mezclar todo en una carpeta plana.

---

## 6. Regla de organización por feature

Nexión debe organizarse por **dominios/feature slices**, no solo por tipo técnico.

### Features esperadas
- auth
- sources
- analysis
- day
- tasks
- objectives
- metrics
- insights
- alerts
- approvals
- integrations

### Regla
Cada feature debe poder localizar rápidamente:
- sus tipos
- sus queries
- sus componentes principales
- sus acciones
- sus validaciones
- sus mappers

---

## 7. Convenciones para React / UI

## 7.1 Componentes
Usar PascalCase para componentes.

Ejemplos:
- `DayTodayView`
- `TaskProposalCard`
- `SourceListPanel`
- `DashboardSummaryPanel`

## 7.2 Componentes de layout
Agrupar en:
- `layout`
- `navigation`
- `shell`
- `page-sections`

## 7.3 Componentes de feature
Nombrarlos con intención de dominio, no genéricos.

### Mejor
- `PendingApprovalsPanel`
- `DayFocusCard`
- `MetricSignalList`

### Evitar
- `Card1`
- `InfoBox`
- `PanelNew`
- `DataSection`

## 7.4 Páginas
Nombrar según su propósito real.
Ejemplos:
- `day-today-page`
- `day-sources-page`
- `global-tasks-page`

---

## 8. Convenciones para servicios frontend/backend

Los servicios deben nombrarse por responsabilidad, no por tecnología.

### Correcto
- `source-intake-service`
- `day-engine-service`
- `task-proposal-service`
- `objectives-sync-service`

### Evitar
- `supabase-helper-2`
- `google-service-final`
- `misc-service`

### Regla
Todo servicio debe responder a una responsabilidad clara ya definida en `API_AND_SERVICE_CONTRACTS.md`.

---

## 9. Convenciones para queries y lecturas

Separar claramente:
- lecturas para UI
- mutaciones/acciones
- mappers de dominio

### Naming recomendado
- `getDaySummary`
- `listSourcesByDay`
- `getTaskProposalById`
- `listGlobalAlerts`
- `syncObjectivesSnapshot`

### Regla
No esconder lógica de lectura compleja dentro de componentes de UI.

---

## 10. Convenciones para acciones/mutaciones

Toda mutación debe expresar qué hace y sobre qué entidad.

### Ejemplos
- `createSourceFromLink`
- `reprocessSource`
- `approveTaskProposal`
- `rejectUpdateProposal`
- `updateTaskStatus`
- `linkTaskToKeyResult`

### Regla
Evitar nombres vagos como:
- `handleSubmit`
- `saveData`
- `updateThing`

---

## 11. Convenciones para tipos y contratos

Los tipos deben existir en nombres explícitos y diferenciados.

### Ejemplos
- `Source`
- `SourceRun`
- `Analysis`
- `Finding`
- `TaskProposal`
- `Task`
- `DaySummary`
- `MetricRecord`
- `ObjectiveLinkSuggestion`

### Para payloads
Usar sufijos consistentes:
- `Payload`
- `Input`
- `Result`
- `Response`
- `Record`
- `Entity`

Ejemplos:
- `CreateSourceInput`
- `DaySummaryPayload`
- `ApproveTaskProposalInput`
- `MetricRecordEntity`

---

## 12. Convenciones para mappers y adapters

Cuando haya diferencias entre:
- Supabase schema
- payload UI
- contratos de servicios
- outputs de IA

usar mappers explícitos.

### Naming recomendado
- `mapAnalysisToFindings`
- `mapTaskProposalRecordToEntity`
- `mapDaySummaryToTodayViewModel`

### Regla
No hacer transformaciones complejas inline en componentes o nodos dispersos.

---

## 13. Convenciones para validaciones

Las validaciones deben vivir fuera de componentes principales y fuera de workflows improvisados.

### Ejemplos
- `validateSourceLink`
- `validateTaskApprovalInput`
- `validateObjectiveMapping`

### Regla
Las validaciones de dominio deben ser reutilizables y visibles.

---

## 14. Convenciones para errores

Los errores deben tener:
- tipo claro
- origen claro
- mensaje técnico
- mensaje utilizable para UI cuando aplique

### Naming recomendado
- `SourceAccessError`
- `AnalysisTimeoutError`
- `InvalidSourceLinkError`
- `ObjectiveSyncMappingError`

### Regla
No usar errores genéricos sin contexto en capas críticas.

---

## 15. Convenciones para enums y catálogos

Los enums deben centralizarse cuando gobiernan comportamiento del sistema.

### Ejemplos
- `task-status.ts`
- `source-status.ts`
- `integration-status.ts`
- `metric-category.ts`

### Regla
No duplicar strings críticos de estado en múltiples archivos.

---

## 16. Convenciones para rutas del producto

Las rutas deben reflejar la arquitectura de información real del sistema.

### Ejemplos sugeridos
- `/dashboard`
- `/day/today`
- `/day/sources`
- `/day/analysis-summary`
- `/day/tasks-generated`
- `/day/insights`
- `/day/metrics`
- `/day/alerts`
- `/day/feedback`
- `/tasks`
- `/objectives`
- `/metrics`
- `/insights`
- `/alerts`

### Regla
La ruta debe reforzar la diferencia entre:
- capa diaria
- capa global

---

## 17. Convenciones para Supabase SQL

## 17.1 Archivos de migración
Nombrado recomendado:
`YYYYMMDDHHMMSS_description.sql`

Ejemplo:
- `20260418103000_create_sources_and_source_runs.sql`

## 17.2 Nombres de tablas
- plural
- snake_case
- sustantivos claros

## 17.3 Nombres de foreign keys
Usar `<table>_<column>_fkey` o convención consistente equivalente.

## 17.4 Nombres de índices
Usar:
- `idx_<table>_<column>`
- `uq_<table>_<column_combo>`

### Regla
SQL debe ser legible y fácil de revisar por humanos.

---

## 18. Convenciones para n8n y automatización

Aunque n8n viva fuera del frontend, debe seguir convenciones de repo.

### Estructura recomendada
- exports versionados
- docs por workflow
- prompts asociados
- changelog simple si hace falta

### Naming de workflows
Usar verbos y propósito claro.

Ejemplos:
- `add-source-manual`
- `process-source`
- `daily-run`
- `sync-okrs`
- `sync-calendar`
- `approve-task-proposal`

### Regla
Nada de nombres como:
- `Workflow 2`
- `Nuevo flujo copia`
- `Prueba final`

---

## 19. Convenciones para documentación dentro del repo

Todo documento maestro debe vivir en `/docs`.

### Archivos
- usar UPPER_SNAKE_CASE para docs principales si ya vienes en esa línea
o
- kebab-case si luego decides unificar

### Regla práctica
Como el proyecto ya arrancó con nombres tipo:
- `PROJECT_MASTER_BRIEF.md`
- `TECH_ARCHITECTURE.md`

mantener esa convención para los documentos maestros.

---

## 20. Convenciones para commits

Los commits deben ser claros y orientados a intención.

### Formato sugerido
- `feat(day): add today summary shell`
- `feat(tasks): create approval flow`
- `fix(sources): handle invalid source link`
- `docs(architecture): add supabase schema spec`
- `refactor(day): split day summary mapper`
- `chore(repo): add env example`

### Regla
Evitar commits como:
- `cambios`
- `fix`
- `avance`
- `prueba`

---

## 21. Convenciones para branches

Formato sugerido:
- `feat/day-today-shell`
- `feat/source-processing`
- `feat/task-approval-flow`
- `docs/schema-spec`
- `fix/source-status-bug`

### Regla
El nombre de branch debe decir claramente qué slice o problema está atacando.

---

## 22. Convenciones para variables de entorno

Usar nombres explícitos y consistentes.

### Ejemplos
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GEMINI_API_KEY`
- `N8N_BASE_URL`
- `N8N_API_KEY`

### Regla
No usar variables ambiguas como:
- `KEY1`
- `SECRET_TEST`
- `URL_NEW`

---

## 23. Convenciones para feature flags o estados de madurez

Cuando una parte exista visualmente pero no esté madura funcionalmente, usar flags claros.

### Ejemplos
- `isTaskApprovalEnabled`
- `isObjectivesSyncEnabled`
- `isCalendarContextEnabled`

### Regla
Eso permite mantener visión visual completa sin mentir sobre profundidad funcional.

---

## 24. Qué no debe hacerse

No se debe:
- mezclar nombres en español e inglés dentro del dominio técnico
- poner lógica crítica dentro de componentes gigantes
- escribir queries complejas directamente en la UI
- duplicar estados del sistema sin centralización
- crear carpetas genéricas como `misc`, `stuff`, `helpers2`
- perder alineación entre nombres del producto y nombres técnicos
- usar naming distinto para la misma entidad en cada capa

---

## 25. Regla para Claude Code y Antigravity

Toda implementación en Nexión debe seguir estas convenciones salvo que exista una decisión explícita posterior que las cambie.

Si una herramienta propone estructura o naming que contradice este documento:
1. no asumirlo como definitivo
2. adaptarlo al estándar de Nexión
3. o registrar una decisión nueva si realmente conviene cambiar la convención
