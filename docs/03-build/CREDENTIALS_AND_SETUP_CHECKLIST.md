# Nexión — Credentials and Setup Checklist
Version: v1.0
Status: Draft base
Owner: Product / Build System
Purpose: Centralizar el checklist de credenciales, configuraciones, accesos, variables de entorno y precondiciones necesarias para construir y operar Nexión.

---

## 1. Objetivo del documento

Este documento define:
- qué accesos y credenciales necesita Nexión
- qué setups deben existir por herramienta o integración
- qué variables de entorno deben prepararse
- qué está disponible, qué está pendiente y qué no debe compartirse en documentación pública

---

## 2. Principio general

Todo acceso o credencial debe existir en uno de estos estados:

- available
- pending_creation
- pending_credentials
- pending_validation
- not_needed_yet

### Regla crítica
Los documentos y el repo deben referenciar: nombre de la variable, propósito, entorno donde vive, estado. **Nunca el valor real del secreto.**

---

## 3. Reglas de seguridad

1. No pegar tokens o secrets completos en chats, docs o repo.
2. No hardcodear credenciales en código.
3. Usar variables de entorno y gestores de secretos según el entorno.
4. Separar credenciales por entorno cuando aplique.
5. Si un secreto se expuso accidentalmente, debe rotarse.
6. Documentar el nombre del secreto, no el valor.

---

## 4. Estado actual del proyecto

### Ya existe
- GitHub repo, Supabase proyecto base, n8n Cloud, acceso de trabajo con Antigravity, acceso de trabajo con Claude Code, Google Sheet oficial de OKRs/KRs

### Pendiente o no activado aún
- proyecto de Vercel, Google Cloud project para OAuth, client ID / client secret de Google, lista final de scopes de Google, credenciales de Gemini API, integración de Google Calendar, integración Google Drive/Docs/Sheets productiva completa, Slack opcional/futuro

---

## 5. Checklist por bloque

### GitHub
- repo creado ✅
- acceso del owner confirmado ✅
- estructura inicial del repo preparada (en progreso)
- `GITHUB_TOKEN` si se requiere automatización

### Supabase
- proyecto activo ✅
- Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROJECT_REF`
- Estado: proyecto base disponible; credenciales sensibles no deben volver a compartirse en chat

### n8n Cloud
- instancia activa ✅
- Variables: `N8N_BASE_URL`, `N8N_API_KEY`
- Estado: API key debe tratarse como secreta y rotarse si se expuso

### Vercel
- Estado: **pending_creation**
- Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y otras según slice real

### Google Cloud OAuth
- Estado: **pending_creation**
- Variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

### Google Drive / Docs / Sheets / Calendar
- Estado: **planned / pending_setup**
- Drive y Docs normalmente cubiertos por OAuth de Google

### Gemini Developer API
- Estado: **pending_creation**
- Variables: `GEMINI_API_KEY`, `GEMINI_MODEL` (opcional)

### Slack (opcional)
- Estado: **not_needed_yet**

### Atlassian / Jira (futuro)
- Estado: **not_needed_yet**
- No meter al scope técnico activo si todavía no forma parte del slice actual

---

## 6. Variables de entorno mínimas por fase

### Fase 0–1 (docs + shell + repo)
No requiere secretos profundos. Útiles si se conectará frontend real pronto:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Fase 2 (auth)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

### Fase 3–4 (sources + processing base)
- Variables de Supabase, `N8N_BASE_URL`, `N8N_API_KEY`

### Fase 5–6 (automatización + análisis IA)
- Variables de Supabase, Variables de n8n, `GEMINI_API_KEY`

### Fase 7+ (calendar, objetivos, integraciones completas)
- Variables Google activas, acceso a Sheets y Calendar, configuración Vercel

---

## 7. Checklist de preparación antes del primer slice funcional real

### Producto / docs
- [ ] docs base en repo
- [ ] roadmap aprobado
- [ ] schema base definido

### Repo / app
- [ ] shell base creada
- [ ] estructura del repo lista
- [ ] convenciones visibles

### Auth
- [ ] Supabase listo
- [ ] Google OAuth listo o a punto de probarse

### Datos
- [ ] migración inicial lista para ejecutar

### Automatización
- [ ] n8n accesible
- [ ] workflow mínimo planificado

### IA
- [ ] estrategia de análisis decidida
- [ ] credencial de Gemini pendiente o lista

---

## 8. Qué no debe pasar

- los secretos no deben vivir en el repo
- las claves no se deben compartir completas por chat
- una integración no debe marcarse como lista solo porque "conceptualmente ya existe"
- no se debe intentar construir auth o automatización sin setup mínimo
- el proyecto no debe depender de una sola persona que sabe dónde están los accesos

---

## 9. Regla para Claude Code y Antigravity

Este documento debe usarse como checklist previo a cualquier implementación que dependa de: auth, secretos, integraciones, despliegue, automatización real.

Si una credencial o setup no existe aún, la herramienta no debe asumirla como disponible. Debe marcarse explícitamente como: pendiente, bloqueante, o no necesaria todavía para el slice actual.
