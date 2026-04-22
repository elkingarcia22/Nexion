# Nexión — Implementation Roadmap
Version: v1.0
Status: Draft base
Owner: Product / Build System
Purpose: Definir el orden real de implementación de Nexión en fases y slices funcionales, alineando producto, arquitectura, documentación, automatización y build sobre repo.

---

## 1. Objetivo del documento

Este documento define:
- en qué orden debe construirse Nexión
- qué entra en cada fase
- qué dependencia tiene cada bloque
- qué output real debe validarse antes de avanzar
- cómo evitar construir demasiado pronto cosas que todavía no generan valor usable

No define todavía:
- fechas cerradas
- estimaciones exactas de esfuerzo
- asignación final por persona
- roadmap comercial o de lanzamiento

Su función es servir como guía operativa de ejecución para Claude Code, Antigravity y el equipo.

---

## 2. Principio general

Nexión debe construirse en capas de valor real, no en capas técnicas aisladas.

La regla no es:
- primero “todo backend”
- luego “todo frontend”
- luego “todo n8n”

La regla es:
**slice usable completo primero, profundidad después**

### Orden estructural correcto
1. base documental
2. shell del producto
3. primer flujo usable de fuente
4. propuestas de tarea
5. objetivos/KRs
6. métricas / insights / alertas
7. autoactualización madura
8. refinamiento global

---

## 3. Reglas del roadmap

### 3.1 Un paso a la vez
Cada fase debe producir un output verificable antes de abrir la siguiente.

### 3.2 Slice antes que infraestructura total
No construir toda la infraestructura final antes de validar el primer flujo funcional.

### 3.3 UI y datos deben avanzar con sentido
La shell visual puede existir pronto, pero cada bloque funcional debe conectarse con datos reales lo antes posible.

### 3.4 Nada crítico sin trazabilidad
Cada fase debe reforzar trazabilidad, no debilitarla.

### 3.5 No rehacer por cambio menor
Cada fase debe apoyarse en estructuras que puedan evolucionar sin resetear el proyecto.

---

## 4. Estado actual del proyecto

### Ya existe
- definición del producto
- arquitectura de información
- sistema de pantallas
- flujos principales
- modelo conceptual
- relaciones de datos
- motor de tareas
- motor del día
- modelo de métricas
- vínculo con OKRs
- procesamiento de fuentes
- arquitectura técnica
- integraciones y auth
- arquitectura de automatización
- schema lógico de Supabase
- contratos de servicios
- reglas de build
- convenciones de repo
- playbook de herramientas
- librería base de prompts
- pantallas visuales iniciales

### Ya existen también
- repo GitHub
- Supabase base
- n8n Cloud
- MCP GitHub
- MCP n8n
- Antigravity
- Claude Code

### Pendiente real
- llevar docs al repo si no están ya consolidados
- crear estructura real del codebase
- crear Vercel
- activar Google OAuth y Google APIs
- implementar primer slice funcional completo

---

## 5. Fase 0 — Fundación ejecutable

### Objetivo
Dejar el proyecto listo para construir sin ambigüedad estructural.

### Qué entra
- consolidar todos los documentos maestros
- subir docs al repo en `/docs`
- definir estructura inicial del repo
- definir `.env.example`
- dejar convenciones y roadmap visibles
- confirmar stack y estados de integraciones

### Output real esperado
- repo con carpeta `/docs`
- docs maestros disponibles para Claude Code y Antigravity
- estructura inicial del repo creada
- convención de trabajo cerrada

### No tocar todavía
- lógica completa de negocio
- workflows profundos de n8n
- integraciones de Google activas

### Criterio de cierre
El proyecto puede leerse y arrancarse sin depender del chat.

---

## 6. Fase 1 — Shell del producto

### Objetivo
Construir la estructura base visible de Nexión sobre el repo.

### Qué entra
- app web base
- layout general
- navegación lateral
- rutas principales
- login visual base
- pantallas base de:
  - Dashboard
  - Día
  - Tareas
  - Objetivos
  - Métricas
  - Insights
  - Alertas
- tabs internas del módulo Día

### Output real esperado
- frontend navegable
- shell visual coherente
- Día > Hoy como home operativo real
- placeholders estructurados donde aún no haya backend real

### Herramienta principal
- Antigravity + Claude Code

### Criterio de cierre
El producto ya se puede recorrer visualmente en el repo.

---

## 7. Fase 2 — Auth y acceso base

### Objetivo
Permitir entrada real al producto y preparar la base de identidad.

### Qué entra
- configuración de Supabase Auth
- login con Google
- creación/lectura de profile
- manejo básico de sesión
- redirect a Día > Hoy
- estado mínimo de integración/auth en UI

### Output real esperado
- usuario entra con Google
- sesión persiste
- perfil base existe en Supabase
- shell protegida funciona

### Dependencias
- proyecto Google OAuth
- configuración de Supabase Auth
- variables de entorno mínimas

### Criterio de cierre
Se puede entrar al producto con identidad real.

