# Nexión — Tech Architecture
Version: v1.0
Status: Draft base
Owner: Product / Build System
Purpose: Definir la arquitectura técnica base de Nexión para alinear frontend, backend, automatización, integraciones, análisis por IA y construcción incremental con Claude Code / Antigravity.

---

## 1. Objetivo del documento

Este documento define:
- la arquitectura técnica objetivo de Nexión
- los componentes principales del sistema
- qué herramienta cumple qué rol
- cómo se conectan frontend, backend, automatización e IA
- qué está activo hoy y qué está planeado
- cómo construir incrementalmente sin rehacer la base

No define todavía:
- SQL final detallado
- nodos exactos de n8n
- contratos HTTP definitivos
- código final de implementación

Su función es servir como marco técnico principal para build, integración y decisiones de infraestructura.

---

## 2. Principio general de arquitectura

Nexión debe construirse como una plataforma modular basada en cuatro capas:

1. **Experiencia de usuario**
2. **Backend y fuente de verdad estructurada**
3. **Automatización e integraciones**
4. **Capa de análisis e inteligencia**

La lógica general del sistema es:

**fuentes externas y manuales → ingestión/orquestación → análisis → persistencia estructurada → experiencia diaria y módulos globales**

### Regla principal
La arquitectura debe soportar:
- construcción incremental
- cambios de herramientas sin rehacer todo
- separación clara entre datos, automatización y UI
- trazabilidad de extremo a extremo

---

## 3. Stack base decidido

## 3.1 Frontend
- **App web**
- despliegue previsto en **Vercel**
- implementación sobre repo en **GitHub**
- construcción asistida por **Antigravity** y **Claude Code**

## 3.2 Backend estructurado
- **Supabase**
- base de datos principal
- auth
- API/data layer inicial
- fuente de verdad estructurada del sistema

## 3.3 Automatización
- **n8n Cloud**
- orquestación de ingestión
- corridas programadas
- lectura de integraciones
- llamadas a IA
- actualización de sistema

## 3.4 Capa de IA
- primera opción planificada: **Gemini Developer API**
- llamada por HTTP desde n8n o servicio backend
- arquitectura desacoplada para poder cambiar de proveedor después

## 3.5 Fuentes externas previstas
- Google OAuth
- Google Drive
- Google Docs
- Google Sheets
- Google Calendar

## 3.6 Herramientas de construcción
- GitHub
- MCP GitHub
- MCP n8n
- Antigravity
- Claude Code

---

## 4. Qué rol cumple cada herramienta

## 4.1 GitHub
Repositorio fuente de:
- frontend
- documentación técnica
- prompts versionados
- schemas / migraciones
- decisiones y convenciones

## 4.2 Antigravity
Herramienta principal para acelerar construcción visual y posiblemente scaffolding guiado sobre repo.

### Rol esperado
- construir UI
- aplicar cambios iterativos sobre repo
- acelerar desarrollo con contexto documental

### Regla
No es la fuente de verdad del producto.
El repo lo es.

## 4.3 Claude Code
Copiloto de desarrollo y arquitectura técnica.

### Rol esperado
- leer documentación del proyecto
- ayudar a implementar frontend/backend
- ayudar a escribir SQL
- ayudar a integrar servicios
- respetar reglas y convenciones del repo

## 4.4 Supabase
Fuente de verdad estructurada de Nexión.

### Rol esperado
- auth
- persistencia principal
- relaciones entre entidades
- lectura para UI
- soporte para auditoría mínima y trazabilidad

## 4.5 n8n
Motor principal de automatización y orquestación.

### Rol esperado
- triggers
- schedules
- lectura de fuentes
- llamadas HTTP a IA
- sincronización con sistemas externos
- actualización del día
- preparación de propuestas y estados

## 4.6 Gemini Developer API
Motor inicial planeado de análisis.

### Rol esperado
- resumir fuentes
- detectar hallazgos
- clasificar señales
- proponer tareas
- detectar métricas, feedback, insights y alertas

### Regla
El proveedor de IA no debe quedar acoplado rígidamente a la arquitectura.

---

## 5. Arquitectura por capas

## 5.1 Capa de presentación (Frontend)

Responsable de:
- login
- navegación
- módulo Día
- módulos globales
- aprobación humana de propuestas
- visualización de resultados estructurados
- lectura del estado del sistema

### Qué NO debe hacer
- lógica compleja de automatización
- procesamiento pesado de fuentes
- acceso directo desordenado a múltiples fuentes externas
- decisiones críticas de análisis

