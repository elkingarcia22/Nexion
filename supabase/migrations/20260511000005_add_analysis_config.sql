-- Nexión: Add analysis_config to workspaces
-- Purpose: Store selected products and responsables for AI analysis filtering

alter table public.workspaces
add column if not exists analysis_config jsonb
default '{"selected_products": [], "selected_responsibles": []}'::jsonb;
