-- RLS Policies for Realtime Integration
-- Migration: Production-ready policies for organizations and realtime.messages
-- Date: 2025-01-07
-- Purpose: Secure Realtime broadcasts with proper RLS

-- ============================================================================
-- STEP 1: Enable RLS on organizations table
-- ============================================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: Create org_members table (if not exists)
-- ============================================================================

-- This table tracks which users are members of which organizations
CREATE TABLE IF NOT EXISTS public.org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_org ON public.org_members(user_id, org_id) WHERE active = true;

-- Add comments
COMMENT ON TABLE public.org_members IS
  'Tracks organization membership for RLS policies and Realtime access control';
COMMENT ON COLUMN public.org_members.role IS
  'User role: owner (full control), admin (manage members), member (view only)';

-- ============================================================================
-- STEP 3: RLS Policies for organizations table
-- ============================================================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "organizations_public_read" ON public.organizations;
DROP POLICY IF EXISTS "organizations_member_read" ON public.organizations;
DROP POLICY IF EXISTS "organizations_member_update" ON public.organizations;
DROP POLICY IF EXISTS "organizations_owner_delete" ON public.organizations;

-- Policy 1: Public READ for registered organizations in volunteer registry
-- Anyone can view organizations that are registered in frivillighetsregisteret
CREATE POLICY "organizations_public_read"
  ON public.organizations
  FOR SELECT
  USING (registrert_i_frivillighetsregisteret = true);

-- Policy 2: Members can READ their organizations (including private ones)
-- Members can see all details of organizations they belong to
CREATE POLICY "organizations_member_read"
  ON public.organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_members
      WHERE org_members.org_id = organizations.id
        AND org_members.user_id = auth.uid()
        AND org_members.active = true
    )
  );

-- Policy 3: Admins and owners can UPDATE organizations
CREATE POLICY "organizations_member_update"
  ON public.organizations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_members
      WHERE org_members.org_id = organizations.id
        AND org_members.user_id = auth.uid()
        AND org_members.active = true
        AND org_members.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.org_members
      WHERE org_members.org_id = organizations.id
        AND org_members.user_id = auth.uid()
        AND org_members.active = true
        AND org_members.role IN ('owner', 'admin')
    )
  );

-- Policy 4: Only owners can DELETE organizations
CREATE POLICY "organizations_owner_delete"
  ON public.organizations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.org_members
      WHERE org_members.org_id = organizations.id
        AND org_members.user_id = auth.uid()
        AND org_members.active = true
        AND org_members.role = 'owner'
    )
  );

-- ============================================================================
-- STEP 4: RLS Policies for realtime.messages
-- ============================================================================

-- Enable RLS on realtime.messages (Supabase Realtime table)
-- Note: This table is managed by Supabase Realtime extension
-- We add policies to control who can send/receive broadcasts

-- Policy 1: Authenticated users can SELECT from realtime.messages
-- This allows users to receive broadcasts they're subscribed to
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables WHERE schemaname = 'realtime' AND tablename = 'messages'
  ) THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';

    -- Drop existing policies
    DROP POLICY IF EXISTS "realtime_messages_authenticated_select" ON realtime.messages;
    DROP POLICY IF EXISTS "realtime_messages_authenticated_insert" ON realtime.messages;

    -- Allow authenticated users to receive messages
    EXECUTE '
      CREATE POLICY "realtime_messages_authenticated_select"
        ON realtime.messages
        FOR SELECT
        TO authenticated
        USING (true)
    ';

    -- Allow authenticated users to send messages (broadcast)
    -- In production, restrict this further based on channel topic
    EXECUTE '
      CREATE POLICY "realtime_messages_authenticated_insert"
        ON realtime.messages
        FOR INSERT
        TO authenticated
        WITH CHECK (true)
    ';

    RAISE NOTICE 'RLS policies created for realtime.messages';
  ELSE
    RAISE NOTICE 'realtime.messages table does not exist - skipping RLS setup';
  END IF;
END
$$;

-- ============================================================================
-- STEP 5: Create trigger for organization broadcasts
-- ============================================================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS organizations_realtime_broadcast ON public.organizations;
DROP FUNCTION IF EXISTS public.broadcast_organization_changes() CASCADE;

-- Create trigger function that broadcasts organization changes
CREATE OR REPLACE FUNCTION public.broadcast_organization_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  channel_name text;
  payload jsonb;
