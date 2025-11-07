/**
 * Claude Response Formatters
 * Helper functions to format organization data for Claude responses
 * with proper clickable links to frivillig-db.iverfinne.no
 */

export interface Organization {
  id: string
  navn: string
  slug: string
  aktivitet?: string | null
  vedtektsfestet_formaal?: string | null
  organisasjonsform_beskrivelse?: string | null
  naeringskode1_beskrivelse?: string | null
  forretningsadresse_poststed?: string | null
  forretningsadresse_kommune?: string | null
  forretningsadresse_postnummer?: string | null
  forretningsadresse_adresse?: string | null
  fylke?: string | null
  hjemmeside?: string | null
  epost?: string | null
  telefon?: string | null
  [key: string]: any
}

const BASE_URL = "https://frivillig-db.iverfinne.no"

/**
 * Generate organization page URL
 * Prefers slug over ID for cleaner URLs
 */
export function getOrganizationUrl(org: Organization): string {
  const identifier = org.slug || org.id
  return `${BASE_URL}/organisasjon/${identifier}`
}

/**
 * Truncate text with ellipsis
 */
function truncate(text: string | null | undefined, maxLength: number): string {
  if (!text) return ""
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + "..."
}

/**
 * Format organization as clickable markdown link
 */
export function formatOrganizationLink(org: Organization): string {
  const url = getOrganizationUrl(org)
  return `**[${org.navn}](${url})**`
}

/**
 * Format organization as compact list item (for 5+ results)
 */
export function formatCompactCard(org: Organization, index?: number): string {
  const url = getOrganizationUrl(org)
  const prefix = index !== undefined ? `${index}. ` : "- "

  let card = `${prefix}**[${org.navn}](${url})**\n`

  // Add short description (aktivitet or formål)
  const description = org.aktivitet || org.vedtektsfestet_formaal
  if (description) {
    card += `   ${truncate(description, 120)}\n`
  }

  // Add location
  if (org.forretningsadresse_poststed) {
    const location = org.fylke
      ? `${org.forretningsadresse_poststed}, ${org.fylke}`
      : org.forretningsadresse_poststed
    card += `   📍 ${location}\n`
  }

  return card
}

/**
 * Format organization as rich card (for 1-4 results)
 */
export function formatRichCard(org: Organization): string {
  const url = getOrganizationUrl(org)

  let card = `### **[${org.navn}](${url})**\n\n`

  // Activities
  if (org.aktivitet) {
    card += `**Om organisasjonen:**\n${truncate(org.aktivitet, 250)}\n\n`
  }

  // Purpose
  if (org.vedtektsfestet_formaal) {
    card += `**Formål:**\n${truncate(org.vedtektsfestet_formaal, 200)}\n\n`
  }

  // Location
  if (org.forretningsadresse_poststed) {
    card += `**Plassering:**\n`
    if (org.forretningsadresse_adresse && org.forretningsadresse_postnummer) {
      card += `📍 ${org.forretningsadresse_adresse}, ${org.forretningsadresse_postnummer} ${org.forretningsadresse_poststed}`
    } else {
      card += `📍 ${org.forretningsadresse_poststed}`
    }
    if (org.fylke) {
      card += ` (${org.fylke})`
    }
    card += `\n\n`
  }

  // Contact info
  const hasContact = org.hjemmeside || org.epost || org.telefon
  if (hasContact) {
    card += `**Kontakt:**\n`
    if (org.hjemmeside) {
      card += `🌐 ${org.hjemmeside}\n`
    }
    if (org.epost) {
      card += `📧 ${org.epost}\n`
    }
    if (org.telefon) {
      card += `📞 ${org.telefon}\n`
    }
    card += `\n`
  }

  card += `[Les mer og bli med →](${url})\n\n---\n`

  return card
}

/**
 * Format organization as inline mention (for single result in conversation)
 */
export function formatInlineMention(org: Organization): string {
  const url = getOrganizationUrl(org)
  const location = org.forretningsadresse_poststed || "Norge"
  const activity = org.aktivitet ? truncate(org.aktivitet, 80) : "frivillig arbeid"

  return `**[${org.navn}](${url})** i ${location}. De jobber med ${activity.toLowerCase()}. [Klikk her for å lese mer](${url}).`
}

/**
 * Format multiple organizations based on result count
 */
