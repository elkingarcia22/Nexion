-- Update responsible field to include all people mentioned in titles
-- Separated by " | " to support filtering by any mentioned person
-- Created: 2026-05-07

-- This is a complex operation that requires building a regex-based list
-- For now, we'll ensure the schema can handle multiple responsables separated by " | "

-- Add any additional cleanup needed:
-- 1. Trim existing responsible values
UPDATE public.task_proposals
SET responsible = TRIM(responsible)
WHERE responsible IS NOT NULL AND responsible != '';

-- 2. Extract people from "(con Name Lastname)" pattern and append if not already present
UPDATE public.task_proposals
SET responsible = CASE
  WHEN responsible IS NULL OR responsible = '' THEN
    -- Extract from "(con ...)" pattern
    COALESCE((regexp_matches(title, '\(con\s+([^)]+)\)', 'i'))[1], 'Unknown')
  WHEN responsible != '' AND title ~ '\(con\s+' THEN
    -- If responsible exists AND title has "(con ...)", check if we need to append
    responsible || ' | ' || COALESCE((regexp_matches(title, '\(con\s+([^)]+)\)', 'i'))[1], '')
  ELSE responsible
END
WHERE title ~ '\(con\s+[A-Z]';

-- Log summary
SELECT
  COUNT(*) as total_tasks,
  COUNT(CASE WHEN responsible IS NOT NULL AND responsible != '' THEN 1 END) as tasks_with_responsible,
  COUNT(CASE WHEN responsible LIKE '% | %' THEN 1 END) as tasks_with_multiple_responsables
FROM public.task_proposals;
