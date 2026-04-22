-- Nexión Release 1 — Base schema
-- Created: 2026-04-21
-- Purpose: Core tables for Release 1 (auth, workspaces, sources, analysis, day engine)

-- ============================================================================
-- Enums
-- ============================================================================

create type public.source_status as enum (
  'pending',      -- waiting to be processed
  'processing',   -- currently being analyzed
  'processed',    -- analysis complete
  'error',        -- processing failed
  'archived'      -- no longer active
);

create type public.finding_type as enum (
  'feedback',
  'insight',
  'alert',
  'metric_signal',
  'opportunity'
);

create type public.task_priority as enum (
  'high',
  'medium',
  'low'
);

create type public.proposal_status as enum (
  'pending_review',    -- waiting for human approval
  'approved',          -- user approved
  'rejected',          -- user rejected
  'applied'            -- action executed
);

create type public.membership_role as enum (
  'owner',
  'admin',
  'member',
  'viewer'
);

-- ============================================================================
-- Core tables
-- ============================================================================

-- workspaces: organizational container
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- profiles: user profile in Nexión (separate from Supabase Auth)
create table public.profiles (
  id uuid primary key,  -- same as auth.users.id
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role text not null default 'member',
  timezone text default 'UTC',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- workspace_memberships: flexible user-workspace relationship
create table public.workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  membership_role public.membership_role not null default 'member',
  status text not null default 'active',
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, profile_id)
);

-- ============================================================================
-- Sources and processing
-- ============================================================================

-- sources: registered sources entering the system
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  source_type text not null,
  source_origin text not null,
  ingest_mode text not null,
  title text not null,
  original_url text,
  external_source_id text,
  source_date timestamptz,
  detected_at timestamptz default now(),
  last_seen_at timestamptz,
  last_modified_at_external timestamptz,
  current_status public.source_status not null default 'pending',
  access_status text not null default 'accessible',
  current_hash text,
  metadata jsonb default '{}',
  needs_reprocessing boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- source_runs: log of each processing attempt
create table public.source_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  run_type text not null,
  run_trigger text not null,
  run_status text not null default 'pending',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error_code text,
  error_message text,
  model_provider text,
  model_name text,
  input_hash text,
  output_version text,
  execution_metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- Analysis and findings
-- ============================================================================

-- analyses: structured result of source analysis
create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  source_run_id uuid not null references public.source_runs(id) on delete cascade,
  analysis_status text not null default 'completed',
  summary_short text,
  summary_structured jsonb default '{}',
  confidence_score decimal(3, 2),
  model_provider text,
  model_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- findings: extracted structured units from analysis
create table public.findings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  finding_type public.finding_type not null,
  title text not null,
  description text,
  context jsonb default '{}',
  relevance_score decimal(3, 2),
  can_generate_task boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- Tasks and proposals
-- ============================================================================

-- task_proposals: AI-proposed tasks pending human approval
create table public.task_proposals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_id uuid references public.sources(id) on delete set null,
  finding_id uuid references public.findings(id) on delete set null,
  title text not null,
  description text,
  priority public.task_priority not null default 'medium',
  suggested_date date,
  proposal_status public.proposal_status not null default 'pending_review',
  approved_by_profile_id uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- Day engine
-- ============================================================================

-- day_summaries: consolidated daily operational context
create table public.day_summaries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  summary_date date not null,
  focus_text text,
  source_count integer default 0,
  finding_count integer default 0,
  proposal_count integer default 0,
  alert_count integer default 0,
  insight_count integer default 0,
  kpi_data jsonb default '{}',
  auto_update_run_count integer default 0,
  auto_update_timestamp timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, summary_date)
);

-- ============================================================================
-- Indexes for performance
-- ============================================================================

-- Workspace scoping indexes
create index idx_sources_workspace on public.sources(workspace_id);
create index idx_source_runs_workspace on public.source_runs(workspace_id);
create index idx_analyses_workspace on public.analyses(workspace_id);
create index idx_findings_workspace on public.findings(workspace_id);
create index idx_task_proposals_workspace on public.task_proposals(workspace_id);
create index idx_day_summaries_workspace on public.day_summaries(workspace_id);

-- Relationship indexes
create index idx_source_runs_source on public.source_runs(source_id);
create index idx_analyses_source_run on public.analyses(source_run_id);
create index idx_findings_analysis on public.findings(analysis_id);
create index idx_findings_source on public.findings(source_id);
create index idx_task_proposals_source on public.task_proposals(source_id);
create index idx_task_proposals_finding on public.task_proposals(finding_id);

-- Status and filtering
create index idx_sources_status on public.sources(current_status);
create index idx_task_proposals_status on public.task_proposals(proposal_status);
create index idx_source_runs_status on public.source_runs(run_status);
create index idx_day_summaries_date on public.day_summaries(summary_date);

-- Soft delete indexes
create index idx_sources_deleted on public.sources(deleted_at);
create index idx_workspaces_deleted on public.workspaces(deleted_at);

-- ============================================================================
-- Row Level Security (basic Release 1)
-- ============================================================================

alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.sources enable row level security;
alter table public.source_runs enable row level security;
alter table public.analyses enable row level security;
alter table public.findings enable row level security;
alter table public.task_proposals enable row level security;
alter table public.day_summaries enable row level security;

-- Workspace members can see workspace data
create policy "users_can_view_their_workspace"
  on public.workspaces for select
  using (
    id in (
      select workspace_id
      from public.workspace_memberships
      where profile_id = auth.uid()
    )
  );

-- Users can view sources in their workspace
create policy "users_can_view_workspace_sources"
  on public.sources for select
  using (
    workspace_id in (
      select workspace_id
      from public.workspace_memberships
      where profile_id = auth.uid()
    )
  );

-- Similar policies for other tables (source_runs, analyses, findings, task_proposals, day_summaries)
create policy "users_can_view_source_runs"
  on public.source_runs for select
  using (
    workspace_id in (
      select workspace_id
      from public.workspace_memberships
      where profile_id = auth.uid()
    )
  );

create policy "users_can_view_analyses"
  on public.analyses for select
  using (
    workspace_id in (
      select workspace_id
      from public.workspace_memberships
      where profile_id = auth.uid()
    )
  );

create policy "users_can_view_findings"
  on public.findings for select
  using (
    workspace_id in (
      select workspace_id
      from public.workspace_memberships
      where profile_id = auth.uid()
    )
  );

create policy "users_can_view_task_proposals"
  on public.task_proposals for select
  using (
    workspace_id in (
      select workspace_id
      from public.workspace_memberships
      where profile_id = auth.uid()
    )
  );

create policy "users_can_view_day_summaries"
  on public.day_summaries for select
  using (
    workspace_id in (
      select workspace_id
      from public.workspace_memberships
      where profile_id = auth.uid()
    )
  );


