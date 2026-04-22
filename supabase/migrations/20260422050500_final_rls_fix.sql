-- Final RLS Fix: Ensure workspace creation and initial selection works
-- This migration ensures that authenticated users can create their first workspace
-- and see it during the onboarding process.

-- 1. Ensure RLS is enabled
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_memberships ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing conflicting policies to avoid errors
DROP POLICY IF EXISTS "users_can_create_workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "users_can_view_their_workspace" ON public.workspaces;
DROP POLICY IF EXISTS "users_can_read_their_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_can_create_their_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_can_read_their_memberships" ON public.workspace_memberships;
DROP POLICY IF EXISTS "users_can_create_their_membership" ON public.workspace_memberships;

-- 3. Workspaces: Allow creation and broad read for authenticated users
-- (Reading workspaces is generally safe as it only contains metadata like name/slug)
CREATE POLICY "authenticated_can_create_workspaces"
  ON public.workspaces FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_can_read_workspaces"
  ON public.workspaces FOR SELECT
  TO authenticated
  USING (true);

-- 4. Profiles: Allow users to manage their own profile
CREATE POLICY "users_can_manage_own_profile"
  ON public.profiles FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 5. Memberships: Allow users to manage their own memberships
CREATE POLICY "users_can_manage_own_memberships"
  ON public.workspace_memberships FOR ALL
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- 6. Ensure other tables have basic SELECT policies if they were missing
-- This avoids the "empty results" problem due to RLS
DO $$
BEGIN
    -- Sources
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_can_select_workspace_sources') THEN
        CREATE POLICY "users_can_select_workspace_sources" ON public.sources
            FOR SELECT TO authenticated USING (workspace_id IN (SELECT workspace_id FROM public.workspace_memberships WHERE profile_id = auth.uid()));
    END IF;
    
    -- Day Summaries
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_can_select_day_summaries') THEN
        CREATE POLICY "users_can_select_day_summaries" ON public.day_summaries
            FOR SELECT TO authenticated USING (workspace_id IN (SELECT workspace_id FROM public.workspace_memberships WHERE profile_id = auth.uid()));
    END IF;
END $$;
