# Nexión — MCP and Tooling Playbook
Version: v1.0
Status: Draft base
Owner: Product / Build System
Purpose: Definir cómo usar MCPs, APIs, Claude Code, Antigravity, n8n y demás herramientas de trabajo para construir Nexión de forma rápida, trazable e incremental.

---

## 1. Objetivo del documento

Este documento define:
- qué herramienta se usa para qué
- cuándo conviene usar MCP, API, Claude Code, Antigravity o trabajo manual mínimo
- cómo repartir responsabilidades entre diseño, desarrollo, automatización e infraestructura
- cómo evitar trabajo duplicado o decisiones tomadas en la herramienta equivocada
- cómo mantener consistencia entre repo, documentación y ejecución

No define todavía:
- prompts específicos finales por herramienta
- credenciales reales
- configuración técnica exacta de cada MCP
- detalle de comandos finales por entorno

Su función es servir como guía operativa para ejecutar Nexión sin improvisar el uso de herramientas.

---

## 2. Principio general

Las herramientas de construcción existen para acelerar Nexión, no para volverla opaca.

### Regla principal
Cada herramienta debe usarse por el tipo de trabajo que resuelve mejor.

La lógica correcta es:

- **documentación** para alinear
- **repo** para versionar
- **Claude Code** para implementar y razonar sobre código
- **Antigravity** para acelerar construcción visual y ejecución guiada
- **n8n** para automatización
- **MCPs/APIs** para reducir pasos manuales cuando realmente aportan valor

### Regla crítica
Los MCPs y herramientas puente **no son** la base operativa final del producto.
La base final es:
- repo
- frontend
- Supabase
- n8n
- integraciones reales

---

## 3. Stack de herramientas actual de Nexión

### Activo hoy
- GitHub repo
- MCP GitHub
- n8n Cloud
- MCP n8n
- Supabase proyecto base
- Claude Code
- Antigravity

### Planeado / pendiente
- Google OAuth
- Google Drive integration
- Google Docs integration
- Google Sheets integration
- Google Calendar integration
- Gemini API
- Vercel
- posibles MCPs adicionales

---

## 4. Regla madre de uso de herramientas

Antes de usar una herramienta, preguntar:

1. ¿Esto es decisión de producto o de implementación?
2. ¿Necesito documentar primero?
3. ¿Esto debe quedar versionado en repo?
4. ¿Esto vive mejor como SQL, como workflow, como UI o como prompt?
5. ¿Hay una vía más simple y reproducible?
6. ¿El MCP/API realmente evita trabajo manual o solo añade complejidad?

### Regla
Si no hay claridad, primero se documenta y luego se ejecuta.

---

## 5. Qué herramienta usar para cada tipo de trabajo

## 5.1 Claude Code
Usar para:
- implementar frontend
- implementar backend
- proponer estructura técnica
- escribir o revisar SQL
- crear tipos, servicios y contratos
- refactors pequeños y controlados
- revisar consistencia entre docs y código

### No usar como único lugar de decisión
No debe decidir por sí solo:
- cambios de arquitectura sin documento
- nuevos modelos de dominio no alineados
- cambios grandes en navegación sin decisión previa

---

## 5.2 Antigravity
Usar para:
- construir o acelerar UI sobre el repo
- traducir pantallas y flujos en estructura real
- generar iteraciones de frontend
- ayudar a construir workflows o scaffolding cuando simplifique el trabajo

### Especialmente útil para
- shell del producto
- layouts
- pantallas del módulo Día
- tablas/listas/paneles
- refinamiento visual incremental

### No usar como fuente de verdad
Lo que produce debe terminar:
- en repo
- consistente con los documentos maestros

---

## 5.3 MCP GitHub
Usar para:
- leer el repo
- revisar estructura
- ubicar archivos
- acelerar navegación y cambios sobre código versionado

### Ideal para
- inspección rápida del repo
- entender el estado actual
- apoyar implementación con contexto directo de archivos

### Regla
Si algo cambia, debe quedar reflejado en GitHub.

---

## 5.4 MCP n8n
Usar para:
- revisar workflows
- acelerar construcción de flujos
- entender estructuras existentes
- iterar nodo por nodo sobre automatización

### Ideal para
- construir workflow base
- revisar outputs reales
- refinar el pipeline incremental

### Regla
En n8n se trabaja:
- un workflow o una parte a la vez
- revisando output real antes del siguiente ajuste

