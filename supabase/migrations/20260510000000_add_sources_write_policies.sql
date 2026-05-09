-- Fix DELETE policy for sources table
-- The old policy only allowed deletion when created_by_profile_id = auth.uid()
-- but Slack sources have created_by_profile_id = null, so no one could delete them
-- during Slack sync cleanup. Changed to use workspace membership like other policies.

drop policy if exists "users_can_delete_sources" on public.sources;

create policy "users_can_delete_sources"
  on public.sources for delete
  using (
    workspace_id in (
      select workspace_id
      from public.workspace_memberships
      where profile_id = auth.uid()
    )
  );
