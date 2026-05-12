alter table public.workspaces
add column if not exists gemini_api_key text;
