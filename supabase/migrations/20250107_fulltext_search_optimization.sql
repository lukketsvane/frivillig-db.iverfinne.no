-- Full-Text Search Optimization for Organizations
-- Migration: Add tsvector column, GIN index, and automatic update trigger
-- Date: 2025-01-07
-- Purpose: Enable fast semantic search across organization names, activities, and purposes

-- ============================================================================
-- STEP 1: Add search_vector column for full-text search
-- ============================================================================

-- Add tsvector column to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Add comment for documentation
COMMENT ON COLUMN public.organizations.search_vector IS
  'Full-text search vector combining navn, aktivitet, and vedtektsfestet_formaal with Norwegian language support';

-- ============================================================================
-- STEP 2: Populate existing rows with search vectors
-- ============================================================================

-- Update all existing rows (this may take a few minutes for large tables)
-- Uses Norwegian (norwegian) text search configuration for better stemming
UPDATE public.organizations
SET search_vector =
  setweight(to_tsvector('norwegian', coalesce(navn, '')), 'A') ||
  setweight(to_tsvector('norwegian', coalesce(aktivitet, '')), 'B') ||
  setweight(to_tsvector('norwegian', coalesce(vedtektsfestet_formaal, '')), 'C')
WHERE search_vector IS NULL;

-- ============================================================================
-- STEP 3: Create GIN index for fast full-text search
-- ============================================================================

-- Create GIN (Generalized Inverted Index) for efficient tsvector queries
-- This index enables queries like: WHERE search_vector @@ to_tsquery('search term')
CREATE INDEX IF NOT EXISTS idx_organizations_search_vector
ON public.organizations
USING GIN (search_vector);

-- ============================================================================
-- STEP 4: Create trigger function to auto-update search_vector
-- ============================================================================

-- Drop existing function if it exists (for safe re-runs)
DROP FUNCTION IF EXISTS public.organizations_search_vector_update() CASCADE;

