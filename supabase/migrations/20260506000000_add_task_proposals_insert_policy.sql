-- Add INSERT and UPDATE policies for task_proposals table
-- This allows workspace members to create and modify tasks

-- Policy: Users can insert tasks in their workspace
create policy "users_can_insert_task_proposals"
  on public.task_proposals for insert
  with check (
    workspace_id in (
      select workspace_id
      from public.workspace_memberships
      where profile_id = auth.uid()
    )
  );

-- Policy: Users can update tasks in their workspace
create policy "users_can_update_task_proposals"
  on public.task_proposals for update
  using (
    workspace_id in (
      select workspace_id
      from public.workspace_memberships
      where profile_id = auth.uid()
    )
  )
  with check (
    workspace_id in (
      select workspace_id
      from public.workspace_memberships
      where profile_id = auth.uid()
    )
  );

-- Policy: Users can delete tasks in their workspace (for cleanup of old auto-generated ones)
create policy "users_can_delete_task_proposals"
  on public.task_proposals for delete
  using (
    workspace_id in (
      select workspace_id
      from public.workspace_memberships
      where profile_id = auth.uid()
    )
  );
