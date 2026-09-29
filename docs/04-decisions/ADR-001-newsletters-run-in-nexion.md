# ADR-001 — Boletines run inside Nexión, not n8n

- **Status:** Accepted
- **Date:** 2026-09-29
- **Deciders:** Elkin Garcia

## Context

The Slack newsletters ("IA news day", "HR radar", "Radar producto", "Entendimiento de procesos RH",
"IA usability and prompts") were built as n8n workflows. They keep their sources and history in
n8n data tables, so the team can't see or manage them from Nexión, and each workflow is a ~20–50 node
chain of Code nodes that is hard to test or version.

`CLAUDE.md` rule 1 says "n8n is the orchestrator". Keeping these workflows in n8n would satisfy it, but
Nexión would then only mirror data that lives elsewhere, which contradicts rule 3 (Supabase is the
single source of truth).

## Decision

Newsletters are a first-class Nexión module ("Boletines", `/newsletters`):

- Configuration, sources, editions and published-URL history live in Supabase
  (`newsletters`, `newsletter_sources`, `newsletter_editions`, `newsletter_seen_items`).
- The pipeline runs in a server API route (`/api/cron/newsletters`), scheduled by Vercel Cron.
  It runs server-side, never in the browser, so rule 1's intent (the frontend doesn't orchestrate) still holds.
- Pipeline logic lives in `apps/web/src/lib/newsletters/` as pure, unit-tested functions, with I/O
  (feeds, Claude, Slack, Supabase) injected at the edges.
- AI still only proposes content: every model output is validated (format, exact selected URLs,
  no hype phrases) before it can reach Slack, and a manual "preview" mode stores a draft without publishing.

This is an exception to rule 1 scoped to newsletters. Source processing and the other flows listed in
`AUTOMATION_ARCHITECTURE.md` stay in n8n.

## Consequences

- Each migrated workflow must be switched off in n8n once its Nexión version is live, or Slack gets duplicate posts.
- New secrets on Vercel: `ANTHROPIC_API_KEY`, `SLACK_BOT_TOKEN`, `CRON_SECRET`.
- A run must fit in the 60s function limit: feeds are fetched concurrently with a 10s timeout each.
- Adding the next newsletter means writing its pipeline module and registering it in `newsletter-service.ts`.
