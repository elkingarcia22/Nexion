-- Nexión: Fix workspace_memberships on user signup
-- Created: 2026-05-11
-- Purpose: Both the trigger and RPC signup flows were missing the
-- workspace_memberships insert. All RLS policies check this table,
-- so new users could not read/write any data.

-- 1. Fix the trigger function that runs on auth user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  workspace_id uuid;
  user_email text;
  user_name text;
begin
  user_email := new.email;
  user_name := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(user_email, '@', 1));

  insert into public.workspaces (name, slug, status)
  values (
    coalesce(user_name, 'Mi Workspace'),
    'workspace-' || replace(new.id::text, '-', ''),
    'active'
  )
  returning id into workspace_id;

  insert into public.profiles (id, workspace_id, email, full_name, role, is_active)
  values (
    new.id,
    workspace_id,
    user_email,
    user_name,
    'owner',
    true
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    updated_at = now();

  insert into public.workspace_memberships (workspace_id, profile_id, membership_role, status)
  values (workspace_id, new.id, 'owner', 'active')
  on conflict (workspace_id, profile_id) do nothing;

  return new;
end;
$$;

-- 2. Fix the RPC function for manual profile creation
create or replace function public.ensure_profile_exists(user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  user_record auth.users%rowtype;
  workspace_id uuid;
  user_email text;
  user_name text;
begin
  if exists (select 1 from public.profiles where id = user_id) then
    return;
  end if;

  select * into user_record from auth.users where id = user_id;

  if not found then
    raise exception 'User not found';
  end if;

  user_email := user_record.email;
  user_name := coalesce(user_record.raw_user_meta_data->>'full_name', user_record.raw_user_meta_data->>'name', split_part(user_email, '@', 1));

  insert into public.workspaces (name, slug, status)
  values (
    coalesce(user_name, 'Mi Workspace'),
    'workspace-' || replace(user_id::text, '-', ''),
    'active'
  )
  returning id into workspace_id;

  insert into public.profiles (id, workspace_id, email, full_name, role, is_active)
  values (
    user_id,
    workspace_id,
    user_email,
    user_name,
    'owner',
    true
  );

  insert into public.workspace_memberships (workspace_id, profile_id, membership_role, status)
  values (workspace_id, user_id, 'owner', 'active')
  on conflict (workspace_id, profile_id) do nothing;
end;
$$;

-- 3. Backfill missing workspace_memberships for existing users
--    that were created before this fix was applied
insert into public.workspace_memberships (workspace_id, profile_id, membership_role, status)
select p.workspace_id, p.id, 'owner', 'active'
from public.profiles p
where p.workspace_id is not null
  and not exists (
    select 1 from public.workspace_memberships wm
    where wm.profile_id = p.id and wm.workspace_id = p.workspace_id
  );
