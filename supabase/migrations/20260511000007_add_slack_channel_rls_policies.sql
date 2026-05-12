-- Add missing UPDATE and DELETE policies for app_slack_channels
-- The table only had INSERT and SELECT, but setChannelEnabled uses upsert
-- which triggers an UPDATE on conflict, blocked by RLS.

create policy "users_can_update_slack_channels"
  on public.app_slack_channels for update
  using (
    workspace_id in (
      select workspace_id
      from public.workspace_memberships
      where profile_id = auth.uid()
    )
  );

create policy "users_can_delete_slack_channels"
  on public.app_slack_channels for delete
  using (
    workspace_id in (
      select workspace_id
      from public.workspace_memberships
      where profile_id = auth.uid()
    )
  );
