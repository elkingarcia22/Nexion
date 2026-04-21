# Nexión

Plataforma operativa B2B que transforma fuentes de información dispersas (reuniones, docs, feedback, notas) en claridad estructurada diaria: tareas, insights, alertas, métricas y trabajo vinculado a objetivos.

> **Home operativo:** `Día > Hoy` (`/day/today`) — no Dashboard.

---

## Stack

| Capa | Tecnología |
|------|----------|
| Frontend | Next.js 14 · App Router · Tailwind CSS |
| Base de datos | Supabase (PostgreSQL) |
| Auth | Supabase Auth · Google OAuth |
| Automatización | n8n Cloud |
| Análisis IA | Gemini Developer API |
| Deploy | Vercel |
| Repo | GitHub `elkingarcia22/Nexion` |

---

## Inicio rápido

```bash
# Requisitos: Node >= 20, pnpm >= 9
npm install -g pnpm

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example apps/web/.env.local
# → Edita apps/web/.env.local con tus valores reales

# Iniciar servidor de desarrollo
pnpm dev
# → http://localhost:3000 — redirige a /day/today
```

---

## Estructura del repo

```
/apps/web          → Frontend Next.js 14
/packages
  /types           → Tipos TypeScript compartidos
  /ui              → Componentes UI compartidos
  /config          → Tokens Tailwind base
/docs              → Documentación maestra del proyecto
  /00-foundation   → Brief, dominio, diseño, flujos
  /01-product-logic→ Arquitectura de información, módulos
  /02-technical    → Tech architecture, schema, contratos
  /03-build        → Roadmap, convenciones, credenciales
/supabase
  /migrations      → Migraciones SQL versionadas
/automation/n8n    → Exports y docs de workflows
```

---

## Estado de implementación

| Fase | Estado | Descripción |
|------|--------|------------|
| 0 — Docs | ✅ Completo | Toda la documentación en `/docs` |
| 1 — Shell | ✅ Completo | Frontend navegable, Día > Hoy, Fuentes |
| 2 — Auth | 🔧 Pendiente | Google OAuth (requiere Google Cloud project) |
| 3 — SQL | ⏳ Pendiente | Migraciones Release 1 en Supabase |
| 4 — Slice 1 | ⏳ Pendiente | Fuente → procesamiento → resultado real |
| 5+ | ⏳ Futuro | n8n, Gemini, tareas, objetivos, métricas |

---

## Reglas críticas

- El frontend **no orquesta** lógica de backend. n8n es el orquestador.
- La IA **propone**; el humano **aprueba**. Nunca se crean tareas automáticamente.
- Supabase es la **fuente de verdad** — no Google Sheets, no Drive.
- **Sin secretos** en código ni docs. Solo nombres de variables.
- **Un slice a la vez.** No abrir Release 2 sin validar Release 1.

---

## Variables de entorno requeridas

Ver `.env.example` en la raíz del repo. Nunca commitear valores reales.

Variables mínimas para Phase 1 (solo navegación visual, sin backend):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## Para Claude Code y Antigravity

Leer `CLAUDE.md` antes de implementar cualquier cosa.
Todo el contexto del proyecto vive en `/docs`.
