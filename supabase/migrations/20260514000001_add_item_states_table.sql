CREATE TABLE IF NOT EXISTS item_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('alert', 'insight', 'feedback')),
  item_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('resolved', 'learned', 'applied', 'converted_to_task')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, profile_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_item_states_lookup ON item_states(workspace_id, profile_id, item_type);

ALTER TABLE item_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own item states"
  ON item_states FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can insert own item states"
  ON item_states FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update own item states"
  ON item_states FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can delete own item states"
  ON item_states FOR DELETE
  USING (profile_id = auth.uid());
