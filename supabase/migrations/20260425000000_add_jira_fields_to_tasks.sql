-- Migration: Add Jira-style fields to task_proposals
-- Created: 2026-04-25

ALTER TABLE public.task_proposals 
ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS labels TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS team TEXT,
ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS activity JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendiente',
ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

-- Add indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_task_proposals_assignee ON public.task_proposals(assignee_id);
CREATE INDEX IF NOT EXISTS idx_task_proposals_reporter ON public.task_proposals(reporter_id);
CREATE INDEX IF NOT EXISTS idx_task_proposals_team ON public.task_proposals(team);
