-- Migration: Robust Jira-like schema for tasks, comments, and history
-- Created: 2026-04-25

-- 1. Add goal_id and parent_id to task_proposals
ALTER TABLE public.task_proposals 
ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES public.workspace_objectives(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.task_proposals(id) ON DELETE CASCADE;

-- 2. Rename objective_title to title in workspace_objectives for consistency
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workspace_objectives' AND column_name='objective_title') THEN
        ALTER TABLE public.workspace_objectives RENAME COLUMN objective_title TO title;
    END IF;
END $$;

-- 3. Create Task Comments table (Jira style)
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.task_proposals(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create Task History/Activity table (Jira style)
CREATE TABLE IF NOT EXISTS public.task_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.task_proposals(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL, -- 'status_change', 'priority_change', 'assignment', 'comment_added', etc.
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Enable RLS for new tables
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for Task Comments
CREATE POLICY "Users can view comments for tasks in their workspace"
    ON public.task_comments FOR SELECT
    USING (
        task_id IN (
            SELECT id FROM public.task_proposals 
            WHERE workspace_id IN (
                SELECT workspace_id FROM public.workspace_memberships WHERE profile_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can add comments to tasks in their workspace"
    ON public.task_comments FOR INSERT
    WITH CHECK (
        task_id IN (
            SELECT id FROM public.task_proposals 
            WHERE workspace_id IN (
                SELECT workspace_id FROM public.workspace_memberships WHERE profile_id = auth.uid()
            )
        )
    );

-- 7. RLS Policies for Task History
CREATE POLICY "Users can view history for tasks in their workspace"
    ON public.task_history FOR SELECT
    USING (
        task_id IN (
            SELECT id FROM public.task_proposals 
            WHERE workspace_id IN (
                SELECT workspace_id FROM public.workspace_memberships WHERE profile_id = auth.uid()
            )
        )
    );

-- 8. Add Indexes
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON public.task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_proposals_goal_id ON public.task_proposals(goal_id);
