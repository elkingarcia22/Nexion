# Nexión — Day Engine Spec
Version: v1.0
Status: Draft base
Owner: Product / Build System
Purpose: Definir cómo funciona el motor del módulo Día, especialmente la vista Día > Hoy, la consolidación diaria, la autoactualización y la relación entre fuentes, análisis, propuestas y operación cotidiana.

---

## 1. Objetivo del documento

Este documento define:
- qué es el motor del día en Nexión
- cómo se construye el contexto diario
- qué muestra Día > Hoy
- cómo se alimentan las tabs internas de Día
- cómo funciona la autoactualización diaria
- qué cambios puede aplicar el sistema y cuáles requieren aprobación humana

No define todavía:
- workflows técnicos nodo por nodo
- SQL final
- prompts finales de IA
- detalle de APIs

Su función es alinear producto, datos, automatización y desarrollo alrededor del centro operativo real de Nexión.

---

## 2. Principio general del Day Engine

El Day Engine es la capa que convierte el trabajo del sistema en una experiencia operativa diaria.

Su lógica es:
- reunir lo que entró hoy o cambió hoy
- consolidarlo en un contexto diario útil
- mostrar qué requiere atención
- hacer visible qué actualizó el sistema automáticamente
- proponer acciones o cambios pendientes de aprobación
- preparar al usuario para operar mejor el día

### Regla principal
**Día > Hoy** es el home operativo real de Nexión.
No es una pantalla decorativa ni un dashboard genérico.
Debe ser una vista accionable del presente.

---

## 3. Qué resuelve el Day Engine

Sin esta capa, el usuario tendría que reconstruir manualmente:
- qué fuentes llegaron hoy
- qué cambió hoy
- qué tareas surgieron
- qué alertas se activaron
- qué métricas se movieron
- qué reuniones tiene
- cuánto tiempo real tiene para trabajar
- qué decisiones o aprobaciones tiene pendientes

El Day Engine existe para resolver eso automáticamente y mostrarlo de forma clara.

---

## 4. Entradas principales del Day Engine

El motor del día se alimenta de estas entradas:

### 4.1 Fuentes del día
- fuentes añadidas manualmente
- fuentes detectadas automáticamente
- fuentes modificadas o reprocesadas hoy

### 4.2 Resultados de análisis
- resúmenes
- hallazgos
- tareas propuestas
- insights
- alertas
- feedback
- señales métricas

### 4.3 Estado operativo del sistema
- cambios aplicados automáticamente
- propuestas pendientes de aprobación
- corridas ejecutadas
- errores relevantes

### 4.4 Agenda del usuario
- reuniones del calendario
- bloques ocupados
- bloques disponibles
- proporción reuniones vs trabajo disponible

### 4.5 Entidades persistentes relacionadas
- tareas abiertas
- alertas activas
- objetivos/KRs vinculados
- métricas consolidadas cuando aplique

---

## 5. Salidas principales del Day Engine

El Day Engine debe producir dos niveles de salida:

### 5.1 Salida visible al usuario
Reflejada en:
- Día > Hoy
- Día > Fuentes
- Día > Resumen del análisis
- Día > Tareas generadas
- Día > Insights
- Día > Métricas
- Día > Alertas
- Día > Feedback

### 5.2 Salida estructurada para el sistema
- day summary consolidado
- propuestas pendientes de aprobación
- actualizaciones automáticas aplicadas
- agrupaciones diarias por categoría
- señales para Dashboard y módulos globales

---

## 6. Día > Hoy

## 6.1 Rol de la pantalla
Día > Hoy es la pantalla más importante de Nexión.
Debe responder, al entrar:
- qué está en foco hoy
- qué debo atender primero
- qué reuniones tengo
- cuánto tiempo tengo realmente disponible
- qué cambió automáticamente
- qué me está proponiendo el sistema
- qué conviene hacer ahora

## 6.2 Bloques esperados
La pantalla debe contemplar, como mínimo:

### A. Foco del día
Resumen corto de lo más importante del día.

### B. Tareas pendientes prioritarias
Lista breve de tareas abiertas con mayor urgencia o impacto.

### C. Alertas importantes
Alertas activas o riesgos que requieren atención inmediata.

### D. Reuniones del calendario
Lista del día con hora, duración y contexto mínimo.

### E. Tiempo en reuniones vs tiempo disponible de trabajo
Lectura clara del balance del día.

### F. Recomendación o propuesta de organización del día
Bloques sugeridos de foco, ventanas útiles para trabajo y prioridades.

### G. Estado de autoactualización del sistema
Debe mostrar:
- última actualización
- qué se actualizó automáticamente
- próxima corrida esperada

### H. Propuestas pendientes de aprobación
Debe mostrar cambios propuestos que requieren revisión humana.

