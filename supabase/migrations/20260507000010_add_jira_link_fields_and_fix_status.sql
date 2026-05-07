-- Migration: Add missing Jira linking fields and fix status default
-- Created: 2026-05-07
-- Context: Migration 20260429000000 was never applied to production.
--          Status column has a Spanish default ('pendiente') that breaks frontend filters.

-- Add Jira linking fields (idempotent)
ALTER TABLE public.task_proposals
  ADD COLUMN IF NOT EXISTS linked_jira_key TEXT,
  ADD COLUMN IF NOT EXISTS linked_jira_subtask_id TEXT;

CREATE INDEX IF NOT EXISTS idx_task_proposals_jira_key ON public.task_proposals(linked_jira_key);

-- Fix: change status default from Spanish 'pendiente' to English canonical 'pending_review'
ALTER TABLE public.task_proposals
  ALTER COLUMN status SET DEFAULT 'pending_review';

-- Backfill: update existing rows where status is still the legacy Spanish value
UPDATE public.task_proposals
  SET status = 'pending_review'
  WHERE status = 'pendiente';