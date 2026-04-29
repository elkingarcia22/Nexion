-- Migration: Add Jira configuration to workspaces
-- Created: 2026-04-28

ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS jira_config JSONB DEFAULT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.workspaces.jira_config IS 'Stores Jira integration settings: {siteUrl, email, apiToken}';
