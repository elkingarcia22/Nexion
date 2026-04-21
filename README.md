# Nexión — Ecosistema de Gestión Operativa

**Nexión** es una plataforma B2B que transforma fuentes de información dispersas en claridad operativa: tareas, insights, alertas, métricas y trabajo vinculado con objetivos estratégicos.

---

## ¿Qué hace Nexión?

El sistema conecta fuentes (reuniones, documentos, feedback, notas) con una cadena trazable:

```
Fuente → Análisis IA → Hallazgo → Propuesta → Aprobación Humana → Tarea
                                                                      ↓
                                               Insights / Alertas / Métricas
                                                                      ↓
                                                    Vinculación con OKRs/KRs
```

El home operativo real es **Día > Hoy** — no el Dashboard.

---

## Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Base de datos | Supabase (PostgreSQL) |
| Auth | Supabase Auth + Google OAuth |
| Automatización | n8n Cloud |
| Análisis IA | Gemini Developer API |
| Deploy | Vercel |
| Repo | GitHub |

---

## Estructura del Proyecto

```
/docs                 → Documentación maestra del sistema
  /00-foundation      → Brief, dominio, diseño, flujos
  /01-product-logic   → Arquitectura de información, pantallas, motores
  /02-technical       → Arquitectura técnica, schema, contratos, integraciones
  /03-build           → Reglas de build, convenciones, roadmap, prompts
  /04-decisions       → Decisiones de arquitectura (ADRs)

/apps/web             → Frontend Next.js 14
/packages             → Paquetes compartidos (ui, types, config, lib)
/supabase/migrations  → Migraciones SQL versionadas
/automation/n8n       → Workflows de n8n exportados y documentados
/scripts              → Scripts de soporte operativo
```

---

## Documentos Maestros

La documentación del sistema vive en `/docs`. Los documentos principales son:

| Documento | Propósito |
|-----------|----------|
| `PROJECT_MASTER_BRIEF` | Definición del producto, releases, módulos |
| `INFORMATION_ARCHITECTURE` | Navegación y jerarquía de pantallas |
| `DOMAIN_MODEL` | Entidades del dominio y sus relaciones |
| `DESIGN` | Sistema de diseño Ubits Brand Kit |
| `TECH_ARCHITECTURE` | Stack, capas y decisiones técnicas |
| `SUPABASE_SCHEMA_SPEC` | Especificación lógica del schema |
| `BUILD_RULES` | Reglas obligatorias de construcción |
| `CODEBASE_CONVENTIONS` | Naming, estructura, patrones de código |
| `IMPLEMENTATION_ROADMAP` | Orden de implementación por fases |

---

## Variables de Entorno

Ver `.env.example` para la lista completa de variables requeridas.

```bash
cp .env.example .env.local
# Completar con los valores reales
```

---

## Cómo Trabajar en Este Repo

Antes de implementar cualquier cosa, leer `CLAUDE.md` en la raíz del proyecto.

### Reglas no negociables

1. El frontend no orquesta lógica de backend ni automatización
2. Las tareas definitivas requieren aprobación humana — nunca creación automática
3. Supabase es la fuente de verdad estructurada
4. Toda migración SQL vive en `/supabase/migrations` con nombre `YYYYMMDDHHMMSS_description.sql`
5. Los secretos nunca se hardcodean en código ni documentos

### Convenciones de commits

```
feat(day): add today summary shell
feat(sources): implement add-resource form
fix(auth): handle google oauth redirect
docs(schema): add release 1 migration spec
chore(repo): add env example
```

### Branches

```
feat/day-today-shell
feat/source-processing
feat/auth-google
fix/source-status-bug
docs/schema-release-1
```

---

## Releases

| Release | Scope |
|---------|-------|
| **Release 1** | Login, shell, Día > Fuentes, añadir recurso, procesamiento, resultado estructurado |
| **Release 2** | Propuestas de tarea, aprobación humana, módulo global Tareas |
| **Release 3** | Objetivos y KRs, vínculos tarea ↔ objetivo |
| **Release 4** | Métricas, insights, alertas globales y diarias maduros |
| **Release 5** | Dashboard ejecutivo, autoactualización madura, agenda del día |

---

## Para Claude Code y Antigravity

Leer `CLAUDE.md` en la raíz antes de cualquier implementación.
