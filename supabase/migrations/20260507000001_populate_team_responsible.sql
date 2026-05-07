-- Populate team and responsible columns from metadata where available
-- Created: 2026-05-07
-- Purpose: Backfill team and responsible data from existing metadata

-- Update team from metadata if it exists and column is null
UPDATE public.task_proposals
SET team = metadata->>'team'
WHERE team IS NULL
  AND metadata IS NOT NULL
  AND metadata->>'team' IS NOT NULL
  AND metadata->>'team' != '';

-- Update responsible from metadata if it exists and column is null
UPDATE public.task_proposals
SET responsible = metadata->>'responsable'
WHERE responsible IS NULL
  AND metadata IS NOT NULL
  AND metadata->>'responsable' IS NOT NULL
  AND metadata->>'responsable' != '';

-- If a task has no team/responsible in metadata, try to extract from title
-- This is a simple pattern match for common title formats
-- Format: "Person Name: Task Title" or "Equipo: Task Title"

-- Extract responsible from title if it starts with a name pattern (Capital + space + Capital)
UPDATE public.task_proposals
SET responsible = COALESCE(
  responsible,
  (regexp_matches(title, '^([A-Z][a-z]+ [A-Z][a-z]+):', 'g'))[1]
)
WHERE responsible IS NULL
  AND title ~ '^[A-Z][a-z]+ [A-Z][a-z]+:';

-- Log summary of updates
SELECT
  COUNT(*) FILTER (WHERE team IS NOT NULL) as tasks_with_team,
  COUNT(*) FILTER (WHERE responsible IS NOT NULL) as tasks_with_responsible,
  COUNT(*) as total_tasks
FROM public.task_proposals;
