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

No define todavía:
- nodos exactos por workflow
- credenciales reales
- prompts finales del modelo
- payloads HTTP finales
- SQL detallado

Su función es fijar la lógica de automatización del producto antes de implementación técnica fina.

---

## 2. Principio general

Nexión automatiza el trabajo repetitivo de:
- detectar fuentes
- leerlas
- analizarlas
- estructurar resultados
- consolidar el día
- proponer cambios
- actualizar el sistema

La lógica general es:

**trigger → lectura/validación → análisis → persistencia → consolidación → propuesta/aplicación → visibilidad en producto**

### Regla principal
La automatización debe:
- reducir trabajo manual
- mantener trazabilidad
- evitar reprocesamiento innecesario
- hacer visible lo que cambió
- dejar decisiones sensibles bajo control humano

---

## 3. Rol de n8n dentro de Nexión

n8n es el orquestador principal del sistema.

### Qué debe resolver
- triggers por horario o eventos
- lectura de fuentes externas
- validación de accesos
- preprocesamiento básico
- llamadas a la capa de IA
- escritura/actualización en Supabase
- sincronización de OKRs/KRs
- consolidación del Day Engine
- creación de propuestas pendientes de aprobación
- observabilidad mínima de corridas

### Qué NO debe resolver por sí solo
- experiencia de usuario final
- persistencia estructurada principal
- lógica de negocio profunda escondida en nodos sin documentación
- creación automática definitiva de tareas sin aprobación humana

---

## 4. Capas de la automatización

## 4.1 Capa de disparo
Activa workflows por:
- acción manual del usuario
- cambio detectado en fuente
- corrida programada
- reproceso manual

## 4.2 Capa de ingestión
Lee, registra y valida fuentes.

## 4.3 Capa de análisis
Envía contenido a la IA y recibe salidas estructuradas.

## 4.4 Capa de persistencia
Guarda resultados y estados en Supabase.

## 4.5 Capa de consolidación
Construye el contexto diario y actualiza vistas derivadas.

## 4.6 Capa de propuestas / aprobación
Genera cambios pendientes de revisión humana.

## 4.7 Capa de observabilidad
Registra qué workflow corrió, qué procesó, qué falló y qué cambió.

---

## 5. Tipos de automatización del sistema

Nexión necesita cuatro familias principales de automatización:

1. **Automatizaciones de fuentes**
2. **Automatizaciones de análisis**
3. **Automatizaciones de consolidación diaria**
4. **Automatizaciones de sincronización externa**

---

## 6. Workflow 01 — Ingreso manual de fuente

### Disparador
El usuario añade una fuente desde la UI usando **Añadir recurso**.

### Entrada
- link del recurso
- usuario
- workspace
- fecha/contexto

### Pasos lógicos
1. registrar la fuente en Supabase
2. validar formato del link
3. identificar tipo/origen si es posible
4. dejar la fuente en estado inicial
5. disparar análisis inicial si aplica de inmediato
6. actualizar la vista de Día > Fuentes

### Resultado esperado
La fuente existe en el sistema con trazabilidad y queda lista para procesamiento.

### Regla
El frontend no debe hacer el análisis por sí mismo.
Debe disparar la automatización.

---

## 7. Workflow 02 — Procesamiento de una fuente

### Disparador
- fuente nueva
- fuente modificada
- reproceso manual
- corrida diaria que detecta desactualización

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
- resumen
- findings
- insights
- alertas
- feedback
- señales métricas
- task proposals
- vínculos sugeridos con objetivos/KRs

---

## 8. Workflow 03 — Reproceso manual de fuente

### Disparador
El usuario decide reprocesar una fuente.

### Casos típicos
- error previo
- contenido cambiado
- extracción incompleta
- análisis desactualizado
- criterio nuevo de procesamiento

### Pasos lógicos
1. crear nueva corrida de source run
2. volver a leer/extractar
3. volver a analizar
4. versionar o reemplazar análisis según regla posterior
5. actualizar estado y trazabilidad
6. reinyectar cambios a la consolidación diaria

### Regla
El reproceso no debe borrar trazabilidad histórica.

---

## 9. Workflow 04 — Corrida diaria del sistema

### Disparador oficial
Corrida programada diaria después de las **6:00 pm**.

### Objetivos
- revisar qué cambió hoy
- procesar fuentes nuevas o modificadas
- consolidar el contexto del día
- generar autoactualizaciones y propuestas
- dejar el sistema listo para el siguiente ingreso del usuario

