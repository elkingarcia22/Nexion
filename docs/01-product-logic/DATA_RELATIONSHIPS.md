# Nexión — Data Relationships
Version: v1.0
Status: Draft base
Owner: Product / Build System
Purpose: Definir las relaciones lógicas entre entidades del sistema para alinear producto, base de datos, automatización y servicios.

---

## 1. Propósito del documento

Este documento define:
- qué entidades se relacionan entre sí
- qué relaciones son obligatorias y cuáles opcionales
- qué objetos nacen de otros
- qué relaciones deben mantenerse para trazabilidad
- qué relaciones se activan por release

No define aún el schema SQL final.
Su función es servir como puente entre el modelo conceptual de producto y la futura implementación en Supabase, n8n y servicios de análisis.

---

## 2. Principio general de relación de datos

Nexión debe poder mantener trazabilidad desde:

**fuente → análisis → hallazgo → propuesta → entidad operativa → objetivo / métrica / estado**

La regla principal es:
- nada importante debe quedar huérfano de contexto
- cada tarea, alerta, insight, feedback o métrica derivada debe poder rastrearse hacia su fuente original o hacia una consolidación explícita del sistema

---

## 3. Entidades núcleo involucradas

Las relaciones principales del sistema se construyen alrededor de estas entidades:

- User
- Workspace
- Source
- SourceRun
- Analysis
- Finding
- TaskProposal
- Task
- Insight
- Alert
- FeedbackItem
- MetricSignal
- Objective
- KeyResult
- DaySummary
- AutoUpdateRun
- UpdateProposal
- ApprovalAction

---

## 4. Relaciones maestras

## 4.1 Workspace ↔ User

### Relación
- Un **Workspace** tiene muchos **Users**.
- Un **User** pertenece al menos a un **Workspace**.

### Propósito
Permitir uso de Nexión por equipo y mantener separación de contexto, datos y permisos.

---

## 4.2 Workspace ↔ Source

### Relación
- Un **Workspace** tiene muchas **Sources**.
- Una **Source** pertenece a un **Workspace**.

### Propósito
Toda fuente debe vivir dentro de un contexto organizacional claro.

---

## 4.3 User ↔ Source

### Relación
- Un **User** puede crear manualmente muchas **Sources**.
- Una **Source** puede tener un **created_by_user_id** opcional.

### Propósito
Diferenciar entre:
- fuentes ingresadas manualmente
- fuentes detectadas automáticamente por el sistema

---

## 4.4 Source ↔ SourceRun

### Relación
- Una **Source** puede tener muchos **SourceRuns**.
- Un **SourceRun** pertenece a una sola **Source**.

### Propósito
Guardar historial de procesamiento.
Cada corrida representa un intento de lectura/análisis o reprocesamiento.

### Ejemplos
- primera ingesta
- reproceso por cambio de contenido
- reproceso manual
- reproceso en corrida diaria

---

## 4.5 Source ↔ Analysis

### Relación
- Una **Source** puede generar uno o varios **Analysis**.
- Un **Analysis** pertenece a una **Source** y usualmente a un **SourceRun**.

### Propósito
Separar claramente:
- la fuente original
- el análisis estructurado producido sobre ella

---

## 4.6 SourceRun ↔ Analysis

### Relación
- Un **SourceRun** puede producir uno o varios **Analysis**.
- Un **Analysis** debe referenciar el **SourceRun** que lo generó.

### Propósito
Trazar qué análisis salió de qué ejecución específica.

---

## 4.7 Analysis ↔ Finding

### Relación
- Un **Analysis** genera muchos **Findings**.
- Un **Finding** pertenece a un solo **Analysis**.

### Propósito
Un análisis es el contenedor estructurado.
Los findings son las unidades derivadas detectadas por el sistema.

### Tipos posibles de Finding
- task_candidate
- insight_candidate
- alert_candidate
- feedback_candidate
- metric_candidate
- decision_candidate
- change_candidate

---

## 4.8 Finding ↔ categorías operativas

### Relación
Un **Finding** puede convertirse en una o varias entidades operativas según su tipo.

### Conversión esperada
- Finding → TaskProposal
- Finding → Insight
- Finding → Alert
- Finding → FeedbackItem
- Finding → MetricSignal

### Regla
No todos los findings se convierten automáticamente en entidades finales.
Algunos solo quedan como hallazgo interpretado.

