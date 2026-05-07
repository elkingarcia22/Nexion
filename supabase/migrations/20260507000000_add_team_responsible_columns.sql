-- Add team and responsible columns to task_proposals
-- Created: 2026-05-07
-- Purpose: Enable filtering by team and responsible person

alter table public.task_proposals
  add column team text,
  add column responsible text;

-- Index for performance
create index idx_task_proposals_team on public.task_proposals(team);
create index idx_task_proposals_responsible on public.task_proposals(responsible);