---

## 5.5 n8n directo
Usar para:
- automatización real
- corridas programadas
- integración con fuentes
- llamadas a IA
- consolidación diaria
- propuestas pendientes

### Regla
n8n es el orquestador productivo.
El MCP ayuda a construir y revisar, pero el flujo real vive en n8n.

---

## 5.6 Supabase
Usar para:
- auth
- modelo estructurado del sistema
- persistencia principal
- lectura estable para UI
- trazabilidad

### Regla de trabajo
Preferir:
- SQL reproducible
- migraciones versionadas
- decisiones alineadas con `SUPABASE_SCHEMA_SPEC.md`

### Evitar
- configuración manual dispersa si puede resolverse en SQL

---

## 5.7 APIs externas
Usar cuando:
- la integración real del producto depende de ellas
- no existe MCP adecuado
- el MCP no cubre la operación necesaria
- el flujo productivo final debe depender de API real de servicio externo

### Ejemplos
- Google APIs
- Gemini API
- Slack API/Webhook si entra después
- Atlassian API si luego se decide integrar Jira

---

## 5.8 Trabajo manual
Usar solo cuando:
- todavía no existe integración
- el esfuerzo de automatizar sería mayor que el valor inmediato
- estamos validando un slice muy pequeño
- hace falta confirmar comportamiento antes de automatizar

### Regla
El trabajo manual es aceptable como paso de validación, no como base operativa permanente.

---

## 6. Matriz práctica de uso

## 6.1 Producto y definición
Herramienta principal:
- documentación + chat de proyecto

Apoyos:
- Claude Code solo como lector/consumidor del marco
- Antigravity para reflejo visual posterior

## 6.2 Pantallas / UI
Herramienta principal:
- Antigravity

Apoyos:
- Claude Code
- repo GitHub
- documentación visual y de arquitectura

## 6.3 Modelo de datos
Herramienta principal:
- documentación + SQL + Claude Code

Apoyos:
- Supabase
- repo
- migraciones

## 6.4 Automatización
Herramienta principal:
- n8n

Apoyos:
- MCP n8n
- Claude Code
- documentación de arquitectura de automatización

## 6.5 Integraciones
Herramienta principal:
- APIs reales + n8n + Supabase

Apoyos:
- documentación
- Claude Code
- MCP cuando exista y ayude

## 6.6 Build sobre repo
Herramienta principal:
- GitHub + Claude Code + Antigravity

---

## 7. Reglas de uso de MCPs

### 7.1 Usar MCP cuando simplifique, no por moda
El MCP debe ahorrar pasos reales o aumentar visibilidad útil.

### 7.2 No esconder lógica importante en el MCP
Si una decisión es estructural, debe quedar en:
- documentación
- repo
- SQL
- workflow versionado

### 7.3 El MCP no reemplaza el modelo del producto
Solo ayuda a operar o construir más rápido.

### 7.4 Todo output importante debe aterrizar en artefactos reales
Ejemplos:
- código en repo
- SQL en migraciones
- workflow en n8n
- documento en `/docs`

---

## 8. Cómo usar Claude Code en Nexión

## 8.1 Casos ideales
- crear shell de app
- crear componentes de módulos
- escribir queries, tipos y servicios
- proponer migraciones SQL
- integrar frontend con Supabase
- crear helpers, mappers y validadores
- refinar slices funcionales pequeños

## 8.2 Casos donde debe ir con cuidado
- auth
- cambios de schema
- integración con Google
- contratos de servicios
- cambios grandes de arquitectura

### Regla
En esos casos debe seguir primero los documentos maestros.

## 8.3 Forma de trabajo recomendada
1. leer documento relevante
2. proponer plan corto
3. cambiar poco
4. mostrar output real
5. ajustar

---

## 9. Cómo usar Antigravity en Nexión

## 9.1 Casos ideales
- construir vistas del producto
- traducir diseño a frontend
- aplicar cambios iterativos sobre componentes existentes
- scaffolding visual consistente
- acelerar pantallas del módulo Día y módulos globales

## 9.2 Forma de trabajo recomendada
1. definir pantalla o slice exacto
2. dar contexto documental
3. pedir cambio pequeño o mediano
4. revisar output visual real
5. corregir
6. consolidar en repo

### Regla
No pedir “haz toda la app completa funcional” de una sola vez.

---

