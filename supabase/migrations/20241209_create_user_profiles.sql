-- Create user_profiles table for storing user knowledge
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Demographics
  age_range TEXT, -- '18-25', '26-35', '36-45', '46-55', '56-65', '65+'
  inferred_age INTEGER,

  -- Location
  location_poststed TEXT,
  location_kommune TEXT,
  location_fylke TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,

  -- Interests and preferences (learned from conversations)
  interests TEXT[] DEFAULT '{}',
  skills TEXT[] DEFAULT '{}',
  preferred_categories TEXT[] DEFAULT '{}',

  -- Life stage (Erikson theory)
  life_stage TEXT,
  life_stage_guidance TEXT,

  -- Conversation context
  conversation_count INTEGER DEFAULT 0,
  last_topics TEXT[] DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

COMMENT ON TABLE user_profiles IS 'Stores learned knowledge about users for personalized recommendations';
