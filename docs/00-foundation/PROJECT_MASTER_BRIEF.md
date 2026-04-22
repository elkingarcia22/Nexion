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

Estas categorías pueden venir de una fuente analizada o de una actualización automática del sistema.

---

## 11. Estados de tarea

Los estados oficiales de tarea son:

- por iniciar
- completada
- incompleta
- en pausa
- deprecada

La prioridad de una tarea debe depender de:
- objetivo/KR relacionado
- urgencia detectada en la conversación o fuente
- fecha mencionada explícitamente
- impacto operativo
- cercanía temporal

---

## 12. Autoactualización del sistema

Nexión debe incluir una lógica de autoactualización diaria.

### Frecuencia inicial
- una corrida diaria después de las 6:00 pm

### Qué puede proponer o actualizar
- estado de tareas
- estado de alertas
- cambios en métricas
- actualización de insights
- actualización de feedback
- detección de temas finalizados o riesgos ya atendidos

### Regla operativa
El sistema puede proponer cambios automáticamente, pero el usuario debe poder:
- ver qué se autoactualizó
- ver qué quedó pendiente de aprobación
- aprobar o rechazar propuestas relevantes

### Regla operativa adicional
La detección de tareas por IA no implica creación automática definitiva.
Toda tarea propuesta por la IA deberá pasar por revisión humana antes de confirmarse como tarea del sistema.

---

## 13. Métricas prioritarias

### Métricas de negocio
Se tomarán como base las métricas ya definidas por el equipo y el ejemplo compartido para el producto Encuestas, incluyendo entre otras:
- Nuevo ARR
- Empresas NSM
- ARR empresas NSM
- Cuentas pagas dentro del NSM
- Completitud
- métricas de funnel/adopción
- avance de objetivos/OKRs

### Métricas de usabilidad
Se tomarán como base las métricas ya definidas por el equipo, incluyendo las señales detectadas en fuentes y análisis diarios.

### Frecuencia inicial
- actualización diaria a las 6:00 pm

### Nota
En esta fase, Nexión no tendrá un módulo visible de boletines. La salida editorial automática no es prioridad actual.

---

## 14. Objetivos y KRs

La fuente oficial de objetivos/KRs será el Google Sheet compartido por el usuario.

Reglas:
- Nexión no será la fuente maestra de OKRs
- Nexión leerá y usará la fuente oficial externa
- las tareas y hallazgos podrán vincularse a objetivos y KRs
- el avance de objetivos podrá enriquecerse con el trabajo detectado dentro del sistema

---

## 15. Fuentes de información

### Fuente inicial priorizada
- reunión de feedback ingresada por link

### Fuentes previstas
- Google Docs
- Google Sheets
- transcripciones
- notas de reunión
- recursos compartidos en Drive
- calendario
- otras fuentes futuras

---

## 16. Stack base del producto

### Activo hoy
- GitHub repo: sí
- Antigravity sobre repo: sí
- Claude Code sobre repo: sí
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
- Slack integration (opcional/futuro)
- posibles MCPs adicionales

### Regla
La documentación debe contemplar activos y planeados, con estado explícito.

---

## 16A. Capa de IA y análisis

### Proveedor inicial de análisis
La capa inicial de análisis real se diseñará para usar Gemini Developer API como primera opción, aprovechando su free tier inicial mientras se validan flujos, calidad y límites operativos.

### Regla de diseño
La arquitectura de Nexión no debe depender rígidamente de un solo proveedor de IA.
La capa de análisis debe diseñarse como intercambiable o adaptable a futuros proveedores.

### Estado actual
- proveedor decidido a nivel conceptual: sí
- credenciales/API keys listas: no
- setup técnico completo: pendiente

### Regla de control humano
La detección de tareas por IA no implica creación automática definitiva.
Toda tarea propuesta por la IA deberá pasar por revisión humana antes de confirmarse como tarea del sistema.

---

## 17. Principios fijos del proyecto

1. construir incrementalmente
2. diseñar para el estado final sin rehacer innecesariamente
3. priorizar claridad operativa sobre complejidad
4. separar home operativo diario de vistas globales
5. minimizar trabajo manual del usuario
6. usar MCPs, APIs y automatización cuando aceleren y simplifiquen
7. preferir SQL y estructuras reproducibles sobre configuración manual
8. no depender de herramientas puente como base operativa final
9. mantener trazabilidad entre fuente, hallazgo, tarea, objetivo y estado
10. trabajar paso a paso con validación real

---

## 18. Elementos flexibles

Pueden cambiar con aprendizaje:
- orden fino de releases
- profundidad de módulos globales
- reglas exactas de clasificación
- forma de autoactualización
- prompts y capas de IA
- herramientas específicas de integración
- detalle del modelo de datos
- nivel de aprobación manual por tipo de cambio

---

## 19. Releases propuestos

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

## 20. Resultado esperado del producto

Nexión debe convertirse en un sistema que permita al usuario:
- empezar el día con claridad
- entender qué importa hoy
- ver qué cambió automáticamente
- convertir información dispersa en trabajo estructurado
- conectar trabajo diario con objetivos
- reducir seguimiento manual
- operar con más foco y visibilidad

---

## 21. Estado actual del proyecto

### Ya definido
- identidad del producto
- arquitectura de información base
- navegación principal
- módulos principales
- tabs internas de Día
- pantallas visuales iniciales
- stack base activo y planeado

### Pendiente de documentar en detalle
- arquitectura técnica completa
- modelo de datos
- contratos de servicios
- reglas exactas de autoactualización
- integración con Google
- integración con Calendar
- integración con métricas externas
- prompts operativos y build rules

---

## 22. Regla para Claude Code y Antigravity

Este documento debe tratarse como fuente madre de contexto.
Ninguna decisión estructural importante debe contradecir este brief sin registrarse primero como decisión nueva o ajuste formal del proyecto.