---

## 8. Fase 3 — Modelo de datos inicial y SQL base

### Objetivo
Crear el primer bloque real del dominio en Supabase.

### Qué entra
Tablas mínimas para Release 1:
- workspaces
- profiles
- workspace_memberships
- sources
- source_runs
- source_contents
- analyses
- findings
- day_summaries

### Output real esperado
- migraciones versionadas
- schema inicial aplicable
- relaciones mínimas funcionando
- lecturas básicas posibles desde frontend

### Herramienta principal
- Claude Code + SQL

### Criterio de cierre
El flujo de fuentes puede persistirse de extremo a extremo.

---

## 9. Fase 4 — Slice funcional 1: Añadir fuente y ver resultado

### Objetivo
Validar el primer flujo útil completo de Nexión.

### Qué entra
- Día > Fuentes conectado
- acción Añadir recurso
- Source Intake real
- Source Processing mínimo
- persistencia de estados
- resultado estructurado básico visible
- estados:
  - pending
  - processing
  - processed
  - error

### Caso de uso oficial
- reunión de feedback por link

### Output real esperado
El usuario:
1. entra al producto
2. pega un link
3. se registra la fuente
4. se procesa
5. ve una salida estructurada visible

### Dependencias
- schema base
- auth base
- primer workflow mínimo o procesamiento provisional

### Criterio de cierre
Release 1 funcional validado.

---

## 10. Fase 5 — Orquestación base en n8n

### Objetivo
Sacar el procesamiento del frontend y llevarlo al flujo correcto.

### Qué entra
Workflows mínimos:
- add-source-manual
- process-source
- reprocess-source básico

### Qué deben hacer
- registrar fuente
- validar acceso
- leer contenido
- llamar a IA
- persistir analysis/findings
- actualizar estado

### Output real esperado
- workflow funcional mínimo en n8n
- outputs reales revisables
- trazabilidad por corrida

### Regla
Trabajar workflow por workflow, nodo por nodo.

### Criterio de cierre
El flujo funcional 1 ya depende de orquestación real y no de hacks temporales.

---

## 11. Fase 6 — Capa de análisis real

### Objetivo
Activar el análisis automático estructurado con IA.

### Qué entra
- conexión inicial con Gemini API
- prompt base de análisis
- salida JSON estructurada
- chunking básico si hace falta
- mapeo output IA → analyses/findings

### Output real esperado
La fuente procesada ya devuelve:
- summary
- findings
- feedback
- insights
- alerts
- metric_signals
- task_proposals vacías o mínimas si aplica

### Regla
No crear tareas definitivas aquí.
Solo proponer.

### Criterio de cierre
Nexión ya analiza fuentes reales de manera consistente.

---

## 12. Fase 7 — Día > Hoy y consolidación diaria base

### Objetivo
Construir el verdadero home operativo con datos reales.

### Qué entra
- Day Engine mínimo
- day_summaries persistidos
- Día > Hoy conectado
- bloques base:
  - foco del día
  - tareas pendientes relevantes
  - alertas relevantes
  - estado del sistema
  - propuestas pendientes
- selector de fecha base

### Output real esperado
El usuario entra y ya ve contexto operativo real, no solo layout.

### Dependencias
- fuentes procesadas
- findings
- primer consolidado diario

### Criterio de cierre
Día > Hoy deja de ser maqueta y se vuelve lectura útil del día.

---

## 13. Fase 8 — Motor de propuestas de tarea

### Objetivo
Convertir hallazgos accionables en propuestas revisables.

### Qué entra
- task_proposals
- reglas mínimas de priorización
- UI de propuestas en Día > Tareas generadas
- exposición de propuestas en Día > Hoy cuando aplique

### Output real esperado
El sistema detecta accionables y los muestra como propuestas de tarea con contexto.

### Regla crítica
Aún no existen tareas definitivas sin aprobación.

### Criterio de cierre
El usuario ya puede ver trabajo sugerido por Nexión.

---

## 14. Fase 9 — Aprobación humana y módulo Tareas

### Objetivo
Pasar de propuesta a trabajo operable real.

### Qué entra
- approval_actions
- creación de task desde task_proposal aprobada
- módulo global Tareas
- cambio manual de estado
- edición básica
- trazabilidad origen → tarea

### Output real esperado
El usuario:
- revisa propuesta
- aprueba / edita / rechaza
- ve la tarea creada en Tareas

### Criterio de cierre
Release 2 funcional validado.

---

## 15. Fase 10 — Objetivos y KRs

### Objetivo
Conectar el trabajo con estrategia.

### Qué entra
- sync mínimo del Sheet oficial
- objectives
- key_results
- vínculos sugeridos o manuales
- módulo Objetivos base
- relación tarea ↔ objetivo/KR

### Output real esperado
El usuario puede ver:
- objetivos activos
- tareas vinculadas
- impacto básico del trabajo en objetivos

### Criterio de cierre
Release 3 funcional validado.

