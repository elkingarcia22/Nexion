-- Migration: Add period column to metrics table
-- Created: 2026-05-09
-- Purpose: Support Q1/Q2 period filtering on Metrics page

ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS period TEXT NOT NULL DEFAULT 'Q2 2026';

CREATE INDEX IF NOT EXISTS idx_metrics_period ON public.metrics(period);