### Pasos lógicos
1. consultar fuentes nuevas/cambiadas
2. evitar reprocesar lo no modificado
3. lanzar análisis necesarios
4. consolidar resultados del día
5. revisar tareas, alertas, insights, feedback y métricas
6. separar:
   - cambios aplicables automáticamente
   - cambios que deben quedar como propuesta pendiente
7. actualizar DaySummary
8. registrar AutoUpdateRun
9. generar UpdateProposals si corresponde

### Resultado esperado
Cuando el usuario abra **Día > Hoy**, debe entender:
- qué se procesó
- qué cambió
- qué se actualizó automáticamente
- qué propuestas están pendientes

---

## 10. Workflow 05 — Sincronización de OKRs/KRs

### Disparador
- corrida diaria
- refresco manual
- cambios relevantes detectados en fuente viva externa

### Fuente
Google Sheet oficial de OKRs/KRs.

### Pasos lógicos
1. leer hoja oficial
2. mapear estructura mínima
3. normalizar objetivos y KRs
4. actualizar representación interna en Supabase
5. marcar diferencias relevantes
6. refrescar contexto de vínculos en tareas y métricas si aplica

### Regla
Nexión no sobrescribe la fuente maestra de OKRs.
Solo la consume y sincroniza.

---

## 11. Workflow 06 — Sincronización de Calendar

### Disparador
- corrida diaria
- refresco al abrir Día > Hoy en fases posteriores si aplica
- actualización puntual programada en ventana del día

### Objetivo
Enriquecer el Day Engine con agenda real.

### Pasos lógicos
1. leer eventos del día del usuario
2. calcular tiempo en reuniones
3. calcular bloques libres estimados
4. persistir resumen útil para DaySummary
5. alimentar foco y recomendación del día

### Regla
Calendar aporta contexto.
No define por sí solo la prioridad operativa.

---

## 12. Workflow 07 — Generación de propuestas de tarea

### Disparador
Findings accionables detectados por el análisis.

### Pasos lógicos
1. evaluar si un finding cumple criterio de accionable
2. construir TaskProposal
3. sugerir prioridad, fecha y objetivo/KR si aplica
4. guardar TaskProposal
5. exponerla en:
   - Día > Tareas generadas
   - Día > Hoy si requiere atención inmediata

### Regla crítica
No crear Task definitiva en automático.

---

## 13. Workflow 08 — Aprobación humana de tareas propuestas

### Disparador
El usuario aprueba, edita o rechaza una TaskProposal.

### Pasos lógicos
1. leer TaskProposal
2. registrar ApprovalAction
3. si aprueba:
   - crear Task definitiva
4. si aprueba con edición:
   - actualizar propuesta / crear Task con cambios
5. si rechaza:
   - cerrar propuesta como rechazada
6. refrescar vistas de Día y módulo Tareas

### Resultado esperado
Toda tarea definitiva tiene trazabilidad completa:
- propuesta
- fuente
- hallazgo
- usuario aprobador
- fecha de aprobación

---

## 14. Workflow 09 — Autoactualización de entidades

### Disparador
Corrida diaria o regla específica del sistema.

### Entidades afectables
- Task
- Alert
- Insight
- FeedbackItem
- MetricSignal

### Tipos de cambio posibles
- cambio de estado sugerido
- cierre sugerido
- consolidación sugerida
- actualización de contexto o severidad
- actualización cuantitativa

### Regla operativa
El sistema debe distinguir entre:
- cambios aplicados automáticamente
- cambios propuestos pendientes de aprobación

### Regla crítica
Cambios sensibles no se aplican silenciosamente.

---

## 15. Workflow 10 — Consolidación del Day Engine

### Disparador
- finalización de análisis de fuente
- corrida diaria
- actualización de agenda
- aprobación relevante
- cambio de entidad que afecte el día

### Pasos lógicos
1. reunir fuentes del día
2. reunir analyses y findings relevantes
3. reunir tareas propuestas / tareas abiertas importantes
4. reunir alertas, métricas, insights y feedback del día
5. reunir datos de agenda
6. construir DaySummary
7. actualizar bloques visibles de:
   - Día > Hoy
   - Resumen del análisis
   - tabs internas del día

### Regla
El Day Engine debe depender de consolidación persistida o semipersistida, no de recálculo completo en cada carga de pantalla.

---

## 16. Workflow 11 — Actualización de Dashboard

### Disparador
- corrida diaria
- cambio importante en métricas/alertas/foco
- consolidación diaria completada

