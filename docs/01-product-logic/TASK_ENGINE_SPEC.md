# Nexión — Task Engine Spec
Version: v1.0
Status: Draft base
Owner: Product / Build System
Purpose: Definir cómo Nexión detecta, propone, crea, actualiza y da seguimiento a tareas derivadas de fuentes de información, manteniendo trazabilidad y aprobación humana.

---

## 1. Objetivo del documento

Este documento define:
- qué es una tarea dentro de Nexión
- cuándo algo se convierte en tarea propuesta
- qué diferencia hay entre hallazgo y tarea
- cómo se aprueban las tareas
- cómo se actualizan sus estados
- cómo se relacionan con objetivos, KRs y el contexto diario

No define todavía la implementación técnica final ni el esquema SQL definitivo.
Su función es fijar la lógica operativa del motor de tareas.

---

## 2. Principio general del motor de tareas

Nexión no crea tareas porque sí.
Primero analiza fuentes, detecta hallazgos y solo después propone trabajo operable.

La lógica base es:

**fuente → análisis → hallazgo → propuesta de tarea → aprobación humana → tarea definitiva → seguimiento**

### Regla crítica
La IA puede proponer tareas, pero **no puede crear tareas definitivas automáticamente**.
Toda tarea debe pasar por revisión humana antes de confirmarse como tarea real del sistema.

---

## 3. Qué es una tarea en Nexión

Una tarea es una unidad de trabajo operable que:
- requiere acción concreta
- tiene contexto suficiente
- puede asignarse, priorizarse y seguirse
- puede vincularse a un objetivo o KR
- tiene estado en el tiempo

### Una tarea no es:
- un comentario aislado
- una observación sin acción
- un insight puro
- una alerta sin trabajo derivado
- una nota sin responsable o sin siguiente paso

---

## 4. Diferencia entre hallazgo y tarea

## 4.1 Hallazgo
Es una unidad estructurada detectada por el análisis.
Puede ser:
- feedback
- insight
- alerta
- métrica detectada
- señal de oportunidad
- posible accionable

## 4.2 Tarea
Es trabajo ejecutable derivado de uno o varios hallazgos.

### Regla
- Todo hallazgo puede existir sin convertirse en tarea.
- Toda tarea debe poder rastrearse a al menos un hallazgo y, a través de él, a una fuente.

---

## 5. Cuándo algo debe convertirse en propuesta de tarea

Nexión debe proponer una tarea cuando detecte al menos una de estas condiciones:

1. existe una acción explícita mencionada en la fuente
2. hay una instrucción o siguiente paso claro
3. se detecta una urgencia temporal explícita
4. aparece una necesidad de seguimiento concreta
5. existe un problema que requiere resolución operativa
6. hay un cambio de prioridad o diseño que exige trabajo posterior
7. una alerta requiere acción correctiva
8. una decisión tomada necesita implementación

### Ejemplos típicos
- “esto debe salir hoy”
- “hay que revisar el funnel de activación”
- “ajustar el flujo antes del viernes”
- “crear propuesta de rediseño de permisos”
- “validar causa de la baja completitud”

---

## 6. Qué debe contener una propuesta de tarea

Toda propuesta de tarea debe incluir, como mínimo:

- título sugerido
- descripción breve
- fuente de origen
- hallazgo(s) de origen
- prioridad sugerida
- fecha sugerida si existe
- razón de la propuesta
- objetivo o KR sugerido si aplica
- estado inicial: **pendiente de aprobación**

### Regla de calidad
Si la propuesta no tiene suficiente claridad para ser entendida y aprobada, no debe presentarse como tarea sólida; debe quedarse como hallazgo o propuesta débil.

---

## 7. Fuentes de señal para crear tareas

Una tarea puede nacer desde:

- una fuente individual procesada
- el resumen consolidado del día
- una alerta detectada
- una propuesta de autoactualización
- una necesidad detectada al comparar métricas o objetivos

### Regla
El origen siempre debe quedar trazado.
Toda tarea debe poder responder:
- de dónde salió
- por qué existe
- qué la disparó

---

## 8. Priorización de tareas

La prioridad de una tarea no debe ser arbitraria.
Debe construirse con base en estas señales:

1. **objetivo/KR relacionado**
2. **urgencia explícita detectada**
3. **fecha mencionada o deadline cercano**
4. **impacto operativo esperado**
5. **impacto en riesgo/alerta**
6. **impacto en métrica o resultado clave**

### Prioridades base
- alta
- media
- baja

### Regla operativa
La prioridad sugerida por el sistema puede ajustarse manualmente antes o después de aprobar la tarea.

---

## 9. Estados oficiales de tarea

Los estados oficiales definidos para Nexión son:

- **por iniciar**
- **completada**
- **incompleta**
- **en pausa**
- **deprecada**

### Definición de cada estado

#### Por iniciar
La tarea existe, fue aprobada y todavía no se ha completado.

#### Completada
La tarea ya fue atendida o finalizada.

#### Incompleta
La tarea no pudo completarse como se esperaba o quedó parcialmente resuelta de forma no suficiente.

#### En pausa
La tarea sigue siendo válida, pero se detiene temporalmente.

#### Deprecada
La tarea deja de tener sentido o prioridad y no debe seguir activa.

---

## 10. Ciclo de vida de una tarea

### Etapa 1 — Detección
Nexión detecta un posible accionable.

