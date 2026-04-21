# Nexión — Domain Model
Version: v1.0
Status: Draft base
Owner: Product / Build System
Purpose: Definir el modelo conceptual del dominio de Nexión para alinear producto, datos, automatización, backend y construcción.

---

## 1. Principio general del dominio

Nexión convierte **fuentes de información** en **salidas estructuradas y operables**.

La lógica central del dominio es:

**fuente → análisis → hallazgos → propuestas/acciones → seguimiento → impacto en objetivos**

---

## 2. Entidades núcleo del sistema

### Usuario
Persona que usa Nexión. Sirve para autenticación, ownership, aprobaciones y trazabilidad de acciones.

### Fuente
Cualquier recurso de información que entra a Nexión: nota de reunión, transcripción, documento, sheet, recurso de Drive. Es el punto de entrada base del sistema.

**Atributos principales:** tipo, origen, link/referencia, fecha, estado de procesamiento, workspace_id, contexto del día.

### Análisis
Resultado del procesamiento estructurado de una fuente. Produce: resumen, temas clave, hallazgos, propuestas de tarea, insights, alertas, métricas, feedback.

Regla: Una fuente puede tener uno o varios análisis.

### Hallazgo
Unidad estructurada de información detectada por el análisis. Puede ser: insight, alerta, feedback, métrica, propuesta de tarea, señal de cambio.

Regla: No todo hallazgo se convierte en tarea.

### Tarea
Trabajo operable derivado de fuentes/hallazgos.

Estados: por iniciar | completada | incompleta | en pausa | deprecada.

Regla crítica: La IA puede **proponer** tareas, pero la creación definitiva requiere aprobación humana.

### Insight
Hallazgo interpretativo o patrón relevante. Insight interpreta; métrica cuantifica. No son lo mismo.

### Alerta
Señal que requiere atención prioritaria: bug crítico, riesgo activo, bloqueo.

### Métrica
Dato cuantitativo relevante. Tiene dos niveles: métrica diaria (señal detectada en el día) y métrica global (indicador consolidado de negocio).

### Feedback
Comentario, observación, dolor, sugerencia o percepción expresada en una fuente. No todo feedback es tarea. Es una categoría propia.

### Objetivo
Objetivo de negocio del trimestre. La fuente de verdad vive fuera de Nexión (Google Sheets). Nexión la consume y enriquece.

### Key Result (KR)
Resultado clave asociado a un objetivo. Una tarea puede apuntar a un KR.

### Propuesta pendiente de aprobación
Cambio sugerido por el sistema que no debe aplicarse sin validación humana: creación de tarea, cambio de estado, cierre de alerta.

### Día
Contenedor operativo del contexto diario. Agrupa: fuentes, tareas, insights, métricas, alertas, feedback, agenda, estado de autoactualización.

### Dashboard
Vista panorámica global del sistema para lectura ejecutiva.

---

## 3. Relaciones conceptuales principales

- Fuente → Análisis (uno a muchos)
- Análisis → Hallazgos (uno a muchos)
- Hallazgo → Categoría (insight | alerta | métrica | feedback | propuesta de tarea)
- Hallazgo → Tarea (vía propuesta + aprobación)
- Tarea → Objetivo / KR (opcional)
- Todo → Día (toda actividad ubicable en contexto diario)
- Todo → Usuario (trazabilidad de creator/approver)

---

## 4. Núcleo mínimo por release

### Release 1
Usuario, Fuente, Análisis, Hallazgo, Día, Propuesta pendiente (mínima)

### Release 2
Tarea, relación hallazgo → tarea, aprobación humana

### Release 3
Objetivo, KR, relación tarea ↔ objetivo/KR

### Release 4
Insight global, Alert global, FeedbackItem global, MetricSignal

### Release 5
AutoUpdateRun, UpdateProposal, ApprovalAction

---

## 5. Reglas estructurales del dominio

1. Toda información importante debe poder rastrearse a su fuente.
2. La IA propone, pero no decide sola la creación definitiva de tareas.
3. El día es una capa de operación, no solo de visualización.
4. Dashboard no reemplaza Día > Hoy.
5. Insights y métricas deben modelarse por separado.
6. El sistema debe distinguir entre cambios aplicados y cambios propuestos.
7. Los objetivos viven fuera como fuente maestra.
