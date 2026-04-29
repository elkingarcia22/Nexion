-- Migration: Add linking fields between AI tasks and Jira issues
-- Created: 2026-04-29

ALTER TABLE public.task_proposals 
ADD COLUMN IF NOT EXISTS linked_jira_key TEXT,
ADD COLUMN IF NOT EXISTS linked_jira_subtask_id TEXT;

-- Add index for linking lookups
CREATE INDEX IF NOT EXISTS idx_task_proposals_jira_link ON public.task_proposals(linked_jira_key);
