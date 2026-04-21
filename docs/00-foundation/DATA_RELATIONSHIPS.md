# Nexión — Data Relationships
Version: v1.0
Status: Draft base
Owner: Product / Build System
Purpose: Definir las relaciones lógicas entre entidades del sistema para alinear producto, base de datos, automatización y servicios.

---

## 1. Principio general

Nexión debe poder mantener trazabilidad desde:

**fuente → análisis → hallazgo → propuesta → entidad operativa → objetivo / métrica / estado**

Nada importante debe quedar huérfano de contexto.

---

## 2. Entidades involucradas

User, Workspace, Source, SourceRun, Analysis, Finding, TaskProposal, Task, Insight, Alert, FeedbackItem, MetricSignal, Objective, KeyResult, DaySummary, AutoUpdateRun, UpdateProposal, ApprovalAction.

---

## 3. Relaciones maestras

### Workspace ↔ User
Un Workspace tiene muchos Users. Un User pertenece al menos a un Workspace.

### Workspace ↔ Source
Un Workspace tiene muchas Sources. Una Source pertenece a un Workspace.

### Source ↔ SourceRun
Una Source puede tener muchos SourceRuns (primera ingesta, reproceso, corrida diaria).

### Source → Analysis
Una Source genera uno o varios Analysis. Cada Analysis referencia su SourceRun.

### Analysis → Finding
Un Analysis genera muchos Findings. Los findings son las unidades derivadas.

**Tipos de Finding:** task_candidate, insight_candidate, alert_candidate, feedback_candidate, metric_candidate, decision_candidate, change_candidate.

### Finding → Categorías operativas
Un Finding puede convertirse en: TaskProposal, Insight, Alert, FeedbackItem, MetricSignal.

No todos se convierten automáticamente en entidades finales.

### TaskProposal → Task
Un TaskProposal puede convertirse en Task. La creación final de tareas requiere aprobación humana.

**Estados de TaskProposal:** proposed | approved | rejected | edited_before_approval | expired.

### Task ↔ Objective / KeyResult
Una Task puede vincularse opcionalmente a Objective y/o KeyResult.

### Objective ↔ KeyResult
Un Objective tiene muchos KeyResults. Se sincronizan desde Google Sheets (fuente oficial).

### DaySummary ← Todo
Un DaySummary consolida Sources, Analysis, Findings, TaskProposals, Insights, Alerts, FeedbackItems, MetricSignals del día.

### AutoUpdateRun → UpdateProposal
Una AutoUpdateRun puede generar muchos UpdateProposals. Un UpdateProposal puede apuntar a: Task, Alert, Insight, FeedbackItem, MetricSignal.

### UpdateProposal ↔ ApprovalAction
Una ApprovalAction pertenece a un UpdateProposal y registra qué usuario la tomó.

**Tipos:** approved | rejected | approved_with_edits | deferred.

---

## 4. Relaciones críticas para trazabilidad

- **Task** debe poder llegar a: TaskProposal → Finding → Analysis → Source
- **Alert** debe poder llegar a: Finding → Analysis → Source
- **Insight** debe poder llegar a: Finding → Analysis → Source
- **FeedbackItem** debe poder llegar a: Finding → Analysis → Source
- **Task** debe poder llegar a: Objective y/o KeyResult cuando exista vínculo

---

## 5. Activación por release

### Release 1
Workspace ↔ User, Workspace ↔ Source, Source ↔ SourceRun, SourceRun → Analysis, Analysis → Finding, DaySummary ← Source/Analysis/Finding

### Release 2
Finding → TaskProposal, TaskProposal → Task, DaySummary ← TaskProposal/Task

### Release 3
Task ↔ Objective, Task ↔ KeyResult, Objective ↔ KeyResult

### Release 4
Finding → Insight/Alert/FeedbackItem/MetricSignal, DaySummary ← todas las entidades

### Release 5
AutoUpdateRun → UpdateProposal ↔ ApprovalAction ↔ User

---

## 6. Reglas de integridad conceptual

1. Una fuente puede existir sin análisis, pero no al revés.
2. Una tarea derivada debe tener origen rastreable.
3. DaySummary no reemplaza entidades base; solo consolida.
4. UpdateProposal no equivale a cambio aplicado.
5. Una tarea definitiva no debe nacer directo de IA sin TaskProposal y aprobación.
