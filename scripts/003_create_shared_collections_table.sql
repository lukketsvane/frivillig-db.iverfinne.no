-- Create shared collections table for shareable bookmarks/favorites

CREATE TABLE IF NOT EXISTS shared_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token text UNIQUE NOT NULL,
  collection_type text NOT NULL CHECK (collection_type IN ('bookmarks', 'favorites', 'mixed')),
  organization_ids text[] NOT NULL,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE shared_collections ENABLE ROW LEVEL SECURITY;

-- Policies: Users can manage their own shared collections
CREATE POLICY "shared_collections_insert_own"
  ON shared_collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "shared_collections_select_own"
  ON shared_collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "shared_collections_update_own"
  ON shared_collections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "shared_collections_delete_own"
  ON shared_collections FOR DELETE
  USING (auth.uid() = user_id);

-- Public read policy for valid share tokens
CREATE POLICY "shared_collections_public_read"
  ON shared_collections FOR SELECT
  USING (expires_at IS NULL OR expires_at > now());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_shared_collections_user_id ON shared_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_collections_token ON shared_collections(share_token);
CREATE INDEX IF NOT EXISTS idx_shared_collections_expires_at ON shared_collections(expires_at);

-- Comment
COMMENT ON TABLE shared_collections IS 'Shareable collections of organizations';
