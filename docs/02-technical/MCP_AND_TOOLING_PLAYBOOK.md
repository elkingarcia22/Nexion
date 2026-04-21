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

---

## 2. Principio general

Las herramientas de construcción existen para acelerar Nexión, no para volverla opaca.

### Regla principal
Cada herramienta debe usarse por el tipo de trabajo que resuelve mejor:
- **documentación** para alinear
- **repo** para versionar
- **Claude Code** para implementar y razonar sobre código
- **Antigravity** para acelerar construcción visual y ejecución guiada
- **n8n** para automatización
- **MCPs/APIs** para reducir pasos manuales cuando realmente aportan valor

### Regla crítica
Los MCPs y herramientas puente no son la base operativa final del producto. La base final es: repo, frontend, Supabase, n8n, integraciones reales.

---

## 3. Stack de herramientas

### Activo hoy
- GitHub repo, MCP GitHub, n8n Cloud, MCP n8n, Supabase proyecto base, Claude Code, Antigravity

### Planeado / pendiente
- Google OAuth, Google Drive, Google Docs, Google Sheets, Google Calendar, Gemini API, Vercel, posibles MCPs adicionales

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

## 5. Qué herramienta usar para qué

### Claude Code
Usar para: implementar frontend, implementar backend, proponer estructura técnica, escribir o revisar SQL, crear tipos/servicios/contratos, refactors pequeños, revisar consistencia entre docs y código.

### Antigravity
Usar para: construir UI, traducir pantallas y flujos en estructura real, generar iteraciones de frontend, scaffolding visual consistente, módulo Día y módulos globales.

### MCP GitHub
Usar para: leer el repo, revisar estructura, ubicar archivos, acelerar navegación y cambios sobre código versionado.

### MCP n8n
Usar para: revisar workflows, acelerar construcción de flujos, entender estructuras existentes, iterar nodo por nodo sobre automatización.

### n8n directo
Usar para: automatización real, corridas programadas, integración con fuentes, llamadas a IA, consolidación diaria, propuestas pendientes.

### Supabase
Usar para: auth, modelo estructurado del sistema, persistencia principal, lectura estable para UI, trazabilidad. Preferir SQL reproducible y migraciones versionadas.

---

## 6. Reglas de uso de MCPs

1. Usar MCP cuando simplifique, no por moda
2. No esconder lógica importante en el MCP — debe quedar en docs, repo, SQL o workflow versionado
3. El MCP no reemplaza el modelo del producto
4. Todo output importante debe aterrizar en artefactos reales: código en repo, SQL en migraciones, workflow en n8n, documento en /docs

---

## 7. Cómo usar Claude Code en Nexión

### Casos ideales
- crear shell de app, crear componentes de módulos, escribir queries/tipos/servicios, proponer migraciones SQL, integrar frontend con Supabase, crear helpers/mappers/validadores, refinar slices funcionales pequeños

### Casos donde debe ir con cuidado
- auth, cambios de schema, integración con Google, contratos de servicios, cambios grandes de arquitectura

### Forma de trabajo recomendada
1. leer documento relevante
2. proponer plan corto
3. cambiar poco
4. mostrar output real
5. ajustar

---

## 8. Cómo usar Antigravity en Nexión

### Forma de trabajo recomendada
1. definir pantalla o slice exacto
2. dar contexto documental
3. pedir cambio pequeño o mediano
4. revisar output visual real
5. corregir
6. consolidar en repo

### Regla
No pedir "haz toda la app completa funcional" de una sola vez.

---

## 9. Cómo usar n8n en Nexión

### Forma de trabajo recomendada
1. definir workflow objetivo
2. documentar qué resuelve
3. construirlo en versión mínima
4. revisar output real
5. refinar nodo por nodo
6. dejar export o documentación en repo

### Regla crítica
No construir workflows gigantes sin separación clara de responsabilidad.

---

## 10. Secuencia operativa recomendada para construir Nexión

### Fase 1 — Definición
- docs maestros, arquitectura, modelo, reglas

### Fase 2 — Shell del producto
- login, navegación, Día, vistas base

### Fase 3 — Datos y fuentes
- schema, source intake, processing básico, resultado estructurado

### Fase 4 — Automatización
- workflows base en n8n, análisis por IA, consolidación diaria

### Fase 5 — Operación
- task proposals, approvals, tareas globales, objetivos

### Fase 6 — Madurez
- métricas, alerts, insights, calendar context, autoactualización fuerte

---

## 11. Qué no debe pasar

No debe pasar que:
- una decisión de producto quede escondida solo en un prompt
- un workflow quede sin explicación mínima
- Antigravity cambie estructuras clave sin revisar docs
- Claude Code implemente algo que contradice el schema/documentos
- se use un MCP cuando una API real era más correcta para el producto final
- se vuelva imposible saber qué herramienta produjo qué cosa

---

## 12. Regla de versionado

Todo lo importante debe terminar versionado en:
- Repo GitHub: código, docs, SQL, exports/config relacionados
- n8n: workflows reales
- Supabase: schema y migraciones

### Regla
Nada crítico debe vivir solo en memoria de chat o en una herramienta visual sin respaldo.

---

## 13. Regla para Claude Code y Antigravity

Toda implementación debe respetar:
- herramienta correcta para problema correcto
- repo como fuente de verdad
- docs como marco de decisión
- n8n como orquestador
- Supabase como modelo estructurado
- IA como servicio de análisis
- MCPs y APIs como aceleradores, no como sustitutos del producto final
