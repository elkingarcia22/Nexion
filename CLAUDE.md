# CLAUDE.md — Nexión Build Context

This file is the primary context document for Claude Code working on the Nexión repository. Read this before implementing anything.

---

## What is Nexión

Nexión is a B2B operational platform that transforms dispersed information sources (meetings, docs, feedback, notes) into structured operational clarity: tasks, insights, alerts, metrics, and objective-linked work.

The product is built on **Ubits** infrastructure and uses the **Ubits Brand Kit** as its visual identity.

---

## Core Principle

**The operational home is `Día > Hoy` (`/day/today`), not Dashboard.**

Everything in the system — sources, analyses, findings, proposals — flows into the daily operational view.

---

## Mandatory Reading Order

Before implementing any feature, read these documents in order:

1. `docs/03-build/BUILD_RULES.md` — non-negotiable construction rules
2. `docs/03-build/CODEBASE_CONVENTIONS.md` — naming, structure, patterns
3. `docs/00-foundation/PROJECT_MASTER_BRIEF.md` — what Nexión is
4. `docs/01-product-logic/INFORMATION_ARCHITECTURE.md` — navigation & structure
5. `docs/02-technical/TECH_ARCHITECTURE.md` — stack and layer responsibilities
6. `docs/02-technical/SUPABASE_SCHEMA_SPEC.md` — database model
7. `docs/00-foundation/DESIGN.md` — Ubits design system (colors, typography, components)

For specific areas:
- Sources & processing → `docs/01-product-logic/SOURCE_PROCESSING_SPEC.md`
- Day module → `docs/01-product-logic/DAY_ENGINE_SPEC.md`
- Tasks → `docs/01-product-logic/TASK_ENGINE_SPEC.md`
- APIs & services → `docs/02-technical/API_AND_SERVICE_CONTRACTS.md`
- Auth & integrations → `docs/02-technical/INTEGRATIONS_AND_AUTH.md`
- n8n workflows → `docs/02-technical/AUTOMATION_ARCHITECTURE.md`
- Prompts → `docs/03-build/PROMPT_LIBRARY.md`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) |
| Styling | Tailwind CSS with Ubits tokens |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + Google OAuth |
| Automation | n8n Cloud |
| AI Analysis | Gemini Developer API |
| Deployment | Vercel |
| Repo | GitHub (`elkingarcia22/Nexion`) |

---

## Design System — Ubits Brand Kit

**Colors (Tailwind token → HEX):**
- `navy` → `#04101f` — sidebar, dark surfaces, primary text
- `primary` → `#1a6bff` — CTAs, active states, brand accent
- `bright` → `#2ec6ff` — highlights, gradients
- `light` → `#cadeff` — soft backgrounds, badges
- `action` → `#3865f5` — interactive buttons
- `dark-ui` → `#2a303f` — elevated dark panels
- `accent` → `#f49e04` — warnings, special highlights
- `border` → `#d0d2d5` — card borders when needed
- `bg` → `#f8faff` — app background
- `white` → `#ffffff` — cards, content surfaces

**Typography:**
- UI text: `Inter` (all weights)
- Numeric / KPI values: `Roboto Mono` — always use for metrics

**Never use:**
- `#223999` or any color from the old Stitch prototype
- `Manrope` font
- Pure black `#000000`

Full design reference: `docs/00-foundation/DESIGN.md`

---

## Repository Structure

```
/docs
  /00-foundation      → PROJECT_MASTER_BRIEF, DOMAIN_MODEL, DESIGN, USER_FLOWS
  /01-product-logic   → INFORMATION_ARCHITECTURE, SCREEN_SYSTEM_SPEC, DAY_ENGINE_SPEC,
                        SOURCE_PROCESSING_SPEC, TASK_ENGINE_SPEC, METRICS_MODEL,
                        OKR_LINKING_SPEC, DATA_RELATIONSHIPS
  /02-technical       → TECH_ARCHITECTURE, SUPABASE_SCHEMA_SPEC, API_AND_SERVICE_CONTRACTS,
                        INTEGRATIONS_AND_AUTH, AUTOMATION_ARCHITECTURE, MCP_AND_TOOLING_PLAYBOOK
  /03-build           → BUILD_RULES, CODEBASE_CONVENTIONS, IMPLEMENTATION_ROADMAP,
                        PROMPT_LIBRARY, CREDENTIALS_AND_SETUP_CHECKLIST
  /04-decisions       → (architecture decision records — add as needed)

/apps
  /web                → Next.js 14 App Router frontend

/packages
  /ui                 → Shared UI components
  /types              → Shared TypeScript types
  /config             → Shared config (tailwind, eslint, tsconfig)
  /lib                → Shared utilities

/supabase
  /migrations         → Versioned SQL migrations (YYYYMMDDHHMMSS_description.sql)
  /seeds              → Seed data for development

/automation
  /n8n
    /exports          → Versioned workflow exports (.json)
    /docs             → Per-workflow documentation
    /prompts          → AI prompts used in workflows

/scripts              → Dev/ops helper scripts

/.github              → CI/CD (future)

CLAUDE.md             → This file
README.md             → Project overview
.env.example          → Required environment variables
```

