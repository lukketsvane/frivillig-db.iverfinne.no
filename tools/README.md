# searchOrganizations Custom Tool for Claude

**File:** `searchOrganizations.json`

This custom tool enables Claude Sonnet 4.5 to search the Norwegian volunteer organizations database and present results with **clickable internal links** to your website.

---

## 🎯 Key Feature: Automatic Clickable Links

When Claude uses this tool, it **automatically formats results as clickable markdown links** pointing to:

```
https://frivillig-db.iverfinne.no/organisasjon/{slug}
```

### Example Output

**User asks:** "Find sports clubs in Bergen"

**Claude responds:**
```markdown
Jeg fant 23 idrettsklubber i Bergen. Her er de 5 mest relevante:

1. **[Bergen Idrettslag](https://frivillig-db.iverfinne.no/organisasjon/bergen-idrettslag)**
   Fotball, håndball og ski for barn og ungdom
   📍 Bergen, Vestland

2. **[Fana Idrettslag](https://frivillig-db.iverfinne.no/organisasjon/fana-idrettslag)**
   Allsidig idrettsklubb med fokus på barne- og ungdomsidrett
   📍 Bergen, Vestland
```

✅ **Every organization name = clickable link to your website**

---

## 📋 How It Works

### 1. Tool Schema Instructions

The tool description explicitly instructs Claude:

```json
{
  "description": "... IMPORTANT: When presenting results to users,
  ALWAYS format each organization as a clickable card/link using
  the format https://frivillig-db.iverfinne.no/organisasjon/{slug} ..."
}
```

### 2. Response Schema Guidance

The `slug` field description tells Claude:

```json
{
  "slug": {
    "description": "URL-friendly slug for organization page.
    Use this to create clickable links:
    https://frivillig-db.iverfinne.no/organisasjon/{slug}"
  }
}
```

### 3. Notes Section Enforcement

The tool includes critical formatting rules:

```json
{
  "notes": [
    "CRITICAL: When presenting results to users, ALWAYS create
    clickable markdown links using the format:
    [Organization Name](https://frivillig-db.iverfinne.no/organisasjon/{slug})",

    "Example presentation:
    '**[Bergen Idrettslag](https://frivillig-db.iverfinne.no/organisasjon/bergen-idrettslag)** -
    Fotball og håndball for barn og ungdom i Bergen (Vestland)'",

    "Each organization card should be clickable and link to
    https://frivillig-db.iverfinne.no/organisasjon/{slug} for full details."
  ]
}
```

---

## 🚀 Quick Start

### 1. Register the Tool

```typescript
import Anthropic from '@anthropic-ai/sdk'
import searchTool from './tools/searchOrganizations.json'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

const response = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 4096,
  tools: [searchTool],
  messages: [{
    role: 'user',
    content: 'Find youth organizations in Oslo'
  }]
})
```

### 2. Handle Tool Calls

```typescript
if (response.stop_reason === 'tool_use') {
  const toolUse = response.content.find(block =>
    block.type === 'tool_use' && block.name === 'searchOrganizations'
  )

  // Call your API
  const params = new URLSearchParams(toolUse.input)
  const result = await fetch(`/api/search-organizations?${params}`)
  const data = await result.json()

  // Send result back to Claude
  const finalResponse = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    tools: [searchTool],
    messages: [
      ...conversationHistory,
      { role: 'assistant', content: response.content },
      {
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(data)
        }]
      }
    ]
  })
}
```

### 3. Claude Automatically Formats with Links!

Claude receives the raw JSON:
```json
{
  "data": [
    {
      "id": "123-456",
      "navn": "Oslo Idrettslag",
      "slug": "oslo-idrettslag",
      "aktivitet": "Sport for barn"
    }
  ]
}
```

Claude outputs clickable markdown:
```markdown
**[Oslo Idrettslag](https://frivillig-db.iverfinne.no/organisasjon/oslo-idrettslag)**
Sport for barn
```

