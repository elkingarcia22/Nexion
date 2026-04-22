-- Fix RLS policies: add SELECT and UPDATE for profiles and workspaces
-- Note: workspace_memberships.membership_role is the correct column (not role)

-- Profiles: allow users to read their own profile
CREATE POLICY "users_can_read_their_profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Profiles: allow users to update their own profile
CREATE POLICY "users_can_update_their_profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Workspace memberships: allow users to read their memberships
CREATE POLICY "users_can_read_their_memberships"
  ON public.workspace_memberships FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid() OR workspace_id IN (
    SELECT workspace_id FROM public.workspace_memberships WHERE profile_id = auth.uid()
  ));

-- Workspaces: allow users to read workspaces they're a member of (already exists in base)
-- This supplements the existing policy if needed

-- Workspaces: allow users to update their own workspaces (owners only)
CREATE POLICY "users_can_update_their_workspaces"
  ON public.workspaces FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT workspace_id FROM public.workspace_memberships
      WHERE profile_id = auth.uid() AND membership_role = 'owner'
    )
  )
  WITH CHECK (
    id IN (
      SELECT workspace_id FROM public.workspace_memberships
      WHERE profile_id = auth.uid() AND membership_role = 'owner'
    )
  );

-- Sources: allow users to create sources in their workspaces
CREATE POLICY "users_can_create_sources"
  ON public.sources FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_memberships
      WHERE profile_id = auth.uid()
    )
  );

-- Sources: allow users to update their own sources
CREATE POLICY "users_can_update_sources"
  ON public.sources FOR UPDATE
  TO authenticated
  USING (
    created_by_profile_id = auth.uid() AND
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_memberships
      WHERE profile_id = auth.uid()
    )
  )
  WITH CHECK (
    created_by_profile_id = auth.uid() AND
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_memberships
      WHERE profile_id = auth.uid()
    )
  );

-- Sources: allow users to delete their own sources
CREATE POLICY "users_can_delete_sources"
  ON public.sources FOR DELETE
  TO authenticated
  USING (
    created_by_profile_id = auth.uid() AND
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_memberships
      WHERE profile_id = auth.uid()
    )
  );