### Pasos lógicos
1. leer DaySummary actual
2. leer métricas globales
3. leer alertas relevantes
4. leer señales ejecutivas
5. actualizar estado panorámico del sistema

### Regla
Dashboard no necesita la misma frecuencia o granularidad que Día.
Debe priorizar lectura ejecutiva, no hiperreactividad.

---

## 17. Pipeline de análisis con IA

### Disparador
Workflow de procesamiento de fuente.

### Secuencia recomendada
1. extracción de contenido
2. limpieza/preprocesamiento
3. chunking si es necesario
4. llamada al modelo
5. análisis parcial o total
6. consolidación del output
7. persistencia estructurada

### Salida estructurada esperada
- summary
- findings
- proposed_tasks
- alerts
- metrics
- feedback
- insights
- objective_link_suggestions

### Regla
El pipeline debe ser incremental y tolerante a límites de texto.

---

## 18. Estrategia para textos largos

La automatización debe soportar:
- chunking
- análisis por partes
- consolidación posterior
- detección de cambios para no reprocesar todo

### Regla técnica funcional
No mandar indiscriminadamente todos los documentos completos en cada corrida.

### Objetivo
Reducir:
- uso innecesario de tokens
- latencia
- fallos por contexto
- costo futuro

---

## 19. Estados operativos que debe registrar la automatización

### Para fuentes
- pending
- processing
- processed
- error
- needs_review
- outdated

### Para propuestas
- proposed
- approved
- rejected
- edited
- pending_review

### Para corridas
- queued
- running
- completed
- partial_success
- failed

### Regla
Todo workflow importante debe poder dejar estado auditable.

---

## 20. Errores que la automatización debe contemplar

- fuente inaccesible
- formato inválido
- extracción fallida
- timeout de IA
- respuesta inválida del modelo
- error de escritura en Supabase
- error de sincronización de Google
- error de credenciales
- conflicto al consolidar

### Regla
El sistema debe registrar:
- error interno técnico
- mensaje útil para producto cuando aplique
- entidad afectada
- corrida afectada

---

## 21. Observabilidad mínima de automatización

Cada workflow importante debe registrar:
- fecha y hora
- trigger
- usuario si aplica
- entidades afectadas
- éxito o error
- duración aproximada
- cambios aplicados
- propuestas generadas

### Regla
Sin esto, la autoactualización se vuelve opaca y difícil de confiar.

---

## 22. Qué NO debe hacer la arquitectura de automatización

Nexión no debe:
- esconder automatizaciones críticas dentro del frontend
- crear tareas definitivas sin aprobación humana
- reprocesar todo todos los días
- aplicar cambios relevantes sin trazabilidad
- depender de una única corrida monolítica imposible de mantener
- acoplar toda la lógica del producto a n8n sin documentación externa

---

## 23. Organización recomendada de workflows

La arquitectura debería terminar separando workflows por familias:

### A. Source workflows
- add_source_manual
- process_source
- reprocess_source

### B. Daily workflows
- daily_run
- day_summary_refresh
- dashboard_refresh

### C. Sync workflows
- sync_okrs
- sync_calendar
- sync_metric_sources (futuro)

### D. Proposal workflows
- generate_task_proposals
- generate_update_proposals
- approve_task_proposal
- approve_update_proposal

### E. Utility workflows
- error_recovery
- retry_processing
- stale_source_check

### Regla
Workflows pequeños y claros son mejores que un único mega-workflow.

---

## 24. Relación con releases

### Release 1
Debe existir, como mínimo:
- add_source_manual
- process_source
- estado de procesamiento
- consolidación básica del día

### Release 2
Debe agregar:
- generate_task_proposals
- approve_task_proposal
- mejor trazabilidad de corridas

### Release 3
Debe agregar:
- sync_okrs
- vínculo operativo con objetivos/KRs

### Release 4
Debe agregar:
- consolidación más madura de métricas, insights y alertas
- update proposals más ricos

### Release 5
Debe agregar:
- autoactualización más robusta
- calendar sync madura
- day summary y dashboard más inteligentes

---

## 25. Regla para Claude Code y Antigravity

Este documento debe usarse como fuente de verdad para construir la capa de automatización de Nexión.

Toda implementación debe respetar:
- n8n como orquestador principal
- Supabase como fuente estructurada
- IA como servicio de análisis
- trazabilidad completa
- aprobación humana para tareas definitivas
- automatización visible y comprensible para el usuario
