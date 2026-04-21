# Nexión — Automation Architecture
Version: v1.0
Status: Draft base
Owner: Product / Build System
Purpose: Definir la arquitectura de automatización de Nexión para orquestar fuentes, corridas diarias, análisis por IA, sincronización con sistemas externos, propuestas pendientes y consolidación del contexto operativo.

---

## 1. Objetivo del documento

Este documento define:
- qué automatizaciones existen en Nexión
- qué rol cumple n8n dentro del sistema
- qué workflows principales deben existir
- cómo se separan triggers, procesamiento, análisis, consolidación y aprobación
- qué corre automáticamente y qué requiere intervención humana
- cómo deben convivir automatización, persistencia y experiencia de usuario

---

## 2. Principio general

Nexión automatiza el trabajo repetitivo de detectar fuentes, leerlas, analizarlas, estructurar resultados, consolidar el día, proponer cambios y actualizar el sistema.

La lógica general es:
**trigger → lectura/validación → análisis → persistencia → consolidación → propuesta/aplicación → visibilidad en producto**

### Regla principal
La automatización debe: reducir trabajo manual, mantener trazabilidad, evitar reprocesamiento innecesario, hacer visible lo que cambió, dejar decisiones sensibles bajo control humano.

---

## 3. Rol de n8n

n8n es el orquestador principal del sistema.

### Qué debe resolver
- triggers, schedules, lectura de fuentes externas, validación de accesos, preprocesamiento básico, llamadas a la capa de IA, escritura/actualización en Supabase, sincronización de OKRs/KRs, consolidación del Day Engine, creación de propuestas pendientes de aprobación, observabilidad mínima de corridas

### Qué NO debe resolver por sí solo
- experiencia de usuario final, persistencia estructurada principal, creación automática definitiva de tareas sin aprobación humana

---

## 4. Capas de la automatización

1. **Capa de disparo**: acción manual, cambio detectado, corrida programada, reproceso manual
2. **Capa de ingestión**: lee, registra y valida fuentes
3. **Capa de análisis**: envía contenido a la IA y recibe salidas estructuradas
4. **Capa de persistencia**: guarda resultados y estados en Supabase
5. **Capa de consolidación**: construye el contexto diario
6. **Capa de propuestas / aprobación**: genera cambios pendientes de revisión humana
7. **Capa de observabilidad**: registra qué workflow corrió, qué procesó, qué falló

---

## 5. Workflow 01 — Ingreso manual de fuente

### Disparador
El usuario añade una fuente desde la UI usando Añadir recurso.

### Pasos lógicos
1. registrar la fuente en Supabase
2. validar formato del link
3. identificar tipo/origen si es posible
4. dejar la fuente en estado inicial
5. disparar análisis inicial si aplica de inmediato
6. actualizar la vista de Día > Fuentes

### Regla
El frontend no debe hacer el análisis por sí mismo. Debe disparar la automatización.

---

## 6. Workflow 02 — Procesamiento de una fuente

### Disparador
- fuente nueva, fuente modificada, reproceso manual, corrida diaria que detecta desactualización

### Pasos lógicos
1. verificar acceso a la fuente
2. leer contenido o metadata necesaria
3. normalizar contenido
4. detectar si requiere chunking
5. llamar al motor de IA
6. persistir analysis + findings
7. actualizar estado de la fuente
8. generar propuestas si aplica
9. marcar entidades diarias afectadas para consolidación

### Salidas posibles
- resumen, findings, insights, alertas, feedback, señales métricas, task proposals, vínculos sugeridos con objetivos/KRs

---

## 7. Workflow 03 — Reproceso manual de fuente

### Regla
El reproceso no debe borrar trazabilidad histórica.

---

## 8. Workflow 04 — Corrida diaria del sistema

### Disparador oficial
Corrida programada diaria después de las **6:00 pm**.

### Pasos lógicos
1. consultar fuentes nuevas/cambiadas
2. evitar reprocesar lo no modificado
3. lanzar análisis necesarios
4. consolidar resultados del día
5. revisar tareas, alertas, insights, feedback y métricas
6. separar cambios automáticos vs propuestas pendientes
7. actualizar DaySummary
8. registrar AutoUpdateRun
9. generar UpdateProposals si corresponde

### Resultado esperado
Cuando el usuario abra Día > Hoy debe entender: qué se procesó, qué cambió, qué se actualizó automáticamente, qué propuestas están pendientes.

---

## 9. Workflow 05 — Sincronización de OKRs/KRs

### Fuente
Google Sheet oficial de OKRs/KRs.

### Regla
Nexión no sobrescribe la fuente maestra de OKRs. Solo la consume y sincroniza.

---

## 10. Workflow 06 — Sincronización de Calendar

### Objetivo
Enriquecer el Day Engine con agenda real.

### Regla
Calendar aporta contexto. No define por sí solo la prioridad operativa.

---

## 11. Workflow 07 — Generación de propuestas de tarea

### Regla crítica
No crear Task definitiva en automático.

---

## 12. Workflow 08 — Aprobación humana de tareas propuestas

### Resultado esperado
Toda tarea definitiva tiene trazabilidad completa: propuesta, fuente, hallazgo, usuario aprobador, fecha de aprobación.

---

## 13. Workflow 09 — Autoactualización de entidades

### Regla crítica
Cambios sensibles no se aplican silenciosamente.

---

## 14. Workflow 10 — Consolidación del Day Engine

### Regla
El Day Engine debe depender de consolidación persistida o semipersistida, no de recálculo completo en cada carga de pantalla.

---

## 15. Organización recomendada de workflows

### A. Source workflows
- add_source_manual, process_source, reprocess_source

### B. Daily workflows
- daily_run, day_summary_refresh, dashboard_refresh

### C. Sync workflows
- sync_okrs, sync_calendar, sync_metric_sources (futuro)

### D. Proposal workflows
- generate_task_proposals, generate_update_proposals, approve_task_proposal, approve_update_proposal

### E. Utility workflows
- error_recovery, retry_processing, stale_source_check

### Regla
Workflows pequeños y claros son mejores que un único mega-workflow.

---

## 16. Relación con releases

- Release 1: add_source_manual, process_source, estado de procesamiento, consolidación básica del día
- Release 2: generate_task_proposals, approve_task_proposal, mejor trazabilidad de corridas
- Release 3: sync_okrs, vínculo operativo con objetivos/KRs
- Release 4: consolidación más madura de métricas, insights y alertas
- Release 5: autoactualización más robusta, calendar sync madura, day summary y dashboard más inteligentes

---

## 17. Regla para Claude Code y Antigravity

Toda implementación debe respetar:
- n8n como orquestador principal
- Supabase como fuente estructurada
- IA como servicio de análisis
- trazabilidad completa
- aprobación humana para tareas definitivas
- automatización visible y comprensible para el usuario
