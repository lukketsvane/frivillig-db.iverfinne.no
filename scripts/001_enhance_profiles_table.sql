-- Enhance profiles table with new fields for comprehensive user management

-- Add new columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS biography text,
ADD COLUMN IF NOT EXISTS skills text[],
ADD COLUMN IF NOT EXISTS availability jsonb DEFAULT '{"days": [], "hours_per_week": 0, "start_date": null}'::jsonb,
ADD COLUMN IF NOT EXISTS profile_visibility text DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private')),
ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{"email_digest": true, "new_matches": true, "bookmark_updates": true}'::jsonb,
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_visibility ON profiles(profile_visibility);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(location);

-- Comment
COMMENT ON COLUMN profiles.biography IS 'User biography/description';
COMMENT ON COLUMN profiles.skills IS 'Array of user skills';
COMMENT ON COLUMN profiles.availability IS 'JSON object containing days, hours_per_week, and start_date';
COMMENT ON COLUMN profiles.profile_visibility IS 'Profile visibility: public or private';
COMMENT ON COLUMN profiles.notification_preferences IS 'JSON object for notification settings';
COMMENT ON COLUMN profiles.avatar_url IS 'URL to user avatar image';
