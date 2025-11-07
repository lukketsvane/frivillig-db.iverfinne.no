-- ============================================================================
-- PRODUKSJONSKLART: Full-text søk + Realtime + RLS for frivillig-db.iverfinne.no
-- Kjør denne filen i Supabase Dashboard → SQL Editor
-- ============================================================================

-- ============================================================================
-- DEL 1: FULL-TEXT SEARCH OPTIMALISERING
-- ============================================================================

-- Legg til search_vector kolonne
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS search_vector tsvector;

COMMENT ON COLUMN public.organizations.search_vector IS
  'Full-text search vector combining navn, aktivitet, and vedtektsfestet_formaal with Norwegian language support';

-- Populer eksisterende rader
UPDATE public.organizations
SET search_vector =
  setweight(to_tsvector('norwegian', coalesce(navn, '')), 'A') ||
  setweight(to_tsvector('norwegian', coalesce(aktivitet, '')), 'B') ||
  setweight(to_tsvector('norwegian', coalesce(vedtektsfestet_formaal, '')), 'C')
WHERE search_vector IS NULL;

-- Opprett GIN-indeks for rask full-text search
CREATE INDEX IF NOT EXISTS idx_organizations_search_vector
ON public.organizations
USING GIN (search_vector);

-- Opprett trigger-funksjon for auto-oppdatering
DROP FUNCTION IF EXISTS public.organizations_search_vector_update() CASCADE;

