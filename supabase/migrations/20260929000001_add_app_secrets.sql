-- Organization-level API keys entered from Configuración (e.g. the Claude key used by Boletines).
-- No RLS policies on purpose: only the service role (server API routes) can read or write.
-- The browser only ever sees whether a key is set and its last 4 characters.

create table if not exists public.app_secrets (
  name text primary key,
  value text not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;