---

## 16. Fase 11 — Métricas, Insights y Alertas

### Objetivo
Madurar las categorías globales del sistema.

### Qué entra
- insights
- alerts
- feedback_items
- metric_signals
- metric_records
- tabs diarias conectadas
- módulos globales base:
  - Métricas
  - Insights
  - Alertas

### Output real esperado
Nexión ya no solo procesa fuentes y tareas.
También consolida señales de negocio, usabilidad, riesgos y patrones.

### Criterio de cierre
Release 4 funcional validado.

---

## 17. Fase 12 — Calendar Context

### Objetivo
Enriquecer Día > Hoy con capacidad real de agenda.

### Qué entra
- integración de Google Calendar
- lectura de reuniones del día
- cálculo de tiempo en reuniones
- cálculo de tiempo libre estimado
- bloque de agenda dentro de Día > Hoy
- señal reuniones vs trabajo disponible

### Output real esperado
El usuario puede entender cuánto tiempo tiene realmente para ejecutar.

### Criterio de cierre
Día > Hoy ya integra agenda real del usuario.

---

## 18. Fase 13 — Autoactualización madura

### Objetivo
Hacer que Nexión se mantenga vivo y visible sin volverse opaco.

### Qué entra
- auto_update_runs
- update_proposals
- corrida diaria a las 6 pm
- separación entre:
  - cambios aplicados automáticamente
  - propuestas pendientes de aprobación
- UI visible en Día > Hoy

### Output real esperado
El usuario entra al día siguiente y ve:
- qué se actualizó
- qué quedó propuesto
- qué debe aprobar

### Criterio de cierre
Release 5 funcional validado.

---

## 19. Fase 14 — Dashboard panorámico útil

### Objetivo
Convertir Dashboard en vista ejecutiva real.

### Qué entra
- señales globales resumidas
- carga operativa
- métricas globales clave
- alertas destacadas
- foco general del sistema

### Regla
No debe competir con Día > Hoy.
Debe complementar.

### Output real esperado
Dashboard sirve para lectura global rápida y creíble.

---

## 20. Fase 15 — Endurecimiento del producto

### Objetivo
Cerrar huecos operativos antes de escalar profundidad.

### Qué entra
- manejo de errores más robusto
- estados de integración visibles
- reproceso manual claro
- auditabilidad mínima mejorada
- refactor pequeños de calidad
- cleanup de mocks
- validación de entornos
- revisión de seguridad y variables

### Output real esperado
La base queda más estable para iterar o abrir uso a más personas.

---

## 21. Dependencias maestras entre fases

### No abrir Fase 4 sin:
- Fase 1
- Fase 2
- Fase 3 mínimas resueltas

### No abrir Fase 8/9 sin:
- Fase 4–7 operando

### No abrir Fase 10 sin:
- tareas ya funcionando

### No abrir Fase 13 sin:
- Day Engine y entidades principales vivas

### Regla
No construir profundidad estratégica o de automatización avanzada sin haber validado primero el flujo base.

---

## 22. Qué validar en cada fase

Cada fase debe devolver siempre alguno de estos outputs:
- pantalla funcionando
- migración aplicada
- workflow corriendo
- entidad persistida
- integración autenticada
- propuesta visible
- tarea aprobada
- resumen diario correcto

### Regla
Si una fase no produce output verificable, todavía no está cerrada.

---

## 23. Qué NO debe hacerse en paralelo demasiado pronto

No conviene abrir en paralelo, al inicio:
- Google Calendar + OKRs + métricas + autoactualización profunda
- todos los módulos globales con backend real
- todos los workflows de n8n
- todos los detalles de RLS
- toda la observabilidad avanzada

### Mejor
Primero:
- auth
- sources
- analysis
- day
- task proposal
- task approval

---

## 24. Orden recomendado inmediato desde hoy

Con el estado actual del proyecto, el orden correcto ahora es:

### Paso 1
Consolidar docs en repo y estructura del codebase.

### Paso 2
Crear shell base real del frontend en repo.

### Paso 3
Configurar auth con Supabase + Google.

### Paso 4
Crear SQL inicial del bloque Release 1.

### Paso 5
Implementar Día > Fuentes + Añadir recurso + estados.

### Paso 6
Conectar workflow mínimo de n8n para procesamiento.

### Paso 7
Conectar análisis IA mínimo.

### Paso 8
Persistir output y mostrar resultado estructurado.

Ese es el primer gran slice que debe cerrarse.

---

## 25. Regla para Claude Code y Antigravity

Este roadmap debe tratarse como la secuencia base de construcción de Nexión.

Si una herramienta propone construir algo fuera de orden:
1. evaluar si realmente desbloquea el slice actual
2. evitar abrir complejidad prematura
3. mantener la prioridad en el siguiente paso mínimo correcto

Toda implementación debe favorecer:
- slices completos
- outputs verificables
- construcción incremental
- trazabilidad
- capacidad de iterar sin rehacer el sistema
