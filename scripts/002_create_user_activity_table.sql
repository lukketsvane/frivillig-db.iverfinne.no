-- Create user activity tracking table

CREATE TABLE IF NOT EXISTS user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN ('view', 'bookmark', 'favorite', 'click', 'search')),
  organization_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- Policies: Users can insert their own activity (write-only for analytics)
CREATE POLICY "user_activity_insert_own"
  ON user_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own activity
CREATE POLICY "user_activity_select_own"
  ON user_activity FOR SELECT
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON user_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_org_id ON user_activity(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity(created_at DESC);

-- Comment
COMMENT ON TABLE user_activity IS 'Tracks user interactions with organizations';
