-- Nexión: Add onboarding_completed column to workspaces
-- Purpose: Track whether a workspace has completed the first-time setup wizard

alter table public.workspaces add column if not exists onboarding_completed boolean not null default false;
