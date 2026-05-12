-- Nexión: Add objectives_config to workspaces
-- Purpose: Store configurable Google Sheet ID and selected teams per workspace

alter table public.workspaces
add column if not exists objectives_config jsonb
default '{"spreadsheet_id": "1_2xmTZTSNKdjYO1oJ1H79UCQ6rlOQvwxXfOUdV6tbUI", "selected_teams": []}'::jsonb;