---

## Naming Conventions (Critical)

| Element | Convention | Example |
|---------|-----------|---------|
| Folders | kebab-case | `day-engine`, `source-processing` |
| TS files (modules) | kebab-case | `source-intake-service.ts` |
| React components | PascalCase | `DayTodayView.tsx`, `SourceCard.tsx` |
| Functions | camelCase | `createSourceFromLink`, `getDaySummary` |
| Types/Interfaces | PascalCase | `Source`, `DaySummary`, `TaskProposal` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_DAY_REFRESH_HOUR` |
| SQL tables | snake_case plural | `task_proposals`, `day_summaries` |
| SQL columns | snake_case | `workspace_id`, `created_at` |
| Routes | kebab-case | `/day/today`, `/day/sources` |

**Language rule:** All technical code in English. UI labels and copy in Spanish (product language).

---

## App Router Structure

```
/apps/web/src/app/
  (auth)/
    login/page.tsx
  (app)/
    layout.tsx              ← Shell + sidebar
    dashboard/page.tsx
    day/
      today/page.tsx        ← HOME OPERATIVO REAL
      sources/page.tsx
      analysis-summary/page.tsx
      tasks-generated/page.tsx
      insights/page.tsx
      metrics/page.tsx
      alerts/page.tsx
      feedback/page.tsx
    tasks/page.tsx
    objectives/page.tsx
    metrics/page.tsx
    insights/page.tsx
    alerts/page.tsx
```

---

## Non-Negotiable Rules

1. **Frontend does NOT orchestrate backend logic.** n8n is the orchestrator.
2. **AI proposes; human approves.** Never create `tasks` directly from AI output — always via `task_proposals` + approval.
3. **Supabase is the single source of truth** — not Google Sheets, not Drive.
4. **No secrets in code or docs.** Reference variable names only.
5. **One slice at a time.** Don't open Release 2 features before Release 1 is verified.
6. **Traceability is mandatory:** every task must trace back to → finding → analysis → source.
7. **SQL must be reproducible** — always via versioned migrations in `/supabase/migrations`.

---

## Current Implementation Status

### Release 1 Scope (Build Now)
- [ ] Login with Google
- [ ] App shell + sidebar navigation
- [ ] Día > Hoy (`/day/today`) — mock data initially
- [ ] Día > Fuentes (`/day/sources`) — list + "Añadir recurso" form
- [ ] Source states: pending → processing → processed / error
- [ ] Supabase schema (Release 1 tables)
- [ ] n8n: `add-source` + `process-source` workflows
- [ ] Gemini analysis → findings → day summary

### Not Yet (Release 2+)
- Task proposals UI and approval flow
- Objectives & KRs module
- Global metrics, insights, alerts modules
- Auto-update engine
- Google Calendar integration

---

## Environment Variables

See `.env.example` for all required variables. Never commit real values.

---

## How to Work in This Repo

1. Always read relevant doc(s) before implementing
2. Propose structure/approach before writing code for anything that touches schema, auth, navigation, or services
3. Keep changes small and verifiable
4. If a decision contradicts a master document, stop and flag it — don't improvise
5. Commit format: `feat(day): add today summary shell`, `fix(sources): handle invalid link`
6. Branch format: `feat/day-today-shell`, `feat/source-processing`

---

## Useful References

- Implementation order: `docs/03-build/IMPLEMENTATION_ROADMAP.md`
- Prompt templates: `docs/03-build/PROMPT_LIBRARY.md`
- Credentials status: `docs/03-build/CREDENTIALS_AND_SETUP_CHECKLIST.md`
