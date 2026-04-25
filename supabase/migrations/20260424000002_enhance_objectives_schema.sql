-- Add owner and sub_tasks to workspace_objectives
ALTER TABLE workspace_objectives ADD COLUMN IF NOT EXISTS owner TEXT;
ALTER TABLE workspace_objectives ADD COLUMN IF NOT EXISTS sub_tasks JSONB DEFAULT '[]';

-- Update the unique constraint to include owner (optional, but good for data integrity)
-- First drop existing unique constraint if we know its name, or just keep it as is.
-- The previous constraint was (workspace_id, quarter, objective_title, key_result)