### Regla
El frontend consume una capa estructurada y estable, no opera como orquestador.

---

## 5.2 Capa de dominio y persistencia (Supabase)

Responsable de:
- usuarios
- workspaces
- fuentes
- corridas
- análisis
- hallazgos
- tareas y propuestas
- métricas
- objetivos/KRs sincronizados
- day summary
- update proposals
- approval actions

### Regla
Supabase debe concentrar el modelo estructurado y la trazabilidad principal del sistema.

---

## 5.3 Capa de automatización (n8n)

Responsable de:
- ingestión manual conectada con flujos
- ingestión automática
- corridas diarias
- procesamiento incremental
- integración con Google
- llamadas al motor de IA
- sincronización de OKRs
- actualización de DaySummary
- generación de propuestas

### Regla
La orquestación principal vive aquí, no en el frontend.

---

## 5.4 Capa de inteligencia (IA)

Responsable de:
- interpretar texto y contenido estructurado
- detectar categorías
- generar propuestas de tareas
- resumir y consolidar
- proponer relaciones con objetivos/KRs cuando aplique

### Regla
La IA interpreta y propone.
No debe aplicar decisiones sensibles de forma autónoma sin control humano.

---

## 6. Arquitectura lógica del sistema

### Flujo macro
1. el usuario ingresa una fuente o el sistema detecta una fuente
2. n8n registra la fuente y valida acceso
3. n8n lee o extrae el contenido
4. si es necesario, preprocesa/chunkea
5. n8n llama al motor de IA
6. el resultado se guarda en Supabase
7. se actualizan:
   - análisis
   - hallazgos
   - propuestas
   - day summary
8. el frontend consume esos datos
9. el usuario aprueba o corrige si hace falta

---

## 7. Arquitectura del módulo Día

Día debe construirse sobre una combinación de:
- datos persistidos en Supabase
- consolidación diaria producida por n8n
- datos de agenda/calendario
- propuestas pendientes de aprobación

### Día > Hoy necesita
- day summary
- tareas relevantes
- alertas relevantes
- agenda del día
- métricas del día
- estado de autoactualización
- propuestas pendientes

### Regla
El Day Engine no debe depender de recalcular todo en tiempo real cada vez que el usuario entra.
Debe apoyarse en consolidación persistida o semipersistida.

---

## 8. Arquitectura del módulo Dashboard

Dashboard es una vista panorámica global.

Debe alimentarse de:
- day summary actual
- métricas globales
- volumen de trabajo
- alertas relevantes
- estado general del sistema

### Regla
Dashboard no debe sustituir Día > Hoy.
Debe ser una lectura ejecutiva ligera.

---

## 9. Integraciones planeadas

## 9.1 Google Auth
Para login y acceso autorizado al ecosistema Google.

## 9.2 Google Drive
Para lectura de recursos fuente y carpetas relevantes.

## 9.3 Google Docs
Para lectura estructurada de notas y documentos.

## 9.4 Google Sheets
Para:
- OKRs/KRs
- fuentes vivas estructuradas
- métricas o insumos que vivan en Sheets

## 9.5 Google Calendar
Para:
- reuniones del día
- tiempo bloqueado
- tiempo libre disponible
- contexto operativo de Día > Hoy

### Regla de integración
Las integraciones pueden estar planeadas aunque aún no estén activas.
La arquitectura debe documentarlas con estado explícito:
- activo
- planeado
- pendiente de setup
- pendiente de credenciales

---

## 10. Estado actual de infraestructura

### Activo hoy
- GitHub repo
- Supabase proyecto base
- n8n Cloud
- MCP GitHub
- MCP n8n
- Antigravity sobre repo
- Claude Code sobre repo

### Planeado / pendiente
- Vercel
- Google Cloud OAuth
- Google Drive
- Google Docs
- Google Sheets
- Google Calendar
- Gemini API credentials
- Slack opcional/futuro

---

## 11. Arquitectura de IA recomendada

## 11.1 Regla general
No usar la IA como orquestador del sistema.
La IA debe ser un servicio de análisis llamado por n8n o backend.

## 11.2 Reparto recomendado

### n8n
- schedules
- triggers
- lectura de integraciones
- routing del flujo
- llamada HTTP a IA
- persistencia y consolidación

### IA
- resumen
- clasificación
- extracción
- propuestas
- relaciones sugeridas

