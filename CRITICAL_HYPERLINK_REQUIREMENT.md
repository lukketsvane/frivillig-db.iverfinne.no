# ⚠️ CRITICAL: HYPERLINK REQUIREMENT ⚠️

## ABSOLUTE REQUIREMENT: EVERY Organization = Clickable Hyperlink

When using the `searchOrganizations` custom tool with Claude Sonnet 4.5, **EVERY SINGLE organization mention MUST be a clickable markdown hyperlink**.

---

## 🎯 The Rule

### ✅ CORRECT (Always do this):
```markdown
**[Bergen Idrettslag](https://frivillig-db.iverfinne.no/organisasjon/b409f77a-3e74-49f6-bd9a-9f135ecd7deb)**
```

### ❌ WRONG (NEVER do this):
```markdown
Bergen Idrettslag
Bergen Idrettslag (ID: b409f77a-3e74-49f6-bd9a-9f135ecd7deb)
ID: b409f77a-3e74-49f6-bd9a-9f135ecd7deb
View at: https://frivillig-db.iverfinne.no/organisasjon/...
```

---

## 🔗 URL Format

### CRITICAL: Use UUID from 'id' field

```
https://frivillig-db.iverfinne.no/organisasjon/{id}
```

Where `{id}` is the **UUID** from the `id` field in the API response.

### ❌ DO NOT use 'slug' in URLs

The `slug` field exists but is **NOT used for URLs**. Always use the `id` (UUID) field.

### Real Example:
```markdown
**[Bergen Idrettslag](https://frivillig-db.iverfinne.no/organisasjon/b409f77a-3e74-49f6-bd9a-9f135ecd7deb)**
```

---

## 📋 Enforcement in Tool Schema

The tool schema has **3 layers of enforcement**:

### Layer 1: Tool Description
```json
{
  "description": "⚠️ CRITICAL REQUIREMENT ⚠️ When presenting results,
  you MUST ALWAYS format EVERY SINGLE organization as a clickable
  markdown hyperlink using: **[Name](https://frivillig-db.iverfinne.no/organisasjon/{id})**
  NEVER show organizations without hyperlinks. NO EXCEPTIONS."
}
```

### Layer 2: Field Documentation
```json
{
  "id": {
    "description": "⚠️ CRITICAL: Unique organization UUID.
    YOU MUST USE THIS ID TO CREATE HYPERLINKS.
    Every organization MUST be presented as:
    **[{navn}](https://frivillig-db.iverfinne.no/organisasjon/{id})**
    NEVER show this ID to users directly."
  }
}
```

### Layer 3: Notes Section
```json
{
  "notes": [
    "⚠️ ABSOLUTE CRITICAL REQUIREMENT ⚠️ EVERY SINGLE organization mention
    MUST be a clickable markdown hyperlink. NO EXCEPTIONS.",
    "⚠️ NEVER EVER show organizations without hyperlinks."
  ]
}
```

---

## 🎨 Presentation Examples

### Single Result:
```markdown
Jeg fant **[Bergen Idrettslag](https://frivillig-db.iverfinne.no/organisasjon/b409f77a-3e74-49f6-bd9a-9f135ecd7deb)** i Bergen.
De jobber med fotball og håndball for barn og ungdom.
```

### Multiple Results:
```markdown
Jeg fant 5 organisasjoner i Bergen:

1. **[Bergen Idrettslag](https://frivillig-db.iverfinne.no/organisasjon/b409f77a-3e74-49f6-bd9a-9f135ecd7deb)**
   Fotball og håndball for barn
   📍 Bergen, Vestland

2. **[Fana IL](https://frivillig-db.iverfinne.no/organisasjon/a3c8e44f-9b21-4e7d-8f32-1a7b9c6d4e2f)**
   Allsidig idrett for alle aldre
   📍 Bergen, Vestland
```

### In Conversation:
```markdown
Du kan sjekke ut **[Bergen Idrettslag](https://frivillig-db.iverfinne.no/organisasjon/b409f77a-3e74-49f6-bd9a-9f135ecd7deb)**
for fotball, eller **[Bergen Svømmeklubb](https://frivillig-db.iverfinne.no/organisasjon/c5d9f88e-4a32-4b6c-9e1a-8b7c5d3e1f4a)**
for svømming.
```

---

## 🚫 What NEVER to Show Users

❌ **Raw UUIDs:**
```
b409f77a-3e74-49f6-bd9a-9f135ecd7deb
```

❌ **ID field labels:**
```
ID: b409f77a-3e74-49f6-bd9a-9f135ecd7deb
Organization ID: b409f77a-3e74-49f6-bd9a-9f135ecd7deb
```

❌ **Slug values:**
```
Slug: bergen-idrettslag
```

❌ **Raw JSON:**
```json
{
  "id": "b409f77a-3e74-49f6-bd9a-9f135ecd7deb",
  "navn": "Bergen Idrettslag"
}
```

❌ **Non-clickable URLs:**
```
View at: frivillig-db.iverfinne.no/organisasjon/b409f77a-3e74-49f6-bd9a-9f135ecd7deb
Link: https://frivillig-db.iverfinne.no/organisasjon/b409f77a-3e74-49f6-bd9a-9f135ecd7deb
```

---

## ✅ Implementation

### In Code:
```typescript
import { getOrganizationUrl } from '@/lib/claude-formatters'

// Correct
const link = `**[${org.navn}](${getOrganizationUrl(org)})**`
// Result: **[Bergen IL](https://frivillig-db.iverfinne.no/organisasjon/{uuid})**

// This function ALWAYS uses org.id (UUID)
```

### In Tool Schema:
Already built-in with 3 enforcement layers.

### In Claude Response:
Claude will automatically format with hyperlinks based on the tool schema instructions.

---

## 🧪 Testing

Run the example to see correct format:
```bash
npx tsx examples/claude-tool-usage.ts
```

Look for Example 7 - shows UUID-based hyperlinks.

---

## 📊 Summary

| Element | Requirement |
|---------|-------------|
| **Every org mention** | MUST be hyperlink |
| **URL format** | `https://frivillig-db.iverfinne.no/organisasjon/{id}` |
| **{id} source** | UUID from `id` field (NOT slug) |
| **Raw data** | NEVER show to users |
| **Exceptions** | NONE |

---

## 🎯 The Bottom Line

```
IF you mention an organization
THEN it MUST be a clickable hyperlink
USING the UUID from the 'id' field
IN the format: **[Name](https://frivillig-db.iverfinne.no/organisasjon/{id})**

NO EXCEPTIONS.
```

---

**This requirement is enforced at multiple levels and MUST be followed.**
