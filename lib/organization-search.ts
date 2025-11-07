import { createClient } from "@/lib/supabase/server"
import { searchVectorStore, extractOrganizationIds } from "@/lib/vector-search"
import { findOrganizationByOrgnr } from "@/lib/json-search"

export interface Organization {
  id: string
  organisasjonsnummer: string
  navn: string
  organisasjonsform_beskrivelse: string
  naeringskode1_beskrivelse: string
  naeringskode2_beskrivelse?: string
  naeringskode3_beskrivelse?: string
  aktivitet: string
  vedtektsfestet_formaal: string
  forretningsadresse_poststed: string
  forretningsadresse_kommune: string
  forretningsadresse_adresse?: string | string[] | null
  forretningsadresse_postnummer: string
  postadresse_poststed: string
  postadresse_postnummer: string
  postadresse_adresse: string
  hjemmeside: string
  epost: string
  telefon: string
  mobiltelefon?: string
  antall_ansatte?: number
  stiftelsesdato?: string
  registreringsdato_frivillighetsregisteret?: string
  fylke?: string
}

export interface SearchParams {
  query?: string // Legg til query-parameter for vector search
  location?: string
  interests?: string[]
  ageGroup?: string
  limit?: number
  userPostnummer?: string
  userKommune?: string
  userFylke?: string
}

function calculateLocationPriority(
  org: Organization,
  userPostnummer?: string,
  userKommune?: string,
  userFylke?: string,
): number {
  // Lågare tal = høgare prioritet
  if (userPostnummer && org.forretningsadresse_postnummer === userPostnummer) {
    return 1 // Same postnummer
  }
  if (userKommune && org.forretningsadresse_kommune?.toLowerCase().includes(userKommune.toLowerCase())) {
    return 2 // Same kommune
  }
  if (userFylke && org.fylke?.toLowerCase().includes(userFylke.toLowerCase())) {
    return 3 // Same fylke
  }
  return 4 // Andre plassar
}

export function normalizeBusinessAddress(raw: unknown): string[] {
  if (!raw) {
    return []
  }

  if (Array.isArray(raw)) {
    return raw
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter((value): value is string => value.length > 0)
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim()

    if (!trimmed) {
      return []
    }

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          return parsed
            .map((value) => (typeof value === "string" ? value.trim() : ""))
            .filter((value): value is string => value.length > 0)
        }
      } catch (error) {
        console.warn("[v0] Failed to parse serialized business address", error)
      }
    }

    return [trimmed]
  }

  if (typeof raw === "object") {
    const values = Object.values(raw as Record<string, unknown>)
    return values
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter((value): value is string => value.length > 0)
  }

  return []
}

export async function searchOrganizations(params: SearchParams): Promise<Organization[]> {
  const supabase = await createClient()

  let query = supabase
    .from("organizations_with_fylke")
    .select(`
      id,
      organisasjonsnummer,
      navn,
      organisasjonsform_beskrivelse,
      naeringskode1_beskrivelse,
      aktivitet,
      vedtektsfestet_formaal,
      forretningsadresse_poststed,
      forretningsadresse_kommune,
      forretningsadresse_postnummer,
      fylke,
      hjemmeside,
      epost,
      telefon
    `)
    .eq("registrert_i_frivillighetsregisteret", true)
    .not("navn", "is", null)
    .limit(params.limit || 100) // Hentar fleire for å sortere lokalt

  // Filter by location if provided
  if (params.location) {
    query = query.or(
      `forretningsadresse_poststed.ilike.%${params.location}%,forretningsadresse_kommune.ilike.%${params.location}%,fylke.ilike.%${params.location}%`,
    )
  }

  const { data, error } = await query

  if (error) {
    console.error("[v0] Error searching organizations:", error)
    return []
  }

  let organizations = (data as Organization[]).map((org) => ({
    ...org,
    forretningsadresse_adresse: normalizeBusinessAddress(org.forretningsadresse_adresse),
  }))

  if (params.userPostnummer || params.userKommune || params.userFylke) {
    organizations = organizations.sort((a, b) => {
      const priorityA = calculateLocationPriority(a, params.userPostnummer, params.userKommune, params.userFylke)
      const priorityB = calculateLocationPriority(b, params.userPostnummer, params.userKommune, params.userFylke)
      return priorityA - priorityB
    })
  }

  return organizations.slice(0, params.limit || 10)
}

