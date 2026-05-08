-- Migration: Add metrics, metric_daily_logs, and entity_links tables
-- Created: 2026-05-08
-- Purpose: Store metric definitions, daily snapshots from analysis, and cross-entity links

-- ============================================================================
-- 1. metrics: metric definitions with current values
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    subcategory TEXT,
    current_value NUMERIC,
    target_value NUMERIC,
    previous_value NUMERIC,
    unit TEXT DEFAULT 'USD',
    source TEXT DEFAULT 'manual',
    source_date DATE,
    metadata JSONB DEFAULT '{}',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. metric_daily_logs: daily changelog entries from Gemini analysis
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.metric_daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    metric_id UUID NOT NULL REFERENCES public.metrics(id) ON DELETE CASCADE,
    day_summary_id UUID REFERENCES public.day_summaries(id) ON DELETE SET NULL,
    value NUMERIC,
    delta NUMERIC,
    context_text TEXT,
    source TEXT DEFAULT 'gemini_analysis',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. entity_links: polymorphic cross-entity connections
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.entity_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,
    source_id UUID NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    relationship TEXT DEFAULT 'related_to',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_metrics_workspace ON public.metrics(workspace_id);
CREATE INDEX IF NOT EXISTS idx_metrics_category ON public.metrics(category);
CREATE INDEX IF NOT EXISTS idx_metric_daily_logs_metric ON public.metric_daily_logs(metric_id);
CREATE INDEX IF NOT EXISTS idx_metric_daily_logs_workspace ON public.metric_daily_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_metric_daily_logs_day ON public.metric_daily_logs(day_summary_id);
CREATE INDEX IF NOT EXISTS idx_entity_links_source ON public.entity_links(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_entity_links_target ON public.entity_links(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_entity_links_workspace ON public.entity_links(workspace_id);

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metric_daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_links ENABLE ROW LEVEL SECURITY;

-- Metrics: workspace-scoped SELECT and ALL for members
CREATE POLICY "Members can view metrics of their workspace"
    ON public.metrics FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_memberships WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Members can manage metrics of their workspace"
    ON public.metrics FOR ALL
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_memberships WHERE profile_id = auth.uid()
        )
    );

-- Metric daily logs: workspace-scoped
CREATE POLICY "Members can view metric daily logs of their workspace"
    ON public.metric_daily_logs FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_memberships WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Members can manage metric daily logs of their workspace"
    ON public.metric_daily_logs FOR ALL
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_memberships WHERE profile_id = auth.uid()
        )
    );

-- Entity links: workspace-scoped
CREATE POLICY "Members can view entity links of their workspace"
    ON public.entity_links FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_memberships WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Members can manage entity links of their workspace"
    ON public.entity_links FOR ALL
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_memberships WHERE profile_id = auth.uid()
        )
    );
