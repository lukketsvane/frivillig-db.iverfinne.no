# ⚠️ HYPERLINK FORMAT REFERENCE ⚠️

## Quick Reference for Claude Integration

---

## ✅ CORRECT Format (ALWAYS use this)

```markdown
**[Bergen Idrettslag](https://frivillig-db.iverfinne.no/organisasjon/b409f77a-3e74-49f6-bd9a-9f135ecd7deb)**
```

**Renders as:**
**[Bergen Idrettslag](https://frivillig-db.iverfinne.no/organisasjon/b409f77a-3e74-49f6-bd9a-9f135ecd7deb)**

---

## 🔗 URL Construction

```javascript
const url = `https://frivillig-db.iverfinne.no/organisasjon/${organization.id}`
```

### Field to Use:
- ✅ `organization.id` (UUID like `b409f77a-3e74-49f6-bd9a-9f135ecd7deb`)
- ❌ NOT `organization.slug` (like `bergen-idrettslag`)

---

## 📋 Real Example from Your Site

**Actual working URL:**
```
https://frivillig-db.iverfinne.no/organisasjon/b409f77a-3e74-49f6-bd9a-9f135ecd7deb
```

**As markdown hyperlink:**
```markdown
**[Organization Name](https://frivillig-db.iverfinne.no/organisasjon/b409f77a-3e74-49f6-bd9a-9f135ecd7deb)**
```

---

## ❌ WRONG Examples (NEVER do these)

### 1. No Link
```markdown
Bergen Idrettslag
```
**Why wrong:** Not clickable

### 2. Showing UUID
```markdown
Bergen Idrettslag (ID: b409f77a-3e74-49f6-bd9a-9f135ecd7deb)
```
**Why wrong:** Raw UUID visible to user

### 3. Using Slug
```markdown
**[Bergen Idrettslag](https://frivillig-db.iverfinne.no/organisasjon/bergen-idrettslag)**
```
**Why wrong:** Route expects UUID, not slug

### 4. Non-clickable URL
```markdown
View at: https://frivillig-db.iverfinne.no/organisasjon/b409f77a-3e74-49f6-bd9a-9f135ecd7deb
```
**Why wrong:** Not a markdown hyperlink

### 5. Raw JSON
```json
{
  "id": "b409f77a-3e74-49f6-bd9a-9f135ecd7deb",
  "navn": "Bergen Idrettslag"
}
```
**Why wrong:** Not user-friendly

---

## 🎯 Template

Copy and use this template:

```markdown
**[{organization.navn}](https://frivillig-db.iverfinne.no/organisasjon/{organization.id})**
```

Replace:
- `{organization.navn}` → Organization name from API
- `{organization.id}` → UUID from API

---

## 🧪 Test It

1. Get organization from API
2. Check the `id` field (UUID format)
3. Create link: `https://frivillig-db.iverfinne.no/organisasjon/{id}`
4. Format as markdown: `**[{navn}]({link})**`

**Result:** Clickable internal link to your site!

---

## 📊 Format Comparison

| Format | URL Uses | Correct? |
|--------|----------|----------|
| `/organisasjon/{id}` | UUID | ✅ YES |
| `/organisasjon/{slug}` | Slug | ❌ NO |
| `/organisasjon/{navn}` | Name | ❌ NO |

---

## ⚡ Quick Copy-Paste

For developers/integrators:

```typescript
// Get URL
const url = `https://frivillig-db.iverfinne.no/organisasjon/${org.id}`

// Create markdown link
const link = `**[${org.navn}](${url})**`

// Result: **[Bergen Idrettslag](https://frivillig-db.iverfinne.no/organisasjon/b409f77a-3e74-49f6-bd9a-9f135ecd7deb)**
```

---

## 🎯 The Rule

```
EVERY organization mention = Clickable hyperlink using UUID
```

**No exceptions. No raw data. No bare names.**

---

**See also:**
- `CRITICAL_HYPERLINK_REQUIREMENT.md` - Full documentation
- `tools/searchOrganizations.json` - Tool schema with enforcement
- `examples/claude-tool-usage.ts` - Code examples