### humano
- aprobación de tareas
- revisión de cambios sensibles
- corrección de ambigüedad

---

## 12. Procesamiento de texto y límites

La arquitectura debe asumir que no conviene mandar todo siempre al modelo.

### Regla técnica funcional
El pipeline debe soportar:
- análisis incremental
- chunking
- reprocesamiento solo de lo nuevo o modificado
- consolidación posterior
- no reanalizar todo indiscriminadamente

### Objetivo
Reducir riesgo por:
- límites de contexto
- límites de rate
- costo futuro
- latencia
- duplicación de procesamiento

---

## 13. Decisión de desacoplamiento

Nexión debe poder cambiar:
- proveedor de IA
- profundidad de análisis
- algunas integraciones
- parte del frontend

sin tener que rehacer:
- modelo central
- navegación
- lógica del día
- trazabilidad base

### Cómo se logra
Separando claramente:
- UI
- orquestación
- dominio persistido
- servicio de análisis

---

## 14. Arquitectura de despliegue objetivo

## 14.1 Frontend
- Vercel
- conectado al repo principal

## 14.2 Backend estructurado
- Supabase cloud

## 14.3 Automatización
- n8n Cloud

## 14.4 Integraciones externas
- Google APIs
- posibles integraciones futuras

## 14.5 Repositorio
- GitHub como fuente central de código y docs

---

## 15. Arquitectura de entornos

Aunque al inicio sea simple, conviene prever:

- local/dev (si aplica)
- preview / branch deploys
- producción

### Regla
Incluso si al principio se construye rápido, el repo debe estar preparado para separar entornos luego sin rediseñar toda la arquitectura.

---

## 16. Seguridad y secretos

### Regla principal
Los secretos no deben vivir hardcodeados en código ni documentos públicos del repo.

### Tipos de secretos esperados
- Supabase keys
- Google OAuth credentials
- Gemini API key
- n8n API key
- GitHub tokens de automatización si aplica
- Slack credentials si entra después

### Regla operativa
La documentación debe referenciar nombres de variables, no valores reales.

---

## 17. Observabilidad mínima esperada

La arquitectura debe contemplar trazabilidad mínima para:
- corridas del sistema
- errores de fuentes
- errores de análisis
- propuestas pendientes
- aprobaciones humanas
- sincronizaciones diarias

### Regla
No hace falta observabilidad enterprise desde el día 1, pero sí suficiente para entender qué pasó y por qué.

---

## 18. Construcción incremental

La arquitectura debe soportar este camino:

### Fase 1
- login
- shell base
- navegación
- Día > Fuentes
- añadir recurso
- resultado estructurado básico

### Fase 2
- tareas propuestas
- aprobación humana
- módulo global Tareas

### Fase 3
- objetivos y KRs
- vínculo tarea ↔ objetivo/KR

### Fase 4
- métricas, insights, alertas globales y diarias más maduras

### Fase 5
- dashboard más potente
- autoactualización más robusta
- agenda y organización del día más inteligente

---

## 19. Qué NO debe hacer la arquitectura

Nexión no debe:
- depender del frontend para automatización central
- depender de una sola IA rígidamente
- mezclar almacenamiento estructurado con lógica de análisis
- usar Drive/Sheets como backend principal del producto
- crear tareas definitivas sin aprobación humana
- reanalizar todo todos los días
- construir la visión final entera antes de validar slices funcionales

---

## 20. Decisiones fijas

Quedan fijas estas decisiones:
- GitHub es el repo central
- Antigravity y Claude Code trabajan sobre el repo
- Supabase es la fuente estructurada principal
- n8n es el orquestador principal
- Gemini es la primera opción planeada de análisis
- Día > Hoy es el home operativo real
- tareas definitivas requieren aprobación humana

---

## 21. Elementos flexibles

Pueden cambiar con aprendizaje:
- proveedor final de IA
- detalle del modelo de datos
- profundidad del dashboard
- número de servicios o separación técnica interna
- estrategia exacta de chunking
- nivel de automatización que puede autoaplicar cambios
- detalle de integraciones adicionales

---

## 22. Regla para Claude Code y Antigravity

Este documento debe usarse como fuente de verdad para decisiones técnicas de alto nivel.

Toda implementación debe respetar:
- separación de capas
- centralidad de Supabase como modelo estructurado
- n8n como orquestador principal
- UI desacoplada del procesamiento
- aprobación humana para tareas definitivas
- construcción incremental sin rehacer arquitectura base
