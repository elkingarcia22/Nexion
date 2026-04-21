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

---

## 2. Principio general

Nexión debe construirse en capas de valor real, no en capas técnicas aisladas.

La regla es: **slice usable completo primero, profundidad después**

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

## 3. Estado actual del proyecto

### Ya existe
- definición del producto, arquitectura de información, sistema de pantallas, flujos principales, modelo conceptual, relaciones de datos, motor de tareas, motor del día, modelo de métricas, vínculo con OKRs, procesamiento de fuentes, arquitectura técnica, integraciones y auth, arquitectura de automatización, schema lógico de Supabase, contratos de servicios, reglas de build, convenciones de repo, playbook de herramientas, librería base de prompts, pantallas visuales iniciales

### Ya existen también
- repo GitHub, Supabase base, n8n Cloud, MCP GitHub, MCP n8n, Antigravity, Claude Code

### Pendiente real
- llevar docs al repo si no están ya consolidados
- crear estructura real del codebase
- crear Vercel
- activar Google OAuth y Google APIs
- implementar primer slice funcional completo

---

## 4. Fase 0 — Fundación ejecutable

### Objetivo
Dejar el proyecto listo para construir sin ambigüedad estructural.

### Qué entra
- consolidar todos los documentos maestros
- subir docs al repo en `/docs`
- definir estructura inicial del repo
- definir `.env.example`
- dejar convenciones y roadmap visibles

### Criterio de cierre
El proyecto puede leerse y arrancarse sin depender del chat.

---

## 5. Fase 1 — Shell del producto

### Objetivo
Construir la estructura base visible de Nexión sobre el repo.

### Qué entra
- app web base, layout general, navegación lateral, rutas principales, login visual base
- pantallas base de: Dashboard, Día, Tareas, Objetivos, Métricas, Insights, Alertas
- tabs internas del módulo Día

### Criterio de cierre
El producto ya se puede recorrer visualmente en el repo.

---

## 6. Fase 2 — Auth y acceso base

### Objetivo
Permitir entrada real al producto y preparar la base de identidad.

### Qué entra
- configuración de Supabase Auth, login con Google, creación/lectura de profile, manejo básico de sesión, redirect a Día > Hoy

### Criterio de cierre
Se puede entrar al producto con identidad real.

---

## 7. Fase 3 — Modelo de datos inicial y SQL base

### Objetivo
Crear el primer bloque real del dominio en Supabase.

### Tablas mínimas para Release 1
- workspaces, profiles, workspace_memberships, sources, source_runs, source_contents, analyses, findings, day_summaries

### Criterio de cierre
El flujo de fuentes puede persistirse de extremo a extremo.

---

## 8. Fase 4 — Slice funcional 1: Añadir fuente y ver resultado

### Objetivo
Validar el primer flujo útil completo de Nexión.

### Qué entra
- Día > Fuentes conectado, acción Añadir recurso, Source Intake real, Source Processing mínimo, persistencia de estados (pending, processing, processed, error), resultado estructurado básico visible

### Caso de uso oficial
- reunión de feedback por link

### Criterio de cierre
Release 1 funcional validado.

---

## 9. Fase 5 — Orquestación base en n8n

### Workflows mínimos
- add-source-manual, process-source, reprocess-source básico

### Criterio de cierre
El flujo funcional 1 ya depende de orquestación real y no de hacks temporales.

---

## 10. Fase 6 — Capa de análisis real

### Objetivo
Activar el análisis automático estructurado con IA.

### Qué entra
- conexión inicial con Gemini API, prompt base de análisis, salida JSON estructurada, chunking básico si hace falta, mapeo output IA → analyses/findings

### Criterio de cierre
Nexión ya analiza fuentes reales de manera consistente.

---

## 11. Fase 7 — Día > Hoy y consolidación diaria base

### Objetivo
Construir el verdadero home operativo con datos reales.

### Qué entra
- Day Engine mínimo, day_summaries persistidos, Día > Hoy conectado, bloques base, selector de fecha base

### Criterio de cierre
Día > Hoy deja de ser maqueta y se vuelve lectura útil del día.

---

## 12. Fase 8 — Motor de propuestas de tarea

### Criterio de cierre
El usuario ya puede ver trabajo sugerido por Nexión.

---

## 13. Fase 9 — Aprobación humana y módulo Tareas

### Criterio de cierre
Release 2 funcional validado.

---

## 14. Fase 10 — Objetivos y KRs

### Criterio de cierre
Release 3 funcional validado.

---

## 15. Fase 11 — Métricas, Insights y Alertas

### Criterio de cierre
Release 4 funcional validado.

---

## 16. Fases 12–15

- Fase 12 — Calendar Context: Google Calendar integrado en Día > Hoy con agenda real y tiempo disponible
- Fase 13 — Autoactualización madura: auto_update_runs, update_proposals, corrida diaria 6pm visible. Release 5 validado.
- Fase 14 — Dashboard panorámico útil: lectura ejecutiva global, complementa Día > Hoy
- Fase 15 — Endurecimiento: errores robustos, estados integración, reproceso manual, cleanup de mocks

---

## 17. Orden recomendado inmediato desde hoy

1. Consolidar docs en repo y estructura del codebase
2. Crear shell base real del frontend en repo
3. Configurar auth con Supabase + Google
4. Crear SQL inicial del bloque Release 1
5. Implementar Día > Fuentes + Añadir recurso + estados
6. Conectar workflow mínimo de n8n para procesamiento
7. Conectar análisis IA mínimo
8. Persistir output y mostrar resultado estructurado

---

## 18. Regla para Claude Code y Antigravity

Este roadmap debe tratarse como la secuencia base de construcción de Nexión.

Toda implementación debe favorecer:
- slices completos
- outputs verificables
- construcción incremental
- trazabilidad
- capacidad de iterar sin rehacer el sistema