-- Create trigger function that updates search_vector on INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.organizations_search_vector_update()
RETURNS trigger AS $$
BEGIN
  -- Set weights: A (highest) for name, B for activity, C for purpose
  NEW.search_vector :=
    setweight(to_tsvector('norwegian', coalesce(NEW.navn, '')), 'A') ||
    setweight(to_tsvector('norwegian', coalesce(NEW.aktivitet, '')), 'B') ||
    setweight(to_tsvector('norwegian', coalesce(NEW.vedtektsfestet_formaal, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment to function
COMMENT ON FUNCTION public.organizations_search_vector_update() IS
  'Automatically updates search_vector when navn, aktivitet, or vedtektsfestet_formaal changes';

-- ============================================================================
-- STEP 5: Create trigger to call the update function
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS organizations_search_vector_trigger ON public.organizations;

-- Create trigger that fires BEFORE INSERT or UPDATE
CREATE TRIGGER organizations_search_vector_trigger
  BEFORE INSERT OR UPDATE OF navn, aktivitet, vedtektsfestet_formaal
  ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.organizations_search_vector_update();

-- ============================================================================
-- STEP 6: Create helper function for search with ranking
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.search_organizations_ranked(text, int);

-- Create function that searches and ranks results
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

-- Add comment to function
COMMENT ON FUNCTION public.search_organizations_ranked(text, int) IS
  'Search organizations using full-text search with relevance ranking. Uses websearch_to_tsquery for natural query syntax.';

-- ============================================================================
-- STEP 7: Add indexes for common filter columns
-- ============================================================================

-- Index for location-based queries
CREATE INDEX IF NOT EXISTS idx_organizations_location
ON public.organizations (forretningsadresse_kommune, forretningsadresse_poststed);

-- Index for fylke (county) - if using the view
CREATE INDEX IF NOT EXISTS idx_organizations_postnummer_prefix
ON public.organizations (left(forretningsadresse_postnummer, 2));

-- Index for registry filter (most common filter)
CREATE INDEX IF NOT EXISTS idx_organizations_frivillighetsregisteret
ON public.organizations (registrert_i_frivillighetsregisteret)
WHERE registrert_i_frivillighetsregisteret = true;

-- Index for organizations with contact info
CREATE INDEX IF NOT EXISTS idx_organizations_has_website
ON public.organizations (hjemmeside)
WHERE hjemmeside IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_has_email
ON public.organizations (epost)
WHERE epost IS NOT NULL;

-- ============================================================================
-- STEP 8: Create view for search with fylke (if not exists)
-- ============================================================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS public.organizations_with_fylke CASCADE;

-- Create view that adds fylke based on postnummer
CREATE OR REPLACE VIEW public.organizations_with_fylke AS
SELECT
  o.*,
  CASE
    -- Oslo (03xx)
    WHEN left(o.forretningsadresse_postnummer, 2) = '03' THEN 'Oslo'
    WHEN left(o.forretningsadresse_postnummer, 2) IN ('01', '02') THEN 'Oslo'

    -- Viken (14xx-32xx range)
    WHEN left(o.forretningsadresse_postnummer, 2) BETWEEN '14' AND '32' THEN 'Viken'

    -- Vestfold og Telemark (33xx-39xx)
    WHEN left(o.forretningsadresse_postnummer, 2) BETWEEN '33' AND '39' THEN 'Vestfold og Telemark'

    -- Agder (44xx-49xx)
    WHEN left(o.forretningsadresse_postnummer, 2) BETWEEN '44' AND '49' THEN 'Agder'

    -- Rogaland (40xx-43xx, 51xx)
    WHEN left(o.forretningsadresse_postnummer, 2) IN ('40', '41', '42', '43', '51') THEN 'Rogaland'

    -- Vestland (50xx, 52xx-69xx)
    WHEN left(o.forretningsadresse_postnummer, 2) = '50' THEN 'Vestland'
    WHEN left(o.forretningsadresse_postnummer, 2) BETWEEN '52' AND '69' THEN 'Vestland'

    -- Møre og Romsdal (60xx-67xx)
    WHEN left(o.forretningsadresse_postnummer, 2) BETWEEN '60' AND '67' THEN 'Møre og Romsdal'

    -- Trøndelag (70xx-79xx)
    WHEN left(o.forretningsadresse_postnummer, 2) BETWEEN '70' AND '79' THEN 'Trøndelag'

    -- Nordland (80xx-85xx)
    WHEN left(o.forretningsadresse_postnummer, 2) BETWEEN '80' AND '85' THEN 'Nordland'

    -- Troms og Finnmark (90xx-99xx)
    WHEN left(o.forretningsadresse_postnummer, 2) BETWEEN '90' AND '99' THEN 'Troms og Finnmark'

    ELSE 'Ukjent'
  END AS fylke
FROM public.organizations o;

-- Add comment to view
COMMENT ON VIEW public.organizations_with_fylke IS
  'Organizations table with fylke (county) derived from forretningsadresse_postnummer';

-- ============================================================================
-- STEP 9: Grant permissions (adjust for your roles)
-- ============================================================================

-- Grant SELECT on view to authenticated users
GRANT SELECT ON public.organizations_with_fylke TO authenticated;
GRANT SELECT ON public.organizations_with_fylke TO anon;

-- Grant EXECUTE on search function
GRANT EXECUTE ON FUNCTION public.search_organizations_ranked(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_organizations_ranked(text, int) TO anon;

-- ============================================================================
-- VERIFICATION QUERIES (run these to test)
-- ============================================================================

-- Test 1: Check search_vector is populated
-- SELECT count(*) FROM public.organizations WHERE search_vector IS NOT NULL;

-- Test 2: Test full-text search
-- SELECT * FROM public.search_organizations_ranked('ungdom Oslo', 10);

-- Test 3: Test direct tsquery
-- SELECT navn, ts_rank(search_vector, websearch_to_tsquery('norwegian', 'barn sport')) as rank
-- FROM public.organizations
-- WHERE search_vector @@ websearch_to_tsquery('norwegian', 'barn sport')
-- ORDER BY rank DESC LIMIT 10;

-- Test 4: Verify indexes
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'organizations';

-- Test 5: Check query performance
-- EXPLAIN ANALYZE
-- SELECT * FROM public.organizations_with_fylke
-- WHERE search_vector @@ websearch_to_tsquery('norwegian', 'fotball')
-- LIMIT 20;

-- ============================================================================
-- NOTES & BEST PRACTICES
-- ============================================================================

-- 1. The search_vector column is automatically maintained by the trigger
-- 2. Use websearch_to_tsquery() for natural query syntax (supports "phrase", OR, -)
-- 3. Use to_tsquery() for advanced boolean queries (& | !)
-- 4. Norwegian language support improves stemming (e.g., 'barn' matches 'barnas')
-- 5. Weights: A (name) = highest priority, B (activity), C (purpose)
-- 6. ts_rank returns 0-1 relevance score (higher = more relevant)
-- 7. GIN index may need VACUUM ANALYZE after large updates
-- 8. For very large tables (>1M rows), consider partial indexes

-- Run ANALYZE to update query planner statistics
ANALYZE public.organizations;
