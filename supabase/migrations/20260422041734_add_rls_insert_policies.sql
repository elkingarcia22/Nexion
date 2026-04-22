-- Add INSERT policies for workspaces, profiles, and workspace_memberships to allow new user registration

-- Allow authenticated users to create workspaces
CREATE POLICY "users_can_create_workspaces"
  ON public.workspaces FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to create their own profile
CREATE POLICY "users_can_create_their_profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Allow authenticated users to create their own workspace memberships
CREATE POLICY "users_can_create_their_membership"
  ON public.workspace_memberships FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());