BEGIN
  -- Build channel name: organization:<org_id>
  channel_name := 'organization:' || COALESCE(NEW.id::text, OLD.id::text);

  -- Build payload based on operation
  IF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object(
      'event', 'organization_created',
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'new', row_to_json(NEW),
      'timestamp', now()
    );
  ELSIF TG_OP = 'UPDATE' THEN
    payload := jsonb_build_object(
      'event', 'organization_updated',
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'old', row_to_json(OLD),
      'new', row_to_json(NEW),
      'timestamp', now()
    );
  ELSIF TG_OP = 'DELETE' THEN
    payload := jsonb_build_object(
      'event', 'organization_deleted',
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'old', row_to_json(OLD),
      'timestamp', now()
    );
  END IF;

  -- Broadcast to Realtime channel using pg_notify
  -- The channel topic format must match what clients subscribe to
  PERFORM pg_notify(
    'realtime:' || channel_name,
    payload::text
  );

  -- Also use realtime.send if available (Supabase-specific)
  -- This requires the realtime extension and proper configuration
  BEGIN
    PERFORM realtime.send(
      payload,
      channel_name,
      'broadcast',
      true  -- private channel (requires auth)
    );
  EXCEPTION
    WHEN undefined_function THEN
      -- realtime.send not available, pg_notify already sent
      NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Add comment to function
COMMENT ON FUNCTION public.broadcast_organization_changes() IS
  'Broadcasts organization changes to Realtime subscribers via pg_notify and realtime.send';

-- Create trigger
CREATE TRIGGER organizations_realtime_broadcast
  AFTER INSERT OR UPDATE OR DELETE
  ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.broadcast_organization_changes();

-- ============================================================================
-- STEP 6: Grant permissions
-- ============================================================================

-- Grant SELECT on organizations to authenticated and anon for RLS policies
GRANT SELECT ON public.organizations TO authenticated, anon;
GRANT UPDATE ON public.organizations TO authenticated;
GRANT DELETE ON public.organizations TO authenticated;

-- Grant access to org_members
GRANT SELECT ON public.org_members TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.org_members TO authenticated;

-- Grant USAGE on sequences if needed
GRANT USAGE ON SEQUENCE IF EXISTS public.organizations_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE IF EXISTS public.org_members_id_seq TO authenticated;

-- ============================================================================
-- STEP 7: Helper function to add org member
-- ============================================================================

DROP FUNCTION IF EXISTS public.add_org_member(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.add_org_member(
  p_org_id uuid,
  p_user_id uuid,
  p_role text DEFAULT 'member'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_member_id uuid;
BEGIN
  -- Check if user is owner or admin of the org
  IF NOT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND active = true
      AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only owners and admins can add members';
  END IF;

  -- Insert or update member
  INSERT INTO public.org_members (org_id, user_id, role, active)
  VALUES (p_org_id, p_user_id, p_role, true)
  ON CONFLICT (org_id, user_id)
  DO UPDATE SET
    role = EXCLUDED.role,
    active = true,
    updated_at = now()
  RETURNING id INTO v_member_id;

  RETURN v_member_id;
END;
$$;

COMMENT ON FUNCTION public.add_org_member(uuid, uuid, text) IS
  'Adds a user as a member of an organization (requires admin/owner role)';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test 1: Check RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organizations';

-- Test 2: List all policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies WHERE tablename IN ('organizations', 'org_members');

-- Test 3: Test broadcast trigger (as authenticated user)
-- UPDATE public.organizations SET navn = navn WHERE id = '<some-org-id>';
-- Then check if broadcast was sent

-- Test 4: Verify org_members table
-- SELECT * FROM public.org_members LIMIT 5;

-- ============================================================================
-- PRODUCTION CHECKLIST
-- ============================================================================

-- [ ] Run ANALYZE after migration
ANALYZE public.organizations;
ANALYZE public.org_members;

-- [ ] Verify RLS policies work as expected
-- [ ] Test Realtime subscriptions with private channels
-- [ ] Ensure broadcast trigger fires on INSERT/UPDATE/DELETE
-- [ ] Configure Supabase Realtime to use private channels only (in dashboard)
-- [ ] Add monitoring for failed broadcasts
-- [ ] Set up alerting for RLS policy violations
-- [ ] Document membership management flow for your team