export function formatOrganizationList(
  organizations: Organization[],
  total: number,
  query?: string,
  location?: string
): string {
  if (organizations.length === 0) {
    return formatNoResults(location, query)
  }

  if (organizations.length === 1) {
    return formatSingleResult(organizations[0])
  }

  if (organizations.length <= 4) {
    return formatFewResults(organizations, total, location)
  }

  return formatManyResults(organizations, total, query, location)
}

/**
 * Format when no results found
 */
export function formatNoResults(location?: string, query?: string): string {
  const loc = location || "området"
  let message = `Jeg fant dessverre ingen organisasjoner som matcher søket ditt`

  if (location) {
    message += ` i ${location}`
  }
  message += `.\n\n`

  message += `Prøv å:\n`
  message += `- Utvide søket til hele fylket eller regionen\n`
  message += `- Bruke andre søkeord\n`
  message += `- [Utforsk alle organisasjoner](${BASE_URL}/utforsk)\n`

  return message
}

/**
 * Format single result (rich card)
 */
export function formatSingleResult(org: Organization): string {
  let message = `Jeg fant en organisasjon som matcher søket ditt:\n\n`
  message += formatRichCard(org)
  return message
}

/**
 * Format 2-4 results (rich cards)
 */
export function formatFewResults(
  organizations: Organization[],
  total: number,
  location?: string
): string {
  const count = organizations.length
  const loc = location ? ` i ${location}` : ""

  let message = `Jeg fant ${total} organisasjon${total > 1 ? 'er' : ''}${loc}. `

  if (total > count) {
    message += `Her er de ${count} mest relevante:\n\n`
  } else {
    message += `Her er ${count === 1 ? 'den' : 'de'}:\n\n`
  }

  message += organizations.map(org => formatRichCard(org)).join("\n")

  if (total > count) {
    const remaining = total - count
    message += `\n\nDet er ${remaining} flere organisasjon${remaining > 1 ? 'er' : ''}. Vil du se flere?\n`
  }

  return message
}

/**
 * Format 5+ results (compact list)
 */
export function formatManyResults(
  organizations: Organization[],
  total: number,
  query?: string,
  location?: string
): string {
  const count = organizations.length
  const loc = location ? ` i ${location}` : ""

  let message = `Jeg fant ${total} organisasjoner${loc}. `
  message += `Her er de ${count} mest relevante:\n\n`

  message += organizations.map((org, i) => formatCompactCard(org, i + 1)).join("\n")

  // Add "see more" link
  if (total > count) {
    message += `\n`
    const params = new URLSearchParams()
    if (query) params.set("query", query)
    if (location) params.set("location", location)
    const searchUrl = `${BASE_URL}/utforsk${params.toString() ? '?' + params.toString() : ''}`

    const remaining = total - count
    message += `\nDet er ${remaining} flere organisasjoner. [Se alle ${total} resultater →](${searchUrl})\n\n`
    message += `Vil du vite mer om noen av disse? Klikk på navnet for å se full info, kontaktdetaljer og påmeldingsinformasjon.\n`
  }

  return message
}

/**
 * Format tool result as instruction for Claude
 * This is what you send back to Claude after calling the API
 */
export function formatToolResultForClaude(
  data: any,
  meta: any,
  originalQuery?: string,
  originalLocation?: string
): string {
  const organizations: Organization[] = data || []
  const total = meta?.total || 0

  let instruction = `Search completed. Found ${total} organizations. `
  instruction += `Presenting ${organizations.length} results.\n\n`
  instruction += `CRITICAL INSTRUCTIONS FOR PRESENTATION:\n`
  instruction += `1. Format each organization as a clickable markdown link: **[Name](https://frivillig-db.iverfinne.no/organisasjon/{slug})**\n`
  instruction += `2. NEVER show raw data (IDs, slugs, JSON)\n`
  instruction += `3. Use the formatters provided or follow the templates exactly\n`
  instruction += `4. Make responses engaging and user-friendly\n\n`
  instruction += `---\n\n`
  instruction += `Raw data for formatting:\n\n`
  instruction += JSON.stringify({ data: organizations, meta }, null, 2)

  return instruction
}

/**
 * Example: Format API response for Claude
 */
export function createClaudeResponse(
  apiResponse: { data: Organization[]; meta: any },
  query?: string,
  location?: string
): string {
  return formatOrganizationList(
    apiResponse.data,
    apiResponse.meta.total,
    query,
    location
  )
}
