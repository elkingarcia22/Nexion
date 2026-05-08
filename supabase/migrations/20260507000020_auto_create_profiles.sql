-- Nexión: Auto-create profiles on user signup
-- Created: 2026-05-07
-- Purpose: Trigger to automatically create a profile when a new user signs up via Supabase Auth

-- Function to handle new user signup
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
  -- Get user info from the new user
  user_email := new.email;
  user_name := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(user_email, '@', 1));
  
  -- Create a personal workspace for the user
  insert into public.workspaces (name, slug, status)
  values (
    coalesce(user_name, 'Mi Workspace'),
    'workspace-' || replace(new.id::text, '-', ''),
    'active'
  )
  returning id into workspace_id;
  
  -- Create the profile
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
  
  return new;
end;
$$;

-- Trigger the function every time a user is created
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Also handle existing users who might sign in but don't have a profile
-- This function can be called manually or via RPC
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
  -- Check if profile already exists
  if exists (select 1 from public.profiles where id = user_id) then
    return;
  end if;
  
  -- Get user info
  select * into user_record from auth.users where id = user_id;
  
  if not found then
    raise exception 'User not found';
  end if;
  
  user_email := user_record.email;
  user_name := coalesce(user_record.raw_user_meta_data->>'full_name', user_record.raw_user_meta_data->>'name', split_part(user_email, '@', 1));
  
  -- Create workspace
  insert into public.workspaces (name, slug, status)
  values (
    coalesce(user_name, 'Mi Workspace'),
    'workspace-' || replace(user_id::text, '-', ''),
    'active'
  )
  returning id into workspace_id;
  
  -- Create profile
  insert into public.profiles (id, workspace_id, email, full_name, role, is_active)
  values (
    user_id,
    workspace_id,
    user_email,
    user_name,
    'owner',
    true
  );
end;
$$;
