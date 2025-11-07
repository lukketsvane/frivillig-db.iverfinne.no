# Realtime Organization Sync Integration Guide

Complete guide for integrating Realtime organization updates with Claude Sonnet 4.5 custom tools.

## 🎯 Overview

This integration provides:
- **Custom Tool Schema** for Claude Sonnet 4.5 to search organizations
- **Edge Function** (or Next.js API route) for server-side search with full-text indexing
- **Realtime Subscriptions** for live organization updates
- **Production RLS Policies** for secure access control

---

## 📁 Files Created

### 1. Custom Tool Schema
- `tools/searchOrganizations.json` - JSON schema for Claude Sonnet 4.5

### 2. API Implementation
- `supabase/functions/search-organizations/index.ts` - Supabase Edge Function
- `app/api/search-organizations/route.ts` - Next.js API route (alternative)

### 3. Database Migrations
- `supabase/migrations/20250107_fulltext_search_optimization.sql` - Full-text search setup
- `supabase/migrations/20250107_realtime_rls_policies.sql` - RLS policies and Realtime triggers

### 4. Client Integration
- `lib/hooks/useOrganizationRealtime.ts` - React hook for Realtime subscriptions
- `lib/hooks/useOrganizationSearch.ts` - React hook for search API
- `components/organization-search-demo.tsx` - Demo component

---

## 🚀 Deployment Steps

### Step 1: Apply Database Migrations

Run the SQL migrations in your Supabase project:

```bash
# Option A: Using Supabase CLI
supabase db push

# Option B: Run SQL files directly in Supabase Dashboard
# 1. Go to SQL Editor in Supabase Dashboard
# 2. Copy contents of supabase/migrations/20250107_fulltext_search_optimization.sql
# 3. Execute
# 4. Copy contents of supabase/migrations/20250107_realtime_rls_policies.sql
# 5. Execute
```

### Step 2: Deploy Edge Function (Choose One)

**Option A: Deploy Supabase Edge Function**

```bash
# Deploy the Edge Function
supabase functions deploy search-organizations

# Set environment variables (done automatically if using Supabase CLI)
# SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected
```

**Option B: Use Next.js API Route**

The API route is already in `app/api/search-organizations/route.ts`.

Add to your `.env.local`:
```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**⚠️ NEVER expose service role key to the client!**

### Step 3: Configure Realtime in Supabase Dashboard

1. Go to **Database** → **Replication**
2. Enable Realtime for `organizations` table
3. Go to **Authentication** → **Policies**
4. Verify RLS policies are active
5. Go to **Project Settings** → **API**
6. Ensure Realtime is enabled

### Step 4: Set Up Org Membership (for private channels)

Add yourself as an organization owner to test:

```sql
-- In Supabase SQL Editor
INSERT INTO public.org_members (org_id, user_id, role)
VALUES (
  '<organization-id>',
  '<your-user-id>',  -- Get this from auth.users
  'owner'
);
```

Get your user ID:
```sql
SELECT id, email FROM auth.users WHERE email = 'your@email.com';
```

---

## 🔧 Using the Custom Tool with Claude Sonnet 4.5

### Register the Tool

When calling the Claude API, include the tool schema:

```typescript
import toolSchema from './tools/searchOrganizations.json'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const response = await client.messages.create({
  model: 'claude-sonnet-4-5-20250129',
  max_tokens: 4096,
  tools: [toolSchema],
  messages: [
    {
      role: 'user',
      content: 'Find youth organizations in Oslo with websites',
    },
  ],
})
```

### Example Tool Use

Claude will generate tool calls like:

```json
{
  "type": "tool_use",
  "id": "toolu_01ABC",
  "name": "searchOrganizations",
  "input": {
    "query": "ungdom barn",
    "location": "Oslo",
    "only_with_website": true,
    "limit": 10
  }
}
```

### Handle Tool Results

```typescript
if (response.stop_reason === 'tool_use') {
  for (const block of response.content) {
    if (block.type === 'tool_use' && block.name === 'searchOrganizations') {
      // Call your API endpoint
      const apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1/search-organizations'
      // OR: const apiUrl = '/api/search-organizations' for Next.js route

      const params = new URLSearchParams(block.input)
      const result = await fetch(`${apiUrl}?${params}`)
      const data = await result.json()

      // Send result back to Claude
      const finalResponse = await client.messages.create({
        model: 'claude-sonnet-4-5-20250129',
        max_tokens: 4096,
        tools: [toolSchema],
        messages: [
          ...previousMessages,
          response,
          {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify(data),
              },
            ],
          },
        ],
      })
    }
  }
}
```

---

## 📡 Client-Side Realtime Integration

### Basic Usage

```tsx
'use client'

import { useOrganizationRealtime } from '@/lib/hooks/useOrganizationRealtime'

export function OrganizationPage({ id }: { id: string }) {
  const { organization, loading, error } = useOrganizationRealtime(id)

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  if (!organization) return <div>Not found</div>

  return (
    <div>
      <h1>{organization.navn}</h1>
      <p>{organization.aktivitet}</p>
      {/* Organization updates automatically via Realtime */}
    </div>
  )
}
```

### Search Hook Usage

```tsx
'use client'

import { useOrganizationSearch } from '@/lib/hooks/useOrganizationSearch'