## 10. Cómo usar n8n en Nexión

## 10.1 Casos ideales
- add source manual
- process source
- reprocess source
- daily run
- sync OKRs
- sync Calendar
- generate task proposals
- generate update proposals

## 10.2 Forma de trabajo recomendada
1. definir workflow objetivo
2. documentar qué resuelve
3. construirlo en versión mínima
4. revisar output real
5. refinar nodo por nodo
6. dejar export o documentación en repo

### Regla crítica
No construir workflows gigantes sin separación clara de responsabilidad.

---

## 11. Cómo usar APIs directamente

Usar API directa cuando:
- es la vía productiva real
- no existe un MCP útil
- n8n necesita llamar un servicio por HTTP
- la integración exige control fino de request/response

### Ejemplos prioritarios
- Gemini API para análisis
- Google APIs para auth/Drive/Docs/Sheets/Calendar
- Supabase API/SDK donde aplique
- Slack si más adelante se activa

### Regla
Si una integración es parte del producto final, debe pensarse desde la API real, aunque temporalmente exista apoyo por MCP.

---

## 12. Cómo usar la capa de IA

## 12.1 Rol correcto
La IA debe usarse para:
- resumen
- extracción
- clasificación
- propuestas
- consolidación

## 12.2 Rol incorrecto
No debe usarse para:
- orquestar todo el sistema
- tomar decisiones finales sensibles sin revisión
- reemplazar persistencia o modelo estructurado

## 12.3 Reparto recomendado
- **n8n** llama a la IA
- **IA** devuelve análisis estructurado
- **Supabase** guarda
- **UI** muestra
- **humano** aprueba tareas y cambios sensibles

---

## 13. Regla para integraciones no activas

Puede trabajarse con una integración aunque todavía no esté activa si:
- existe decisión de producto clara
- existe caso de uso real
- queda marcada como `planned` o `pending_setup`
- no se simula como si ya estuviera operativa

### Ejemplos actuales
- Google Auth
- Drive
- Docs
- Sheets
- Calendar
- Gemini

---

## 14. Qué herramienta usar primero según el tipo de problema

### Si el problema es de navegación o producto
1. documentación
2. luego UI

### Si el problema es de datos
1. schema/docs
2. SQL
3. implementación

### Si el problema es de automatización
1. automation doc
2. workflow mínimo en n8n
3. output real
4. refinamiento

### Si el problema es de integración
1. integrations/auth doc
2. revisar API real
3. definir setup
4. recién después implementar

### Si el problema es de UX visual
1. Antigravity
2. repo
3. refinamiento con Claude Code si hace falta

---

## 15. Regla de versionado

Todo lo importante debe terminar versionado en alguno de estos lugares:

### Repo GitHub
- código
- docs
- SQL
- exports/config relacionados

### n8n
- workflows reales

### Supabase
- schema y migraciones

### Regla
Nada crítico debe vivir solo en memoria de chat o en una herramienta visual sin respaldo.

---

## 16. Qué no debe pasar

No debe pasar que:
- una decisión de producto quede escondida solo en un prompt
- un workflow quede sin explicación mínima
- Antigravity cambie estructuras clave sin revisar docs
- Claude Code implemente algo que contradice el schema/documentos
- se use un MCP cuando una API real era más correcta para el producto final
- se vuelva imposible saber qué herramienta produjo qué cosa

---

## 17. Secuencia operativa recomendada para construir Nexión

### Fase 1 — Definición
- docs maestros
- arquitectura
- modelo
- reglas

### Fase 2 — Shell del producto
- login
- navegación
- Día
- vistas base

### Fase 3 — Datos y fuentes
- schema
- source intake
- processing básico
- resultado estructurado

### Fase 4 — Automatización
- workflows base en n8n
- análisis por IA
- consolidación diaria

### Fase 5 — Operación
- task proposals
- approvals
- tareas globales
- objetivos

### Fase 6 — Madurez
- métricas
- alerts
- insights
- calendar context
- autoactualización fuerte

---

## 18. Regla para Claude Code y Antigravity

Este documento debe usarse como guía práctica de ejecución.

Toda implementación debe respetar:
- herramienta correcta para problema correcto
- repo como fuente de verdad
- docs como marco de decisión
- n8n como orquestador
- Supabase como modelo estructurado
- IA como servicio de análisis
- MCPs y APIs como aceleradores, no como sustitutos del producto final
