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

---

## 2. Principio general

El codebase de Nexión debe ser: claro, predecible, incremental, trazable, fácil de leer por humanos y agentes.

Toda decisión de estructura debe favorecer: claridad, trazabilidad, separación de responsabilidades, facilidad de cambio futuro, velocidad de validación.

---

## 3. Convención general de naming

### Código técnico: inglés
- nombres de carpetas, archivos, variables, funciones, tablas, enums, servicios, rutas internas, tipos/interfaces

### Producto/UI visible: español
- labels, textos visibles, nombres de tabs visibles, copy UX

### Regla
No mezclar idiomas dentro del mismo naming técnico.

---

## 4. Estilo por tipo de elemento

| Elemento | Estilo | Ejemplo |
|----------|--------|---------|
| Carpetas | kebab-case | `day-engine`, `source-processing` |
| Archivos TS/JS | kebab-case (módulos), PascalCase (componentes) | `source-intake-service.ts`, `TaskCard.tsx` |
| Variables y funciones | camelCase | `createTaskFromProposal`, `getDaySummary` |
| Tipos/interfaces/clases | PascalCase | `TaskProposal`, `DaySummaryPayload` |
| Constantes globales | UPPER_SNAKE_CASE | `DEFAULT_DAY_REFRESH_HOUR` |
| Tablas SQL | snake_case plural | `task_proposals`, `day_summaries` |
| Columnas SQL | snake_case | `workspace_id`, `created_at` |
| Enums SQL | snake_case valores | `por_iniciar`, `pending_review` |

---

## 5. Estructura base del repo

```
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

/automation
  /n8n
    /exports
    /docs
    /prompts

/scripts
/.github
```

---

## 6. Estructura del frontend

```
/apps/web/src
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
Separar: UI reusable, lógica por feature, acceso a datos, validaciones, mapeos, tipos. No mezclar todo en una carpeta plana.

---

## 7. Convenciones para React / UI

### Componentes PascalCase
- `DayTodayView`, `TaskProposalCard`, `SourceListPanel`, `DashboardSummaryPanel`

### Componentes de feature con intención de dominio
- Mejor: `PendingApprovalsPanel`, `DayFocusCard`, `MetricSignalList`
- Evitar: `Card1`, `InfoBox`, `PanelNew`, `DataSection`

---

## 8. Convenciones para servicios

Nombrar por responsabilidad, no por tecnología:
- `source-intake-service`, `day-engine-service`, `task-proposal-service`, `objectives-sync-service`

Evitar: `supabase-helper-2`, `google-service-final`, `misc-service`

Todo servicio debe responder a una responsabilidad clara ya definida en `API_AND_SERVICE_CONTRACTS.md`.

---

## 9. Convenciones para queries y acciones

### Queries (lecturas)
- `getDaySummary`, `listSourcesByDay`, `getTaskProposalById`, `listGlobalAlerts`

### Acciones (mutaciones)
- `createSourceFromLink`, `reprocessSource`, `approveTaskProposal`, `rejectUpdateProposal`, `updateTaskStatus`

Evitar nombres vagos: `handleSubmit`, `saveData`, `updateThing`

---

## 10. Convenciones para tipos

```typescript
// Entidades
type Source = {...}
type TaskProposal = {...}
type DaySummary = {...}

// Payloads con sufijos consistentes
type CreateSourceInput = {...}
type DaySummaryPayload = {...}
type ApproveTaskProposalInput = {...}
type MetricRecordEntity = {...}
```

---

## 11. Convenciones para rutas del producto

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
La ruta debe reforzar la diferencia entre capa diaria y capa global.

---

## 12. Convenciones SQL

### Archivos de migración
`YYYYMMDDHHMMSS_description.sql`

Ejemplo: `20260418103000_create_sources_and_source_runs.sql`

### Índices
- `idx_<table>_<column>`
- `uq_<table>_<column_combo>`

---

## 13. Convenciones para n8n

### Naming de workflows
- `add-source-manual`, `process-source`, `daily-run`, `sync-okrs`, `sync-calendar`, `approve-task-proposal`

Evitar: `Workflow 2`, `Nuevo flujo copia`, `Prueba final`

---

## 14. Convenciones para commits y branches

### Commits
- `feat(day): add today summary shell`
- `feat(tasks): create approval flow`
- `fix(sources): handle invalid source link`
- `docs(architecture): add supabase schema spec`

Evitar: `cambios`, `fix`, `avance`, `prueba`

### Branches
- `feat/day-today-shell`, `feat/source-processing`, `feat/task-approval-flow`, `fix/source-status-bug`

---

## 15. Variables de entorno

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GEMINI_API_KEY
N8N_BASE_URL
N8N_API_KEY
```

Evitar: `KEY1`, `SECRET_TEST`, `URL_NEW`

---

## 16. Feature flags para madurez gradual

```typescript
const isTaskApprovalEnabled = false;
const isObjectivesSyncEnabled = false;
const isCalendarContextEnabled = false;
```

Permite mantener visión visual completa sin mentir sobre profundidad funcional.

---

## 17. Qué no debe hacerse

- mezclar nombres en español e inglés dentro del dominio técnico
- poner lógica crítica dentro de componentes gigantes
- escribir queries complejas directamente en la UI
- duplicar estados del sistema sin centralización
- crear carpetas genéricas como `misc`, `stuff`, `helpers2`
- usar naming distinto para la misma entidad en cada capa

---

## 18. Regla para Claude Code y Antigravity

Toda implementación en Nexión debe seguir estas convenciones salvo que exista una decisión explícita posterior que las cambie.

Si una herramienta propone estructura o naming que contradice este documento:
1. no asumirlo como definitivo
2. adaptarlo al estándar de Nexión
3. o registrar una decisión nueva si realmente conviene cambiar la convención
