# Nexión — Project Master Brief
Version: v1.1
Status: Approved base
Owner: Product / Build System
Purpose: Documento madre de contexto para Claude Code, Antigravity y cualquier agente o desarrollador que participe en la construcción de Nexión.

---

## 1. Qué es Nexión

Nexión es una plataforma de gestión basada en fuentes de información.

Su función es centralizar fuentes, analizarlas, convertir hallazgos en trabajo operable, conectarlos con objetivos y dar visibilidad operativa del día y del sistema en general.

Nexión no es solo una herramienta para reuniones.
Las reuniones de feedback son el primer caso de uso priorizado, pero el producto está diseñado para trabajar con múltiples fuentes de información.

---

## 2. Problema que resuelve

Hoy la información importante del trabajo diario está dispersa en:
- reuniones
- notas
- transcripciones
- documentos
- hojas de cálculo
- métricas
- fuentes manuales

Eso genera varios problemas:
- falta de trazabilidad
- dificultad para convertir información en acción
- pérdida de contexto entre reuniones y ejecución
- baja visibilidad sobre qué está en foco hoy
- poca conexión entre trabajo diario y objetivos/KRs
- tiempo excesivo en seguimiento manual

Nexión busca resolver eso transformando fuentes dispersas en:
- claridad operativa
- tareas y accionables
- seguimiento
- contexto estratégico
- visibilidad diaria

---

## 3. Objetivo principal del producto

Construir una plataforma que permita:

1. centralizar fuentes de información
2. analizarlas automáticamente o con aprobación humana
3. convertir hallazgos en tareas, insights, alertas, feedback y métricas
4. conectar ese trabajo con objetivos y KRs
5. preparar al usuario para operar mejor su día

---

## 4. Objetivo principal de la experiencia

El home operativo real del producto debe ser:

**Día > Hoy**

Ese espacio debe responder:
- qué está en foco hoy
- qué tareas y alertas requieren atención
- qué reuniones tengo hoy
- cuánto tiempo tengo en reuniones vs tiempo de trabajo disponible
- qué cambios detectó el sistema
- qué actualizaciones fueron aplicadas automáticamente
- qué propuestas necesitan aprobación
- cómo conviene organizar el día

---

## 5. Qué NO es Nexión

Nexión no es:
- un simple dashboard
- una herramienta solo de reuniones
- un repositorio pasivo de notas
- un gestor de tareas genérico desconectado de contexto
- un sistema centrado únicamente en reporting

---

## 6. Usuarios principales

### Usuario principal inicial
Profesional de producto / diseño / operación que:
- participa en múltiples reuniones
- trabaja con muchas fuentes dispersas
- necesita convertir información en tareas y seguimiento
- necesita claridad diaria y conexión con objetivos

### Usuarios potenciales posteriores
- PMs
- Product Designers
- Product Ops
- Research Ops
- líderes funcionales
- equipos con alto volumen de coordinación y seguimiento

---

## 7. Casos de uso principales

### Caso de uso inicial
Ingresar una fuente tipo reunión de feedback mediante link, procesarla y mostrar una salida estructurada.

### Casos de uso siguientes
- procesar múltiples fuentes del día
- generar tareas propuestas
- detectar alertas
- detectar insights
- actualizar métricas
- vincular tareas con objetivos/KRs
- mostrar cambios automáticos del día
- sugerir organización del día según calendario, foco y carga operativa

---

## 8. Navegación visible del producto

La navegación principal visible de Nexión es:

- Dashboard
- Día
- Tareas
- Objetivos
- Métricas
- Insights
- Alertas

### Regla de navegación
- Dashboard = vista global ejecutiva/panorámica
- Día = centro operativo del sistema
- Día > Hoy = home operativo real
- los demás módulos = vistas globales de profundidad y seguimiento

---

## 9. Tabs internas del módulo Día

Dentro de Día deben existir:

- Hoy
- Fuentes
- Resumen del análisis
- Tareas generadas
- Insights
- Métricas
- Alertas
- Feedback

Estas tabs representan el ciclo operativo diario.

---

## 10. Categorías principales del sistema

Nexión debe soportar como categorías principales:

- tarea
- insight
- alerta
- métrica
- feedback

---

## 11. Estados de tarea

Los estados oficiales de tarea son:

- por iniciar
- completada
- incompleta
- en pausa
- deprecada

---

## 12. Autoactualización del sistema

### Frecuencia inicial
- una corrida diaria después de las 6:00 pm

### Regla operativa
El sistema puede proponer cambios automáticamente, pero el usuario debe poder:
- ver qué se autoactualizó
- ver qué quedó pendiente de aprobación
- aprobar o rechazar propuestas relevantes

### Regla operativa adicional
Toda tarea propuesta por la IA deberá pasar por revisión humana antes de confirmarse.

---

## 13. Releases propuestos

### Release 1
Ingresar fuente por link y obtener salida estructurada visible

### Release 2
Convertir hallazgos en tareas/accionables propuestos

### Release 3
Vincular tareas y hallazgos con objetivos/KRs

### Release 4
Consolidar métricas, insights y alertas

### Release 5
Potenciar Dashboard y lógica de autoactualización del día

---

## 14. Stack base del producto

### Activo hoy
- GitHub repo: sí
- Supabase proyecto base: sí
- n8n Cloud: sí
- MCP GitHub: sí
- MCP n8n: sí

### Planeado / no activo aún
- Google OAuth
- Google Drive integration
- Google Docs integration
- Google Sheets integration
- Google Calendar integration
- Vercel project
- Gemini API
- Slack integration (opcional/futuro)

---

## 15. Principios fijos del proyecto

1. construir incrementalmente
2. diseñar para el estado final sin rehacer innecesariamente
3. priorizar claridad operativa sobre complejidad
4. separar home operativo diario de vistas globales
5. minimizar trabajo manual del usuario
6. preferir SQL y estructuras reproducibles sobre configuración manual
7. mantener trazabilidad entre fuente, hallazgo, tarea, objetivo y estado
8. trabajar paso a paso con validación real

---

## 16. Regla para Claude Code y Antigravity

Este documento debe tratarse como fuente madre de contexto.
Ninguna decisión estructural importante debe contradecir este brief sin registrarse primero como decisión nueva o ajuste formal del proyecto.