---

## 7. Tabs internas del módulo Día

## 7.1 Hoy
Home operativo real.
Muestra consolidado, foco, agenda, autoactualización y aprobaciones.

## 7.2 Fuentes
Muestra:
- fuentes del día
- estado por fuente
- entrada manual por link
- acceso al detalle procesado

## 7.3 Resumen del análisis
Muestra síntesis diaria de lo procesado.
Debe ser lectura rápida, no documento largo.

## 7.4 Tareas generadas
Muestra:
- tareas propuestas del día
- tareas aprobadas hoy
- tareas pendientes de revisión

## 7.5 Insights
Muestra hallazgos interpretativos del día.

## 7.6 Métricas
Muestra señales cuantitativas detectadas o actualizadas en el día.

## 7.7 Alertas
Muestra riesgos, bugs, problemas o anomalías relevantes del día.

## 7.8 Feedback
Muestra feedback consolidado del día, agrupado por fuente, tema o producto cuando aplique.

---

## 8. Qué significa “día” en Nexión

Un día en Nexión no es solo una fecha en calendario.
Es una unidad operativa que agrupa:
- fuentes asociadas a esa fecha
- análisis procesados en esa fecha
- salidas detectadas en esa fecha
- agenda del usuario para esa fecha
- cambios automáticos ocurridos en esa fecha
- aprobaciones pendientes relevantes para esa fecha

### Regla
El usuario debe poder navegar a días anteriores y ver su contexto diario sin perder trazabilidad.

---

## 9. Cambio de día

El Day Engine debe soportar selector de fecha.

### Qué debe pasar al cambiar de día
- cambia el contexto diario completo
- cambian fuentes, tareas generadas, insights, métricas, alertas y feedback del día
- cambia el resumen operativo
- cambia el estado de autoactualización correspondiente a esa fecha

### Regla UX
Cambiar de fecha no debe sentirse como entrar a otro módulo.
Sigue siendo el mismo módulo Día, con contexto diferente.

---

## 10. Autoactualización diaria

## 10.1 Objetivo
Mantener vivo el sistema sin depender de actualización manual constante.

## 10.2 Frecuencia inicial
- una corrida diaria después de las 6:00 pm

## 10.3 Qué revisa la corrida
- nuevas fuentes
- fuentes modificadas
- tareas abiertas
- alertas activas
- insights existentes
- feedback existente
- métricas del sistema
- vínculos con objetivos cuando aplique

## 10.4 Qué puede generar
### Cambios aplicados automáticamente
Ejemplos:
- actualizar resumen del día
- marcar una fuente como procesada
- consolidar señales del día
- refrescar bloques de foco o estado del día

### Propuestas pendientes de aprobación
Ejemplos:
- cerrar una alerta
- cambiar el estado de una tarea
- consolidar un insight
- actualizar feedback
- actualizar una señal métrica relevante
- crear una tarea nueva a partir de hallazgos

## 10.5 Regla crítica
La autoactualización puede sugerir y en ciertos casos aplicar cambios menores, pero no debe crear tareas definitivas sin aprobación humana.

---

## 11. Qué puede cambiar sola la plataforma

Con la corrida diaria, Nexión puede:
- recalcular el resumen del día
- refrescar el foco del día
- recalcular distribución de tiempo del día
- reagrupar fuentes del día
- actualizar vistas derivadas del día
- marcar ciertos hallazgos como atendidos si la evidencia es clara
- proponer cierres o cambios de estado

### Regla
Todo cambio relevante debe quedar visible al usuario.
No debe existir automatización opaca.

---

## 12. Qué requiere aprobación humana

Deben pasar por aprobación humana, como mínimo:
- creación definitiva de tareas
- cambios sensibles en estado de tareas
- cierres de alertas relevantes
- cambios interpretativos fuertes en insights
- cambios donde la confianza del sistema sea baja

### Estado visual requerido
Estas propuestas deben verse principalmente en:
- Día > Hoy
- Día > Tareas generadas
- y donde aplique, en la vista específica relacionada

---

## 13. Foco del día

El foco del día no es una lista cualquiera.
Es una síntesis de prioridad operativa.

### Debe construirse usando
- tareas más importantes abiertas
- alertas activas
- agenda del día
- capacidad real de trabajo disponible
- urgencias detectadas en nuevas fuentes
- prioridades relacionadas con objetivos/KRs

### Salida esperada
Una recomendación simple y accionable de qué debe estar primero hoy.

---

## 14. Relación con Google Calendar

El Day Engine debe integrarse con calendario para enriquecer Día > Hoy.

### Qué debe usar
- reuniones del día
- duración de reuniones
- bloques ocupados
- huecos disponibles
- total tiempo bloqueado en reuniones

