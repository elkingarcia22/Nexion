# Nexión — Screen System Spec
Version: v1.0
Status: Draft base
Owner: Product / Build System
Purpose: Definir el sistema de pantallas de Nexión para diseño, desarrollo y construcción incremental en Antigravity / Claude Code.

---

## 1. Objetivo del documento

Este documento define:
- qué pantallas existen en Nexión
- cuál es el propósito de cada una
- qué nivel de profundidad funcional tienen hoy
- qué relación tienen con los releases
- qué estados base deben contemplar

Su función es alinear diseño, producto y desarrollo para que la plataforma pueda crecer sin rehacer la estructura visual.

---

## 2. Principio general del sistema de pantallas

Nexión se organiza en dos capas de navegación:

### A. Capa operativa diaria
Representada por el módulo:
- **Día**

Y, dentro de este:
- **Hoy** como home operativo real
- tabs internas para recorrer lo que entra, se analiza y se convierte en trabajo durante el día

### B. Capa global de profundidad
Representada por módulos globales visibles:
- Dashboard
- Tareas
- Objetivos
- Métricas
- Insights
- Alertas

La primera capa responde a la operación del presente.
La segunda responde a consolidación, histórico, seguimiento y lectura transversal.

---

## 3. Navegación principal visible

La navegación visible principal del sistema es:

- Dashboard
- Día
- Tareas
- Objetivos
- Métricas
- Insights
- Alertas

### Regla de jerarquía
- **Dashboard** = vista panorámica / ejecutiva
- **Día > Hoy** = home operativo real
- **Resto de módulos** = profundidad y gestión por entidad o categoría

---

## 4. Sistema de pantallas maestro

## 4.1 Acceso

### Pantalla 01 — Login con Google
**Propósito**
Permitir acceso seguro al sistema y dar contexto sobre permisos e integración con Google.

**Debe mostrar**
- branding de Nexión
- explicación breve del producto
- CTA principal de continuar con Google
- contexto de permisos y acceso a fuentes

**Profundidad actual**
Visual aprobada como base temporal.

---

## 4.2 Módulos globales

### Pantalla 02 — Dashboard
**Propósito**
Dar una lectura panorámica y ejecutiva del sistema.

**Debe mostrar**
- estado general del día y del sistema
- resumen de carga operativa
- reuniones vs tiempo de trabajo
- alertas relevantes
- foco general
- accesos hacia Día > Hoy y módulos globales

**Regla**
No es el home operativo principal.

---

### Pantalla 03 — Tareas (global)
**Propósito**
Gestionar todas las tareas del sistema.

**Debe mostrar**
- listado global de tareas
- estado
- prioridad
- fecha
- objetivo relacionado
- origen/fuente
- edición y seguimiento

---

### Pantalla 04 — Objetivos (global)
**Propósito**
Dar seguimiento a objetivos y KRs del trimestre.

**Debe mostrar**
- objetivos activos
- progreso
- tareas vinculadas
- señales de impacto
- relación con fuentes / hallazgos / trabajo

---

### Pantalla 05 — Métricas (global)
**Propósito**
Mostrar métricas globales de negocio y usabilidad.

**Debe mostrar**
- métricas prioritarias
- comparativos
- tendencia reciente
- relación con objetivos
- contexto interpretativo

**Regla**
No mezclar con Insights.

---

### Pantalla 06 — Insights (global)
**Propósito**
Mostrar hallazgos estructurados y patrones relevantes del sistema.

**Debe mostrar**
- insights consolidados
- agrupación por tema / producto / fuente
- relación con alertas, feedback o tareas

---

### Pantalla 07 — Alertas (global)
**Propósito**
Concentrar alertas, riesgos, bugs y señales prioritarias.

**Debe mostrar**
- alertas activas
- severidad
- fecha
- fuente
- estado
- seguimiento

---

## 4.3 Módulo Día

### Pantalla 08 — Día > Hoy
**Propósito**
Ser el home operativo real del usuario.

**Debe responder**
- qué está en foco hoy
- qué tareas pendientes requieren atención
- qué alertas son importantes
- qué reuniones tengo hoy
- cuánto tiempo tengo en reuniones vs trabajo
- qué cambió automáticamente
- qué está pendiente de aprobación
- cómo conviene organizar el día

**Bloques esperados**
- foco del día
- tareas críticas
- alertas críticas
- reuniones del calendario
- tiempo ocupado vs tiempo disponible
- propuesta de organización del día
- estado de autoactualización
- propuestas pendientes de aprobación

---

### Pantalla 09 — Día > Fuentes
**Propósito**
Mostrar las fuentes del día y permitir su entrada y procesamiento.