### Etapa 2 — Propuesta
El sistema genera una propuesta de tarea.

### Etapa 3 — Revisión humana
El usuario puede:
- aprobar
- editar y aprobar
- rechazar

### Etapa 4 — Creación definitiva
Si se aprueba, la propuesta se convierte en tarea real.

### Etapa 5 — Seguimiento
La tarea vive en:
- Día > Tareas generadas (contexto diario)
- Tareas (módulo global)

### Etapa 6 — Actualización
La tarea puede cambiar de estado manualmente o recibir propuesta de cambio por autoactualización.

---

## 11. Aprobación humana

La aprobación humana es obligatoria antes de crear tareas definitivas.

### Acciones permitidas sobre una propuesta
- aprobar tal como está
- editar antes de aprobar
- rechazar
- posponer revisión

### Qué debe poder revisar el usuario
- título
- descripción
- prioridad
- fecha sugerida
- objetivo/KR sugerido
- origen de la propuesta
- razón por la cual se propuso

### Regla
Toda aprobación debe quedar trazada a un usuario y a un momento.

---

## 12. Relación entre tareas y objetivos/KRs

Una tarea puede:
- no tener objetivo relacionado
- apuntar a un objetivo
- apuntar idealmente a un KR específico

### Regla de negocio
Si el sistema puede inferir relación con un objetivo o KR, debe proponerla.
Pero la vinculación también puede corregirse manualmente.

### Valor de esta relación
Permite responder:
- qué trabajo mueve qué objetivo
- cuánto del trabajo del día empuja resultados estratégicos
- qué tareas no están alineadas con objetivos

---

## 13. Relación entre tareas y el módulo Día

## 13.1 Día > Hoy
Debe mostrar:
- tareas críticas del día
- tareas pendientes relevantes
- propuestas de tarea pendientes de aprobación

## 13.2 Día > Tareas generadas
Debe mostrar:
- tareas propuestas del día
- tareas aprobadas generadas a partir del día
- origen de cada tarea
- estado de aprobación y prioridad

### Regla
El módulo Día trabaja con el subconjunto diario.
El módulo global Tareas trabaja con el universo completo.

---

## 14. Relación entre tareas y autoactualización

La corrida diaria puede:
- proponer cambio de estado de una tarea
- proponer cierre de tarea
- proponer marcar una tarea como deprecada
- proponer una tarea nueva derivada del consolidado del día

### Regla crítica
Los cambios sensibles deben poder aprobarse.
En especial:
- creación de tareas
- cierre automático de tareas
- deprecación automática

### Cambios más seguros
Más adelante podrían existir cambios automáticos aplicados sin aprobación en casos muy controlados, pero no deben asumirse en esta fase.

---

## 15. Atributos conceptuales mínimos de una tarea

Toda tarea debe contemplar conceptualmente estos campos:

- id
- título
- descripción
- estado
- prioridad
- fecha objetivo opcional
- fecha de creación
- origen
- tipo de origen
- hallazgo(s) vinculados
- fuente(s) vinculadas
- usuario que aprobó
- objetivo relacionado opcional
- KR relacionado opcional
- contexto del día si aplica
- bandera de propuesta pendiente / aprobada / rechazada

---

## 16. Tipos de tarea sugeridos

Como clasificación interna opcional futura, las tareas podrían distinguirse por tipo:

- investigación
- análisis
- diseño
- validación
- coordinación
- seguimiento
- corrección
- implementación

### Regla
No es obligatorio activar esta profundidad desde Release 2, pero conviene dejarla prevista.

---

## 17. Qué no debe hacer el motor de tareas

El motor de tareas no debe:
- convertir todo feedback en tarea
- crear tareas sin contexto trazable
- crear tareas definitivas sin revisión humana
- mezclar insights con tareas sin criterio
- ocultar el origen o la razón de una tarea
- deprecar o cerrar tareas automáticamente sin visibilidad

---

## 18. Núcleo mínimo por release

## Release 1
No requiere motor completo de tareas.
Solo puede existir detección mínima conceptual de accionables.

## Release 2
Se vuelve obligatorio:
- propuesta de tareas
- aprobación humana
- creación de tareas definitivas
- vista diaria de tareas generadas
- módulo global básico de tareas

## Release 3
Se vuelve obligatorio:
- relación con objetivos y KRs
- prioridad influida por estrategia

## Release 4+
Se puede profundizar en:
- autoactualización más madura
- más tipos de tarea
- más automatización del ciclo de vida

---

## 19. Preguntas abiertas para documentos siguientes

Estas preguntas pasan a especificaciones posteriores:
- si la prioridad será enum simple o score compuesto
- si habrá asignación explícita de responsable
- si existirá fecha límite y fecha recomendada por separado
- si el sistema sugerirá esfuerzo o duración
- si habrá subtareas
- cómo se verá la auditoría de cambios de estado
- qué reglas exactas permiten cierre/deprecación sugerida

---

## 20. Regla para Claude Code y Antigravity

Este documento define el comportamiento funcional del motor de tareas de Nexión.

Toda implementación debe respetar estas reglas:
- la tarea nace desde contexto y trazabilidad
- la IA propone, el humano aprueba
- el día muestra tareas del contexto diario
- el módulo global Tareas gestiona el universo completo
- prioridades y estados no deben inventarse fuera de este marco sin decisión explícita del proyecto