---

## 4.9 Finding ↔ TaskProposal

### Relación
- Un **Finding** de tipo accionable puede originar un **TaskProposal**.
- Un **TaskProposal** pertenece a un **Finding**.

### Propósito
Mantener separación entre:
- hallazgo detectado
- propuesta de tarea

### Regla crítica
La creación final de tareas requiere aprobación humana.

---

## 4.10 TaskProposal ↔ Task

### Relación
- Un **TaskProposal** puede convertirse en un **Task**.
- Un **Task** puede provenir de un solo **TaskProposal**.

### Propósito
Mantener trazabilidad entre propuesta y tarea definitiva.

### Estados sugeridos de TaskProposal
- proposed
- approved
- rejected
- edited_before_approval
- expired

---

## 4.11 Task ↔ Objective / KeyResult

### Relación
- Una **Task** puede vincularse opcionalmente a un **Objective**.
- Una **Task** puede vincularse opcionalmente a un **KeyResult**.
- Un **Objective** puede tener muchas **Tasks**.
- Un **KeyResult** puede tener muchas **Tasks**.

### Propósito
Conectar trabajo operativo con estrategia.

### Regla
La relación con Objective/KR puede ser:
- detectada automáticamente
- sugerida por el sistema
- corregida manualmente

---

## 4.12 Objective ↔ KeyResult

### Relación
- Un **Objective** tiene muchos **KeyResults**.
- Un **KeyResult** pertenece a un solo **Objective**.

### Propósito
Reflejar la estructura oficial de OKRs proveniente del Sheet vivo.

### Regla
Objective y KeyResult no son la fuente maestra dentro de Nexión.
Se sincronizan desde la fuente oficial externa.

---

## 4.13 Finding ↔ Insight

### Relación
- Un **Finding** puede materializarse en un **Insight**.
- Un **Insight** debe poder rastrearse a su **Finding** y a su **Source**.

### Propósito
Distinguir el hallazgo crudo de la entidad global o diaria de insight.

---

## 4.14 Finding ↔ Alert

### Relación
- Un **Finding** puede originar una **Alert**.
- Una **Alert** debe poder rastrearse al **Finding** y a la **Source**.

### Propósito
Permitir gestión operativa de riesgos, bugs o anomalías detectadas.

---

## 4.15 Finding ↔ FeedbackItem

### Relación
- Un **Finding** puede convertirse en un **FeedbackItem**.
- Un **FeedbackItem** debe mantener relación con su **Source** y con el **Analysis** que lo detectó.

### Propósito
Separar feedback operable del resumen general de una fuente.

---

## 4.16 Finding ↔ MetricSignal

### Relación
- Un **Finding** puede convertirse en un **MetricSignal**.
- Un **MetricSignal** pertenece a una fuente o consolidación.

### Propósito
Capturar métricas mencionadas o detectadas en contexto.

### Tipos de MetricSignal
- business_metric
- usability_metric
- adoption_metric
- objective_progress_signal

---

## 4.17 DaySummary ↔ Source / Analysis / Finding

### Relación
- Un **DaySummary** consolida múltiples **Sources**.
- Un **DaySummary** consolida múltiples **Analysis**.
- Un **DaySummary** consolida múltiples **Findings**.

### Propósito
Construir el contexto diario del módulo **Día** sin volver a analizar todo desde cero.

### Regla
El DaySummary es una entidad de consolidación, no una fuente original.

---

## 4.18 DaySummary ↔ TaskProposal / Insight / Alert / FeedbackItem / MetricSignal

### Relación
Un **DaySummary** puede agrupar:
- TaskProposals
- Insights
- Alerts
- FeedbackItems
- MetricSignals

### Propósito
Soportar tabs de:
- Día > Tareas generadas
- Día > Insights
- Día > Métricas
- Día > Alertas
- Día > Feedback

---

## 4.19 AutoUpdateRun ↔ UpdateProposal

### Relación
- Un **AutoUpdateRun** puede generar muchos **UpdateProposals**.
- Un **UpdateProposal** pertenece a una sola **AutoUpdateRun**.

### Propósito
Hacer visible la autoactualización diaria del sistema.

### Ejemplos de UpdateProposal
- cerrar alerta
- marcar riesgo como atendido
- actualizar insight
- actualizar feedback
- actualizar métrica
- sugerir cambio de estado de tarea