### Qué debe producir
- resumen de agenda del día
- comparación entre tiempo de reuniones y tiempo libre
- sugerencia de ventanas para trabajo profundo
- contexto para la recomendación de organización del día

### Regla
El calendario en Nexión no es un fin en sí mismo.
Es una fuente de contexto operativo para preparar el día.

---

## 15. Relación con fuentes del día

Las fuentes del día son una entrada central del Day Engine.

### Reglas
- una fuente nueva debe impactar el contexto del día
- una fuente reanalizada debe poder actualizar el día
- una fuente con error debe seguir siendo visible en el día
- el día no debe depender de una sola fuente, sino del conjunto

---

## 16. Relación con tareas

El Day Engine debe mostrar tareas en dos niveles:

### A. Tareas pendientes importantes
Dentro de Día > Hoy.
Sirven para foco diario.

### B. Tareas generadas hoy
Dentro de Día > Tareas generadas.
Sirven para revisar accionables nuevos o propuestos.

### Regla
No toda tarea relevante del día fue creada hoy.
Y no toda tarea creada hoy es necesariamente prioritaria.
El motor del día debe distinguir eso.

---

## 17. Relación con métricas

El Day Engine no reemplaza el módulo global de métricas.

### Dentro del día debe mostrar
- métricas mencionadas hoy
- señales métricas nuevas o actualizadas hoy
- cambios relevantes respecto al último punto conocido

### Regla
La vista diaria de métricas es contextual y operativa.
La vista global de métricas es consolidada y comparativa.

---

## 18. Relación con insights y alertas

## 18.1 Insights del día
Sirven para detectar patrones y señales interpretativas recientes.

## 18.2 Alertas del día
Sirven para priorizar riesgos, bugs y bloqueos inmediatos.

### Regla
Insight y alerta no son equivalentes.
Un insight interpreta.
Una alerta exige atención.

---

## 19. Resumen del análisis del día

El sistema debe poder consolidar el análisis del día en una síntesis legible.

### Debe responder
- qué se procesó
- qué entendió Nexión
- qué cambió
- qué requiere acción
- qué señal cuantitativa apareció
- qué feedback o alertas se consolidaron

### Regla
El resumen no debe ser una narración larga.
Debe ser una pieza operativa, clara y jerarquizada.

---

## 20. Estados que debe manejar el Day Engine

A nivel de pantalla y sistema, el motor del día debe poder convivir con:
- sin datos para el día
- fuentes pendientes
- procesamiento en curso
- día parcialmente actualizado
- día actualizado
- error en alguna fuente
- propuestas pendientes de aprobación

### Regla
El día debe poder seguir siendo útil incluso si no todo se procesó perfecto.

---

## 21. Entidades que el Day Engine debe consumir

Como mínimo, el Day Engine se alimenta de:
- DaySummary
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
- AutoUpdateRun
- UpdateProposal
- ApprovalAction
- CalendarEvent

---

## 22. Entidades que el Day Engine debe producir o actualizar

Puede producir o actualizar:
- DaySummary
- agrupaciones diarias por categoría
- foco del día
- propuesta de organización del día
- propuestas pendientes de aprobación
- resumen del análisis
- señales visibles para Dashboard

---

## 23. Relación con releases

### Release 1
Debe existir la base de:
- Día > Hoy (versión inicial)
- Día > Fuentes
- consolidación simple del día
- visualización de estado del día

### Release 2
Debe agregar:
- tareas generadas
- propuestas de tarea con aprobación humana

### Release 3
Debe agregar:
- vínculos con objetivos/KRs en contexto diario

### Release 4
Debe agregar:
- métricas, insights y alertas diarias más maduras

### Release 5
Debe agregar:
- autoactualización robusta
- organización del día más inteligente
- Dashboard más conectado al Day Engine

---

## 24. Reglas fijas

1. Día > Hoy es el home operativo real.
2. El sistema debe hacer visible la autoactualización.
3. El usuario debe poder distinguir entre cambios aplicados y propuestas pendientes.
4. El día debe combinar agenda, fuentes, análisis y foco operativo.
5. Las tareas propuestas requieren aprobación humana antes de ser definitivas.
6. El motor del día debe servir tanto para hoy como para días anteriores.

---

## 25. Elementos flexibles

Pueden cambiar con aprendizaje:
- fórmula exacta del foco del día
- lógica de organización automática del día
- peso relativo entre agenda, tareas y alertas
- detalle de bloques dentro de Día > Hoy
- nivel de automatización que puede aplicar cambios sin aprobación

---

## 26. Regla para Claude Code y Antigravity

Este documento debe usarse como fuente de verdad para construir el módulo Día.

Ninguna pantalla, flujo o servicio relacionado con el módulo Día debe contradecir estas reglas sin registrar antes una nueva decisión del proyecto.
