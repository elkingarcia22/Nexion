-- Analítica de producto: per-product reports at nested levels, published to Slack and browsable in Nexión.
-- Weekly "Radar semanal" (PostHog behaviour) and biweekly "Pulso quincenal" (business data) feed the
-- monthly report, which feeds the quarterly, which feeds the semiannual and annual reports.

create table if not exists public.analytics_products (
  id text primary key,
  name text not null,
  slack_channel_name text not null,
  slack_channel_id text,
  /** PostHog project, host filter, key events, funnel, friction scope, internal filters… */
  posthog_config jsonb not null default '{}'::jsonb,
  /** BigQuery (Ubits MCP) queries, OKR sheet, feedback sheet, Jira filter, Slack List ids… */
  business_config jsonb not null default '{}'::jsonb,
  /** Report types this product runs, e.g. ["radar_semanal","pulso_quincenal","mensual",…]. */
  enabled_reports text[] not null default '{}',
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.analytics_reports (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.analytics_products(id) on delete cascade,
  report_type text not null check (
    report_type in ('radar_semanal', 'pulso_quincenal', 'mensual', 'trimestral', 'semestral', 'anual')
  ),
  /** 2026-W40, 2026-W39-W40, 2026-09, 2026-Q3, 2026-H2, 2026 */
  period_key text not null,
  period_start date not null,
  period_end date not null,
  status text not null check (status in ('published', 'preview', 'failed', 'partial')),
  /** green / yellow / red overall reading of the period. */
  health text check (health in ('green', 'yellow', 'red')),
  /** KPIs and datasets (funnel, features, friction, replays, companies at risk, OKRs, feedback…). */
  data jsonb not null default '{}'::jsonb,
  /** Which sources answered and which were missing, so a partial report says what it lacks. */
  coverage jsonb not null default '{}'::jsonb,
  /** Full model output: headline, summary, insights, hypotheses, evidence. */
  analysis jsonb,
  /** Slack mrkdwn exactly as published. */
  message text,
  /** Lower-level reports this one was built from (drill-down). */
  child_report_ids uuid[] not null default '{}',
  error text,
  model text,
  usage jsonb,
  slack_ts text,
  trigger text not null default 'cron' check (trigger in ('cron', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, report_type, period_key)
);

create index if not exists idx_analytics_reports_browse
  on public.analytics_reports (product_id, report_type, period_start desc);

create table if not exists public.analytics_actions (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.analytics_products(id) on delete cascade,
  /** Stable key so the same signal does not create a new action every week. */
  action_key text not null,
  title text not null,
  detail text,
  origin_report_id uuid references public.analytics_reports(id) on delete set null,
  origin_period_key text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done', 'dropped')),
  result text,
  owner text,
  last_reviewed_report_id uuid references public.analytics_reports(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  unique (product_id, action_key)
);

alter table public.analytics_products enable row level security;
alter table public.analytics_reports enable row level security;
alter table public.analytics_actions enable row level security;

create policy "authenticated_can_read_analytics_products"
  on public.analytics_products for select to authenticated using (true);
create policy "authenticated_can_read_analytics_reports"
  on public.analytics_reports for select to authenticated using (true);
create policy "authenticated_can_read_analytics_actions"
  on public.analytics_actions for select to authenticated using (true);

-- The UI may only move an action through its lifecycle; everything else is written by the pipelines.
create policy "authenticated_can_update_analytics_actions"
  on public.analytics_actions for update to authenticated using (true) with check (true);
revoke update on public.analytics_actions from authenticated, anon;
grant update (status, result, owner, updated_at, closed_at) on public.analytics_actions to authenticated;

-- ---------------------------------------------------------------------------
-- Seed: the five products and their Slack channels ("Metricas de producto" section)
-- ---------------------------------------------------------------------------
insert into public.analytics_products (id, name, slack_channel_name, enabled_reports, sort_order)
values
  ('hiring', 'Hiring', 'hiring-métricas',
    array['radar_semanal', 'pulso_quincenal', 'mensual', 'trimestral', 'semestral', 'anual'], 1),
  ('objetivos', 'Objetivos', 'objetivos-métricas',
    array['pulso_quincenal', 'mensual', 'trimestral', 'semestral', 'anual'], 2),
  ('matriz-talento', 'Matriz de talento', 'matriz-de-talento-métricas',
    array['pulso_quincenal', 'mensual', 'trimestral', 'semestral', 'anual'], 3),
  ('encuestas', 'Encuestas', 'encuestas-métricas',
    array['pulso_quincenal', 'mensual', 'trimestral', 'semestral', 'anual'], 4),
  ('evaluacion-360', 'Evaluación 360', 'evaluación-360-métricas', array[]::text[], 5)
on conflict (id) do nothing;
