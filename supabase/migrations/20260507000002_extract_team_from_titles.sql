-- Extract team values from task titles where team is still "Other"
-- Handles patterns like: (Team TalentOS) or Equipo: TeamName
-- Created: 2026-05-07

-- Update team from "(Team Something)" pattern in title
UPDATE public.task_proposals
SET team = (regexp_matches(title, '\(Team\s+([A-Za-z0-9]+)\)', 'i'))[1]
WHERE (team IS NULL OR team = 'Other')
  AND title ~ '\(Team\s+[A-Za-z0-9]+\)';

-- Update team from "Equipo: Something" pattern in title
UPDATE public.task_proposals
SET team = (regexp_matches(title, '^Equipo:\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)', 'i'))[1]
WHERE (team IS NULL OR team = 'Other')
  AND title ~ '^Equipo:\s+[A-Za-z]';

-- Log summary
SELECT
  COUNT(*) FILTER (WHERE team IS NOT NULL AND team != 'Other') as tasks_with_extracted_team,
  COUNT(*) FILTER (WHERE team = 'Other') as tasks_still_other,
  COUNT(*) as total_tasks
FROM public.task_proposals;