CREATE OR REPLACE FUNCTION public.organizations_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('norwegian', coalesce(NEW.navn, '')), 'A') ||
    setweight(to_tsvector('norwegian', coalesce(NEW.aktivitet, '')), 'B') ||
    setweight(to_tsvector('norwegian', coalesce(NEW.vedtektsfestet_formaal, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Opprett trigger
DROP TRIGGER IF EXISTS organizations_search_vector_trigger ON public.organizations;

CREATE TRIGGER organizations_search_vector_trigger
  BEFORE INSERT OR UPDATE OF navn, aktivitet, vedtektsfestet_formaal
  ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.organizations_search_vector_update();

-- Opprett hjelpefunksjon for søk med ranking
DROP FUNCTION IF EXISTS public.search_organizations_ranked(text, int);

CREATE OR REPLACE FUNCTION public.search_organizations_ranked(
  search_query text,
  max_results int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  navn text,
  aktivitet text,
  vedtektsfestet_formaal text,
  forretningsadresse_poststed text,
  forretningsadresse_kommune text,
  fylke text,
  rank real
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.navn,
    o.aktivitet,
    o.vedtektsfestet_formaal,
    o.forretningsadresse_poststed,
    o.forretningsadresse_kommune,
    o.fylke,
    ts_rank(o.search_vector, websearch_to_tsquery('norwegian', search_query)) AS rank
  FROM public.organizations o
  WHERE
    o.search_vector @@ websearch_to_tsquery('norwegian', search_query)
    AND o.registrert_i_frivillighetsregisteret = true
    AND o.navn IS NOT NULL
  ORDER BY rank DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE;

-- Performance-indekser
CREATE INDEX IF NOT EXISTS idx_organizations_location
ON public.organizations (forretningsadresse_kommune, forretningsadresse_poststed);

CREATE INDEX IF NOT EXISTS idx_organizations_postnummer_prefix
ON public.organizations (left(forretningsadresse_postnummer, 2));

CREATE INDEX IF NOT EXISTS idx_organizations_frivillighetsregisteret
ON public.organizations (registrert_i_frivillighetsregisteret)
WHERE registrert_i_frivillighetsregisteret = true;

CREATE INDEX IF NOT EXISTS idx_organizations_has_website
ON public.organizations (hjemmeside)
WHERE hjemmeside IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_has_email
ON public.organizations (epost)
WHERE epost IS NOT NULL;

-- Opprett view med fylke
DROP VIEW IF EXISTS public.organizations_with_fylke CASCADE;

CREATE OR REPLACE VIEW public.organizations_with_fylke AS
SELECT
  o.*,
  CASE
    WHEN left(o.forretningsadresse_postnummer, 2) IN ('01', '02', '03') THEN 'Oslo'
    WHEN left(o.forretningsadresse_postnummer, 2) BETWEEN '14' AND '32' THEN 'Viken'
    WHEN left(o.forretningsadresse_postnummer, 2) BETWEEN '33' AND '39' THEN 'Vestfold og Telemark'
    WHEN left(o.forretningsadresse_postnummer, 2) BETWEEN '44' AND '49' THEN 'Agder'
    WHEN left(o.forretningsadresse_postnummer, 2) IN ('40', '41', '42', '43', '51') THEN 'Rogaland'
    WHEN left(o.forretningsadresse_postnummer, 2) = '50' THEN 'Vestland'
    WHEN left(o.forretningsadresse_postnummer, 2) BETWEEN '52' AND '69' THEN 'Vestland'
    WHEN left(o.forretningsadresse_postnummer, 2) BETWEEN '60' AND '67' THEN 'Møre og Romsdal'
    WHEN left(o.forretningsadresse_postnummer, 2) BETWEEN '70' AND '79' THEN 'Trøndelag'
    WHEN left(o.forretningsadresse_postnummer, 2) BETWEEN '80' AND '85' THEN 'Nordland'
    WHEN left(o.forretningsadresse_postnummer, 2) BETWEEN '90' AND '99' THEN 'Troms og Finnmark'
    ELSE 'Ukjent'
  END AS fylke
FROM public.organizations o;

-- ============================================================================
-- DEL 2: REALTIME + RLS POLICIES
-- ============================================================================

-- Aktiver RLS på organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Opprett org_members tabell
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

-- Indekser for org_members
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_org ON public.org_members(user_id, org_id) WHERE active = true;

-- RLS policies for organizations
DROP POLICY IF EXISTS "organizations_public_read" ON public.organizations;
DROP POLICY IF EXISTS "organizations_member_read" ON public.organizations;
DROP POLICY IF EXISTS "organizations_member_update" ON public.organizations;
DROP POLICY IF EXISTS "organizations_owner_delete" ON public.organizations;

-- Public READ for registered organizations
CREATE POLICY "organizations_public_read"
  ON public.organizations
  FOR SELECT
  USING (registrert_i_frivillighetsregisteret = true);

-- Members can READ their organizations
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

-- Admins and owners can UPDATE
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

-- Only owners can DELETE
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

-- Realtime broadcast trigger
DROP TRIGGER IF EXISTS organizations_realtime_broadcast ON public.organizations;
DROP FUNCTION IF EXISTS public.broadcast_organization_changes() CASCADE;

CREATE OR REPLACE FUNCTION public.broadcast_organization_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  channel_name text;
  payload jsonb;
BEGIN
  channel_name := 'organization:' || COALESCE(NEW.id::text, OLD.id::text);

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

  PERFORM pg_notify('realtime:' || channel_name, payload::text);

  BEGIN
    PERFORM realtime.send(payload, channel_name, 'broadcast', true);
  EXCEPTION
    WHEN undefined_function THEN NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER organizations_realtime_broadcast
  AFTER INSERT OR UPDATE OR DELETE
  ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.broadcast_organization_changes();

-- Helper function for adding members
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
  IF NOT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND active = true
      AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only owners and admins can add members';
  END IF;

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

-- Grant permissions
GRANT SELECT ON public.organizations TO authenticated, anon;
GRANT UPDATE ON public.organizations TO authenticated;
GRANT DELETE ON public.organizations TO authenticated;
GRANT SELECT ON public.org_members TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.org_members TO authenticated;
GRANT SELECT ON public.organizations_with_fylke TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.search_organizations_ranked(text, int) TO authenticated, anon;

-- Oppdater statistikk
ANALYZE public.organizations;
ANALYZE public.org_members;

-- ============================================================================
-- FERDIG!
-- ============================================================================

-- Verifiser installasjon:
SELECT
  'organizations table' as component,
  count(*) as row_count,
  count(*) FILTER (WHERE search_vector IS NOT NULL) as with_search_vector
FROM public.organizations
UNION ALL
SELECT
  'indexes' as component,
  count(*) as count,
  count(*) as total
FROM pg_indexes
WHERE tablename = 'organizations'
UNION ALL
SELECT
  'RLS policies' as component,
  count(*) as count,
  count(*) as total
FROM pg_policies
WHERE tablename = 'organizations';