export async function searchOrganizationsWithVector(params: SearchParams): Promise<Organization[]> {
  const supabase = await createClient()

  let searchQuery = ""

  // Prioriter direkte query først
  if (params.query && params.query.trim().length > 0) {
    searchQuery = params.query.trim()
  } else {
    // Bygg query frå parametrar
    const queryParts: string[] = []

    if (params.interests && params.interests.length > 0) {
      queryParts.push(`Interesser: ${params.interests.join(", ")}`)
    }
    if (params.ageGroup) {
      queryParts.push(`Aldersgruppe: ${params.ageGroup}`)
    }
    if (params.location) {
      queryParts.push(`Stad: ${params.location}`)
    }

    searchQuery = queryParts.join(". ")
  }

  console.log("[v0] Vector search query:", searchQuery)

  if (!searchQuery || searchQuery.trim().length < 2) {
    console.log("[v0] No valid query, using default SQL search")
    return searchOrganizations(params)
  }

  try {
    // Søk i vector store med høgare limit for betre resultat
    const vectorResults = await searchVectorStore(searchQuery, 30)
    console.log("[v0] Vector results:", vectorResults.length)

    if (vectorResults.length === 0) {
      // Fallback til vanleg SQL-søk
      console.log("[v0] No vector results, falling back to SQL search")
      return searchOrganizations(params)
    }

    // Ekstraher organisasjons-IDer
    const orgIds = extractOrganizationIds(vectorResults)
    console.log("[v0] Extracted org IDs:", orgIds.length)

    if (orgIds.length === 0) {
      console.log("[v0] No valid org IDs from vector results")
      return searchOrganizations(params)
    }

    // Hent organisasjonane frå database
    const { data, error } = await supabase
      .from("organizations_with_fylke")
      .select(
        `
      id,
      organisasjonsnummer,
      navn,
      organisasjonsform_beskrivelse,
      naeringskode1_beskrivelse,
      aktivitet,
      vedtektsfestet_formaal,
      forretningsadresse_poststed,
      forretningsadresse_kommune,
      forretningsadresse_adresse,
      forretningsadresse_postnummer,
      fylke,
      hjemmeside,
      epost,
      telefon
    `,
      )
      .in("id", orgIds)
      .eq("registrert_i_frivillighetsregisteret", true)

    if (error) {
      console.error("[v0] Error fetching organizations from vector IDs:", error)
      return searchOrganizations(params)
    }

    let organizations = (data as Organization[]).map((org) => ({
      ...org,
      forretningsadresse_adresse: normalizeBusinessAddress(org.forretningsadresse_adresse),
    }))
    console.log("[v0] Fetched organizations from DB:", organizations.length)

    if (organizations.length === 0) {
      console.log("[v0] No organizations found in DB, falling back to SQL")
      return searchOrganizations(params)
    }

    // Opprett ein map av vector scores
    const scoreMap = new Map(vectorResults.map((r) => [r.id, r.score]))

    organizations = organizations.sort((a, b) => {
      // Først sorter etter vector score
      const scoreA = scoreMap.get(a.id) || 0
      const scoreB = scoreMap.get(b.id) || 0

      if (Math.abs(scoreA - scoreB) > 0.05) {
        return scoreB - scoreA // Høgare score først
      }

      // Viss scorane er like, sorter etter plassering
      const priorityA = calculateLocationPriority(a, params.userPostnummer, params.userKommune, params.userFylke)
      const priorityB = calculateLocationPriority(b, params.userPostnummer, params.userKommune, params.userFylke)
      return priorityA - priorityB
    })

    return organizations.slice(0, params.limit || 5)
  } catch (error) {
    console.error("[v0] Vector search error:", error)
    return searchOrganizations(params)
  }
}

/**
 * Hent organisasjon basert på organisasjonsnummer OR UUID
 * Prøver JSON-database først, så Supabase som fallback
 */
