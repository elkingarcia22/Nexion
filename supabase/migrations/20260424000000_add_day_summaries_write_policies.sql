-- Add missing columns to day_summaries
ALTER TABLE public.day_summaries ADD COLUMN IF NOT EXISTS summary_text TEXT;
ALTER TABLE public.day_summaries ADD COLUMN IF NOT EXISTS feedback_count INTEGER DEFAULT 0;

-- Add INSERT and UPDATE policies for day_summaries table
-- Allows users to insert/update day summaries for their workspace

-- Drop policies if they exist to avoid errors
DROP POLICY IF EXISTS "users_can_insert_day_summaries" ON public.day_summaries;
DROP POLICY IF EXISTS "users_can_update_day_summaries" ON public.day_summaries;

CREATE POLICY "users_can_insert_day_summaries"
  ON public.day_summaries FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_memberships
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "users_can_update_day_summaries"
  ON public.day_summaries FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_memberships
      WHERE profile_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_memberships
      WHERE profile_id = auth.uid()
    )
  );