---

## 4.20 UpdateProposal ↔ entidades operativas

### Relación
Un **UpdateProposal** puede apuntar a una entidad objetivo:
- Task
- Alert
- Insight
- FeedbackItem
- MetricSignal

### Propósito
Guardar cambios propuestos antes de aplicarlos.

### Regla
No todos los cambios se aplican automáticamente.
Algunos requieren aprobación humana.

---

## 4.21 UpdateProposal ↔ ApprovalAction

### Relación
- Un **UpdateProposal** puede tener una o varias **ApprovalActions**.
- Una **ApprovalAction** pertenece a un solo **UpdateProposal**.

### Propósito
Mantener historial de aprobación, rechazo o edición.

### Tipos de ApprovalAction
- approved
- rejected
- approved_with_edits
- deferred

---

## 4.22 User ↔ ApprovalAction

### Relación
- Un **User** ejecuta muchas **ApprovalActions**.
- Una **ApprovalAction** debe registrar qué usuario la tomó.

### Propósito
Auditoría mínima y trazabilidad de decisiones humanas.

---

## 5. Relaciones críticas para trazabilidad

Estas relaciones no deben perderse en implementación:

1. **Task** debe poder llegar a:
   - TaskProposal
   - Finding
   - Analysis
   - Source

2. **Alert** debe poder llegar a:
   - Finding
   - Analysis
   - Source

3. **Insight** debe poder llegar a:
   - Finding
   - Analysis
   - Source

4. **FeedbackItem** debe poder llegar a:
   - Finding
   - Analysis
   - Source

5. **MetricSignal** debe poder llegar a:
   - Finding o consolidación
   - Analysis o DaySummary
   - Source cuando aplique

6. **Task** debe poder llegar a:
   - Objective y/o KeyResult cuando exista vínculo

---

## 6. Relaciones que deben activarse por release

## Release 1
Relaciones mínimas:
- Workspace ↔ User
- Workspace ↔ Source
- Source ↔ SourceRun
- SourceRun ↔ Analysis
- Analysis ↔ Finding
- DaySummary ↔ Source/Analysis/Finding

## Release 2
Se agregan:
- Finding ↔ TaskProposal
- TaskProposal ↔ Task
- DaySummary ↔ TaskProposal / Task

## Release 3
Se agregan:
- Task ↔ Objective
- Task ↔ KeyResult
- Objective ↔ KeyResult

## Release 4
Se agregan:
- Finding ↔ Insight
- Finding ↔ Alert
- Finding ↔ FeedbackItem
- Finding ↔ MetricSignal
- DaySummary ↔ Insight / Alert / FeedbackItem / MetricSignal

## Release 5
Se agregan:
- AutoUpdateRun ↔ UpdateProposal
- UpdateProposal ↔ entidades operativas
- UpdateProposal ↔ ApprovalAction
- User ↔ ApprovalAction

---

## 7. Reglas de integridad conceptual

1. Una fuente puede existir sin análisis, pero no al revés.
2. Un análisis puede existir sin tarea, pero una tarea derivada debe tener origen rastreable.
3. Objective y KeyResult pueden existir sin tareas, porque vienen de fuente externa.
4. DaySummary no reemplaza entidades base; solo consolida.
5. UpdateProposal no equivale a cambio aplicado.
6. Una tarea definitiva no debe nacer directo de IA sin pasar por TaskProposal y aprobación.
7. Si una entidad global nace del día, debe conservar referencia diaria y referencia de origen.

---

## 8. Preguntas abiertas para el siguiente nivel

Estas decisiones se resuelven en schema y servicios:

- si Insight, Alert, FeedbackItem y MetricSignal serán tablas separadas o una tabla tipada común
- si TaskProposal y UpdateProposal comparten infraestructura o viven aparte
- si DaySummary será persistido completo o calculado parcialmente
- cómo versionar cambios de Source sin duplicar todo el contenido
- cómo representar relaciones múltiples entre una tarea y varios hallazgos/fuentes

---

## 9. Regla para Claude Code y Antigravity

Este documento debe usarse como referencia para:
- diseñar el schema lógico
- definir contratos entre servicios
- modelar automatizaciones
- mantener trazabilidad entre fuente, análisis, propuestas, entidades finales y objetivos

No se deben crear relaciones simplificadas que rompan trazabilidad solo por conveniencia de implementación.