export async function getOrganizationById(idOrOrgnr: string): Promise<Organization | null> {
  // Sjekk om det er organisasjonsnummer (9 siffer) eller UUID (36 teikn)
  const isOrgnr = /^\d{9}$/.test(idOrOrgnr)

  if (isOrgnr) {
    // Prøv å finne i JSON-databasen først
    console.log(`[v0] Looking up by organisasjonsnummer: ${idOrOrgnr}`)
    try {
      const jsonOrg = await findOrganizationByOrgnr(idOrOrgnr)
      if (jsonOrg) {
        console.log(`[v0] Found in JSON database: ${jsonOrg.navn}`)
        return {
          ...(jsonOrg as Organization),
          forretningsadresse_adresse: normalizeBusinessAddress(jsonOrg.forretningsadresse_adresse),
        }
      }
    } catch (jsonError) {
      console.error(`[v0] Error searching JSON database:`, jsonError)
      // Fortsett til Supabase fallback
    }
  }

  // Fallback til Supabase (for UUID eller om JSON-søk feilar)
  console.log(`[v0] Falling back to Supabase for: ${idOrOrgnr}`)

  try {
    const supabase = await createClient()

    const query = supabase
      .from("organizations")
      .select(`
        id,
        organisasjonsnummer,
        navn,
        organisasjonsform_beskrivelse,
        naeringskode1_beskrivelse,
        naeringskode2_beskrivelse,
        naeringskode3_beskrivelse,
        aktivitet,
        vedtektsfestet_formaal,
        forretningsadresse_poststed,
        forretningsadresse_kommune,
        forretningsadresse_adresse,
        forretningsadresse_postnummer,
        postadresse_poststed,
        postadresse_postnummer,
        postadresse_adresse,
        hjemmeside,
        epost,
        telefon,
        mobiltelefon,
        antall_ansatte,
        stiftelsesdato,
        registreringsdato_frivillighetsregisteret
      `)

    // Søk etter enten UUID eller organisasjonsnummer
    const { data, error } = await (isOrgnr
      ? query.eq("organisasjonsnummer", idOrOrgnr).single()
      : query.eq("id", idOrOrgnr).single())

    if (error) {
      console.error("[v0] Error fetching organization:", error)
      return null
    }

    return {
      ...(data as Organization),
      forretningsadresse_adresse: normalizeBusinessAddress(data?.forretningsadresse_adresse),
    }
  } catch (supabaseError) {
    console.error("[v0] Critical error in Supabase lookup:", supabaseError)
    return null
  }
}

export function formatOrganizationResult(org: Organization): string {
  let result = `\n**${org.navn}**\n`

  if (org.aktivitet) {
    result += `Aktivitet: ${org.aktivitet.substring(0, 150)}${org.aktivitet.length > 150 ? "..." : ""}\n`
  }

  if (org.vedtektsfestet_formaal) {
    result += `Formål: ${org.vedtektsfestet_formaal.substring(0, 150)}${org.vedtektsfestet_formaal.length > 150 ? "..." : ""}\n`
  }

  if (org.forretningsadresse_poststed) {
    result += `Stad: ${org.forretningsadresse_poststed}\n`
  }

  if (org.hjemmeside) {
    result += `Nettside: ${org.hjemmeside}\n`
  }

  if (org.telefon) {
    result += `Telefon: ${org.telefon}\n`
  }

  if (org.epost) {
    result += `E-post: ${org.epost}\n`
  }

  return result
}

export function formatOrganizationForChat(org: Organization): string {
  let result = `\n**${org.navn}**\n`

  if (org.aktivitet) {
    result += `Aktivitet: ${org.aktivitet.substring(0, 150)}${org.aktivitet.length > 150 ? "..." : ""}\n`
  }

  if (org.vedtektsfestet_formaal) {
    result += `Formål: ${org.vedtektsfestet_formaal.substring(0, 150)}${org.vedtektsfestet_formaal.length > 150 ? "..." : ""}\n`
  }

  if (org.forretningsadresse_poststed) {
    result += `Stad: ${org.forretningsadresse_poststed}\n`
  }

  if (org.hjemmeside) {
    result += `Nettside: ${org.hjemmeside}\n`
  }

  if (org.telefon) {
    result += `Telefon: ${org.telefon}\n`
  }

  if (org.epost) {
    result += `E-post: ${org.epost}\n`
  }

  // Bruk organisasjonsnummer i URL
  const urlId = org.organisasjonsnummer || org.id
  result += `Les meir: /organisasjon/${urlId}\n`

  return result
}

export interface OrganizationCardData {
  id: string
  navn: string
  aktivitet?: string
  formaal?: string
  poststed?: string
  kommune?: string
  hjemmeside?: string
  telefon?: string
  epost?: string
}

export function createOrganizationCards(organizations: Organization[]): OrganizationCardData[] {
  return organizations.map((org) => ({
    // Bruk organisasjonsnummer som ID for klikkbare kort
    id: org.organisasjonsnummer || org.id,
    navn: org.navn,
    aktivitet: org.aktivitet,
    formaal: org.vedtektsfestet_formaal,
    poststed: org.forretningsadresse_poststed,
    kommune: org.forretningsadresse_kommune,
    hjemmeside: org.hjemmeside,
    telefon: org.telefon,
    epost: org.epost,
  }))
}
