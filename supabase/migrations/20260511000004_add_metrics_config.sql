-- Nexión: Add metrics_config to workspaces
-- Purpose: Store selected categories for the metrics view per workspace

alter table public.workspaces
add column if not exists metrics_config jsonb
default '{"selected_categories": []}'::jsonb;