**Debe mostrar**
- listado de fuentes del día
- filtros ligeros
- añadir recurso
- analizar fuentes del día
- estado por fuente
- acceso a detalle / resultado estructurado

**Estado actual**
Visual base ya definida.

---

### Pantalla 10 — Día > Resumen del análisis
**Propósito**
Presentar una síntesis estructurada de lo procesado en el día.

**Debe mostrar**
- resumen ejecutivo del día
- temas clave
- hallazgos principales
- decisiones detectadas
- cambios relevantes

---

### Pantalla 11 — Día > Tareas generadas
**Propósito**
Mostrar tareas propuestas o creadas a partir de fuentes del día.

**Debe mostrar**
- tareas generadas hoy
- prioridad
- origen
- objetivo vinculado si aplica
- estado de aprobación / creación

**Regla**
La creación definitiva de tareas debe pasar por revisión humana.

---

### Pantalla 12 — Día > Insights
**Propósito**
Mostrar insights del contexto diario.

**Debe mostrar**
- patrones detectados hoy
- hallazgos interpretativos
- conexiones entre fuentes y señales

---

### Pantalla 13 — Día > Métricas
**Propósito**
Mostrar señales métricas detectadas o actualizadas durante el día.

**Debe mostrar**
- métricas mencionadas hoy
- cambios respecto a punto anterior si existen
- contexto mínimo de lectura

---

### Pantalla 14 — Día > Alertas
**Propósito**
Mostrar alertas o riesgos del día.

**Debe mostrar**
- alertas nuevas
- alertas actualizadas
- riesgos atendidos
- propuestas de cierre o cambio de estado

---

### Pantalla 15 — Día > Feedback
**Propósito**
Mostrar feedback consolidado del día como categoría propia.

**Debe mostrar**
- feedback agrupado
- fuente de origen
- producto o tema asociado
- recurrencia si aplica

---

## 5. Pantallas de soporte transversales

### Pantalla 16 — Añadir recurso
**Propósito**
Permitir ingresar manualmente una fuente mediante link.

**Regla UX**
- formulario mínimo
- idealmente un solo campo principal: link
- autocompletar lo demás cuando sea posible

### Pantalla 17 — Estado de procesamiento
**Propósito**
Mostrar el estado de una fuente durante análisis.

### Pantalla 18 — Error / acceso inválido
**Propósito**
Explicar claramente por qué una fuente no pudo procesarse.

### Pantalla 19 — Propuesta pendiente de aprobación
**Propósito**
Mostrar cambios sugeridos por el sistema antes de aplicarlos.

---

## 6. Estados base del sistema visual

Toda pantalla relevante debe poder convivir con estos estados visuales base cuando aplique:

- vacío
- cargando / procesando
- listo
- error
- parcialmente actualizado
- pendiente de aprobación
- sin datos para el día

---

## 7. Relación entre pantallas y releases

### Release 1
Se enfoca en:
- Login
- Día > Hoy (base)
- Día > Fuentes
- Añadir recurso
- Estado de procesamiento
- Error
- resultado estructurado básico

### Release 2
Agrega:
- Día > Tareas generadas
- Tareas global
- aprobación humana de tareas sugeridas

### Release 3
Agrega:
- Objetivos global
- relación tarea ↔ objetivo / KR

### Release 4
Agrega:
- Métricas global
- Insights global
- Alertas global
- mayor profundidad diaria en esas tabs

### Release 5
Agrega:
- Dashboard más potente
- autoactualización visible más madura
- mayor organización automática del día

---

## 8. Regla de diseño del sistema visual

Nexión debe verse como una plataforma completa, pero no debe aparentar que toda su profundidad funcional ya existe.

### Esto sí debe verse
- sistema cohesivo
- navegación estable
- centro operativo claro
- módulos globales coherentes
- escalabilidad sin rehacer estructura

### Esto no debe parecer
- un dashboard vacío genérico
- una herramienta solo de reuniones
- una app saturada de analítica decorativa
- una plataforma con módulos falsamente maduros

---

## 9. Prioridad de revisión de pantallas

Orden recomendado de diseño/revisión:
1. Login
2. Día > Hoy
3. Día > Fuentes
4. Día > Resumen del análisis
5. Día > Tareas generadas
6. Dashboard
7. Tareas global
8. Objetivos global
9. Métricas global
10. Insights global
11. Alertas global

---

## 10. Regla para Claude Code y Antigravity

Este documento define el sistema de pantallas de referencia.

Toda implementación debe:
- respetar esta jerarquía
- diferenciar bien home operativo vs vistas globales
- evitar crear nuevas pantallas innecesarias sin decisión previa
- mantener la consistencia entre diseño y alcance real de release