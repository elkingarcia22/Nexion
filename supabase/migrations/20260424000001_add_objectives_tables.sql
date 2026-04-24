-- Migration: Add Objectives and Initiatives tables for OKR syncing
-- Created: 2026-04-24

-- 1. Objectives Table (from Q1/Q2 tabs)
CREATE TABLE IF NOT EXISTS public.workspace_objectives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    team TEXT,
    quarter TEXT,
    objective_title TEXT,
    narrative TEXT,
    type TEXT,
    key_result TEXT,
    weight NUMERIC,
    progress NUMERIC,
    score NUMERIC,
    initiatives_comments TEXT,
    external_row_index INTEGER,
    last_synced_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, quarter, objective_title, key_result)
);

-- 2. Initiatives Table (from Tablero Producto tab)
CREATE TABLE IF NOT EXISTS public.workspace_initiatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT,
    okr_reference TEXT,
    owner TEXT,
    status TEXT,
    quarter TEXT,
    impact TEXT,
    effort TEXT,
    priority TEXT,
    last_synced_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, title, quarter)
);

-- Enable RLS
ALTER TABLE public.workspace_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_initiatives ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Objectives
CREATE POLICY "Users can view objectives of their workspaces"
    ON public.workspace_objectives FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_memberships WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage objectives of their workspaces"
    ON public.workspace_objectives FOR ALL
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_memberships WHERE profile_id = auth.uid()
        )
    );

-- RLS Policies for Initiatives
CREATE POLICY "Users can view initiatives of their workspaces"
    ON public.workspace_initiatives FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_memberships WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage initiatives of their workspaces"
    ON public.workspace_initiatives FOR ALL
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_memberships WHERE profile_id = auth.uid()
        )
    );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_objectives_workspace ON public.workspace_objectives(workspace_id);
CREATE INDEX IF NOT EXISTS idx_objectives_quarter ON public.workspace_objectives(quarter);
CREATE INDEX IF NOT EXISTS idx_initiatives_workspace ON public.workspace_initiatives(workspace_id);
CREATE INDEX IF NOT EXISTS idx_initiatives_quarter ON public.workspace_initiatives(quarter);