export function SearchPage() {
  const { results, loading, search } = useOrganizationSearch()

  const handleSearch = async () => {
    await search({
      query: 'sport fotball',
      fylke: 'Oslo',
      limit: 20,
    })
  }

  return (
    <div>
      <button onClick={handleSearch}>Search</button>
      {results.map((org) => (
        <div key={org.id}>{org.navn}</div>
      ))}
    </div>
  )
}
```

---

## 🔒 Security Checklist

### Database
- [x] RLS enabled on `organizations` table
- [x] RLS enabled on `realtime.messages` table
- [x] Policies restrict access to organization members
- [x] Service role key only used server-side
- [x] Broadcast trigger uses SECURITY DEFINER

### API
- [x] Edge Function uses SERVICE_ROLE_KEY (server-side only)
- [x] Input validation on all parameters
- [x] Rate limiting configured (Supabase built-in)
- [x] CORS headers properly configured

### Client
- [x] Realtime uses private channels
- [x] Authentication required for subscriptions
- [x] Client uses anon key (not service role)
- [x] Optimistic updates with validation

---

## 🧪 Testing

### Test Full-Text Search

```sql
-- Test search function
SELECT * FROM public.search_organizations_ranked('ungdom Oslo', 10);

-- Test tsvector index
EXPLAIN ANALYZE
SELECT navn, ts_rank(search_vector, websearch_to_tsquery('norwegian', 'barn sport')) as rank
FROM public.organizations
WHERE search_vector @@ websearch_to_tsquery('norwegian', 'barn sport')
ORDER BY rank DESC
LIMIT 20;
```

### Test API Endpoint

```bash
# Using Next.js API route
curl "http://localhost:3000/api/search-organizations?query=ungdom&location=Oslo&limit=5"

# Using Edge Function
curl "https://<project-id>.supabase.co/functions/v1/search-organizations?query=ungdom&location=Oslo&limit=5"
```

### Test Realtime Broadcast

```sql
-- Trigger an update (in Supabase SQL Editor)
UPDATE public.organizations
SET aktivitet = aktivitet || ' (test)'
WHERE id = '<some-org-id>'
RETURNING id, navn;

-- Check if broadcast was sent (in client console)
-- You should see: [useOrganizationRealtime] Organization updated: ...
```

---

## 🎨 Example Claude Conversation

**User:** "Find sports organizations in Bergen that have websites"

**Claude (using tool):**
```json
{
  "name": "searchOrganizations",
  "input": {
    "query": "idrett sport",
    "poststed": "Bergen",
    "only_with_website": true,
    "limit": 15
  }
}
```

**API Response:**
```json
{
  "data": [
    {
      "id": "...",
      "navn": "Bergen Idrettslag",
      "aktivitet": "Fotball, håndball og ski for barn og ungdom",
      "hjemmeside": "https://bergen-il.no",
      "forretningsadresse_poststed": "Bergen",
      "fylke": "Vestland"
    }
  ],
  "meta": {
    "total": 42,
    "returned": 15,
    "has_more": true
  }
}
```

**Claude:** "I found 42 sports organizations in Bergen with websites. Here are the top 15..."

---

## 📊 Performance Optimization

### Indexes Created
- `idx_organizations_search_vector` (GIN) - Full-text search
- `idx_organizations_location` - Location filtering
- `idx_org_members_user_org` - Membership lookups
- `idx_organizations_frivillighetsregisteret` - Registry filter

### Query Performance Targets
- Simple location search: < 50ms
- Full-text search: < 200ms
- Realtime broadcast latency: < 100ms
- Member permission check: < 10ms

### Monitoring

Add to your observability:
```sql
-- Slow query log (in Supabase Logs)
-- Monitor queries > 1000ms

-- Index usage stats
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'organizations'
ORDER BY idx_scan DESC;
```

---

## 🐛 Troubleshooting

### Issue: Realtime not receiving events

**Solution:**
1. Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'organizations';`
2. Verify user is authenticated: `SELECT auth.uid();` (should return UUID, not null)
3. Check user is member: `SELECT * FROM org_members WHERE user_id = auth.uid();`
4. Enable Realtime in Dashboard: Database → Replication
5. Check channel subscription status in browser console

### Issue: Search returns no results

**Solution:**
1. Verify search_vector is populated: `SELECT count(*) FROM organizations WHERE search_vector IS NOT NULL;`
2. Test query directly: `SELECT * FROM search_organizations_ranked('test', 10);`
3. Check RLS policies allow SELECT
4. Verify `registrert_i_frivillighetsregisteret = true`

### Issue: API returns 500 error

**Solution:**
1. Check server logs in Supabase Dashboard → Edge Functions → Logs
2. Verify environment variables are set
3. Test Supabase connection: Try querying from SQL Editor
4. Check CORS headers if calling from browser

---

## 📚 Additional Resources

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [Claude Tool Use Guide](https://docs.anthropic.com/claude/docs/tool-use)
- [RLS Policies Best Practices](https://supabase.com/docs/guides/auth/row-level-security)

---

## 🎯 Next Steps

1. **Deploy to production**:
   - Run migrations in production Supabase project
   - Deploy Edge Function
   - Test with real data

2. **Enhance search**:
   - Add vector embeddings for semantic search
   - Implement faceted search (filters by category)
   - Add search analytics

3. **Scale Realtime**:
   - Monitor channel subscriptions
   - Implement presence tracking
   - Add collaborative features

4. **Integrate with Claude**:
   - Build chat interface using the custom tool
   - Add multi-turn conversations
   - Implement caching for frequently searched terms

---

**Status**: ✅ Ready for deployment

**Estimated setup time**: 15-30 minutes

**Support**: Open an issue in the repository for questions
