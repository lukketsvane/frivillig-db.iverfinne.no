import { createClient } from "@/lib/supabase/server"
import { searchVectorStore, extractOrganizationIds } from "@/lib/vector-search"

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
  forretningsadresse_adresse: string
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

  let organizations = data as Organization[]

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

  let searchQuery = params.query || ""

  if (!searchQuery) {
    if (params.interests && params.interests.length > 0) {
      searchQuery += `Interesser: ${params.interests.join(", ")}. `
    }
    if (params.ageGroup) {
      searchQuery += `Aldersgruppe: ${params.ageGroup}. `
    }
    if (params.location) {
      searchQuery += `Stad: ${params.location}. `
    }
  }

  console.log("[v0] Vector search query:", searchQuery)

  try {
    // Søk i vector store
    const vectorResults = await searchVectorStore(searchQuery, 20)
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

    let organizations = data as Organization[]

    // Sorter basert på plassering viss tilgjengeleg
    if (params.userPostnummer || params.userKommune || params.userFylke) {
      organizations = organizations.sort((a, b) => {
        const priorityA = calculateLocationPriority(a, params.userPostnummer, params.userKommune, params.userFylke)
        const priorityB = calculateLocationPriority(b, params.userPostnummer, params.userKommune, params.userFylke)
        return priorityA - priorityB
      })
    }

    return organizations.slice(0, params.limit || 5)
  } catch (error) {
    console.error("[v0] Vector search error:", error)
    return searchOrganizations(params)
  }
}

export async function getOrganizationById(id: string): Promise<Organization | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
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
    .eq("id", id)
    .single()

  if (error) {
    console.error("[v0] Error fetching organization:", error)
    return null
  }

  return data as Organization
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
  result += `ID: ${org.id}\n`

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

  result += `Les meir: /organisasjon/${org.id}\n`

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
    id: org.id,
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
