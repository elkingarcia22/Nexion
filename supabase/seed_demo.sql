-- Nexión Demo Seeding Script
-- Use this to set up a local development environment with a functional demo user

-- 1. Create Demo Workspace
INSERT INTO public.workspaces (id, name, slug)
VALUES ('d3b0ac24-197e-406c-829d-3f0a0e0e0e0e', 'Nexión Demo', 'nexion-demo')
ON CONFLICT (id) DO NOTHING;

-- 2. Create Demo Profile (Matches the UUID in src/lib/supabase.ts)
INSERT INTO public.profiles (id, workspace_id, email, full_name, role)
VALUES (
  '00000000-0000-0000-0000-000000000000', 
  'd3b0ac24-197e-406c-829d-3f0a0e0e0e0e', 
  'demo@ubits.com', 
  'Demo User (Nexión)', 
  'admin'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Create Membership
INSERT INTO public.workspace_memberships (workspace_id, profile_id, membership_role)
VALUES (
  'd3b0ac24-197e-406c-829d-3f0a0e0e0e0e', 
  '00000000-0000-0000-0000-000000000000', 
  'owner'
)
ON CONFLICT (workspace_id, profile_id) DO NOTHING;

-- 4. Create some initial sources (optional)
INSERT INTO public.sources (workspace_id, created_by_profile_id, source_type, source_origin, ingest_mode, title, original_url, current_status)
VALUES 
(
  'd3b0ac24-197e-406c-829d-3f0a0e0e0e0e', 
  '00000000-0000-0000-0000-000000000000', 
  'document', 
  'google_docs', 
  'manual', 
  'Minuta reunión de equipo', 
  'https://docs.google.com/document/d/demo1', 
  'processed'
),
(
  'd3b0ac24-197e-406c-829d-3f0a0e0e0e0e', 
  '00000000-0000-0000-0000-000000000000', 
  'meeting', 
  'transcription', 
  'manual', 
  'Feedback de producto v1', 
  'https://nexion.app/meeting/demo2', 
  'pending'
);

-- 5. Create a Day Summary for today
INSERT INTO public.day_summaries (workspace_id, summary_date, focus_text, source_count)
VALUES (
  'd3b0ac24-197e-406c-829d-3f0a0e0e0e0e', 
  CURRENT_DATE, 
  'Configuración inicial de Nexión y revisión de fuentes base.', 
  2
)
ON CONFLICT (workspace_id, summary_date) DO NOTHING;