---

## 🎨 Optional: Use Helper Formatters

For more control, use the provided formatters:

```typescript
import { createClaudeResponse } from '@/lib/claude-formatters'

// Format API response for Claude
const formattedText = createClaudeResponse(
  apiResponse, // { data: [...], meta: {...} }
  'ungdom',    // original query
  'Oslo'       // original location
)

// Send formatted text to Claude
{
  type: 'tool_result',
  tool_use_id: toolUse.id,
  content: formattedText
}
```

This gives you explicit control over formatting while still ensuring clickable links.

---

## ✅ What Claude Will Do

Based on the tool schema, Claude will:

1. ✅ Format every organization as a clickable markdown link
2. ✅ Use the full URL: `https://frivillig-db.iverfinne.no/organisasjon/{slug}`
3. ✅ Bold organization names for emphasis
4. ✅ Add emojis for visual hierarchy (📍 location, 🌐 website, etc.)
5. ✅ Truncate long descriptions with "..."
6. ✅ Provide "see more" links for pagination
7. ✅ Use Norwegian language naturally

## ❌ What Claude Will NOT Do

1. ❌ Show raw JSON or database fields
2. ❌ Display IDs or slugs to users
3. ❌ Create non-clickable URLs
4. ❌ Format results as plain text lists

---

## 📊 Search Parameters

The tool supports comprehensive search options:

```typescript
{
  query: "ungdom idrett",           // Full-text search
  location: "Oslo",                 // General location filter
  fylke: "Vestland",               // County filter
  kommune: "Bergen",               // Municipality filter
  poststed: "Bergen",              // City filter
  postnummer: "5020",              // Postal code
  naeringskode: "Idrett",          // Industry classification
  organisasjonsform: "Forening",   // Organization type
  sort: "relevance",               // relevance, name, date
  order: "desc",                   // asc, desc
  limit: 20,                       // Max results (1-100)
  offset: 0,                       // Pagination offset
  include_contact: true,           // Include website/email/phone
  include_detailed: false,         // Include full details
  only_with_website: false,        // Filter to orgs with websites
  only_with_email: false           // Filter to orgs with email
}
```

---

## 📚 Documentation

- **Full deployment guide:** `../REALTIME_INTEGRATION.md`
- **Presentation guidelines:** `../CLAUDE_PRESENTATION_GUIDE.md`
- **Code examples:** `../examples/claude-tool-usage.ts`
- **Formatters library:** `../lib/claude-formatters.ts`

---

## 🔗 Link Format Reference

### Primary Format (Preferred)
```
https://frivillig-db.iverfinne.no/organisasjon/{slug}
```

### Fallback (if slug is null)
```
https://frivillig-db.iverfinne.no/organisasjon/{id}
```

### Examples
```
https://frivillig-db.iverfinne.no/organisasjon/bergen-idrettslag
https://frivillig-db.iverfinne.no/organisasjon/oslo-svommeklubb
https://frivillig-db.iverfinne.no/organisasjon/trondheim-kulturforening
```

---

## 🧪 Testing

To verify the tool generates clickable links:

```bash
# Run the example showing expected format
cd examples
npx tsx claude-tool-usage.ts

# Look for "Example 7: Expected Claude Response Format"
# This shows exactly how Claude should format results
```

---

## 🎯 Summary

✅ **Zero configuration needed** - Claude automatically creates clickable links
✅ **Tool schema has explicit instructions** - Built into the JSON
✅ **Works with all Claude Sonnet 4.5 integrations**
✅ **Full URL format** - Always uses `https://frivillig-db.iverfinne.no`
✅ **User-friendly** - Natural Norwegian language with emojis
✅ **Consistent formatting** - Same style across all responses

---

**Ready to use!** Just register the tool and Claude handles the rest.

For questions or customization, see `CLAUDE_PRESENTATION_GUIDE.md`.
