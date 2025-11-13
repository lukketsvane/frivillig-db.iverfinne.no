import { createClient } from "@/lib/supabase/server"

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
  forretningsadresse_adresse: string | null
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
}

export interface SearchParams {
  location?: string
  interests?: string[]
  ageGroup?: string
  limit?: number
  userPostnummer?: string
  userKommune?: string
  userLatitude?: number
  userLongitude?: number
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const geocodeCache = new Map<string, { lat: number; lon: number } | null>()

async function geocodeAddress(
  address: string,
  poststed: string,
  postnummer: string,
): Promise<{ lat: number; lon: number } | null> {
  const cacheKey = `${postnummer}-${poststed}`

  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!
  }

  try {
    const query = address ? `${address}, ${postnummer} ${poststed}, Norway` : `${postnummer} ${poststed}, Norway`

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&accept-language=no`,
      {
        headers: {
          "User-Agent": "frivillig-db/1.0",
        },
      },
    )

    const data = await response.json()

    if (data && data.length > 0) {
      const coords = {
        lat: Number.parseFloat(data[0].lat),
        lon: Number.parseFloat(data[0].lon),
      }
      geocodeCache.set(cacheKey, coords)
      return coords
    }
  } catch (error) {
    console.error("[v0] Geocoding error:", error)
  }

  geocodeCache.set(cacheKey, null)
  return null
}

function calculateLocationPriority(org: Organization, userPostnummer?: string, userKommune?: string): number {
  // Lågare tal = høgare prioritet
  if (userPostnummer && org.forretningsadresse_postnummer === userPostnummer) {
    return 1 // Same postnummer
  }
  if (userKommune && org.forretningsadresse_kommune?.toLowerCase().includes(userKommune.toLowerCase())) {
    return 2 // Same kommune
  }
  return 3 // Andre plassar
}

export async function searchOrganizations(params: SearchParams): Promise<Organization[]> {
  const supabase = await createClient()

  let query = supabase
    .from("organisasjonar")
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
      forretningsadresse_postnummer,
      forretningsadresse_adresse,
      hjemmeside,
      epost,
      telefon
    `)
    .eq("registrert_i_frivillighetsregisteret", true)
    .not("navn", "is", null)
    .limit(params.limit || 1000) // Hentar fleire for å sortere lokalt

  if (params.location) {
    query = query.or(
      `forretningsadresse_poststed.ilike.%${params.location}%,forretningsadresse_kommune.ilike.%${params.location}%`,
    )
  }

  const { data, error } = await query

  if (error) {
    console.error("[v0] Error searching organizations:", error.message)
    return []
  }

  console.log("[v0] Found organizations before filtering:", data?.length || 0)

  let organizations = data as Organization[]

  if (params.interests && params.interests.length > 0) {
    organizations = organizations.filter((org) => {
      const searchText =
        `${org.navn} ${org.aktivitet} ${org.vedtektsfestet_formaal} ${org.naeringskode1_beskrivelse} ${org.naeringskode2_beskrivelse || ""} ${org.naeringskode3_beskrivelse || ""} ${org.organisasjonsform_beskrivelse}`.toLowerCase()

      return params.interests!.some((interest) => {
        const keywords = interest.toLowerCase().split(" ")
        return keywords.some((keyword) => searchText.includes(keyword))
      })
    })

    console.log("[v0] Organizations after interest filtering:", organizations.length)
  }

  if (params.userLatitude && params.userLongitude) {
    console.log("[v0] Sorting by GPS proximity...")

    // Geocode organizations and calculate distances
    const orgsWithDistance = await Promise.all(
      organizations.map(async (org) => {
        const coords = await geocodeAddress(
          org.forretningsadresse_adresse || "",
          org.forretningsadresse_poststed,
          org.forretningsadresse_postnummer,
        )

        const distance = coords
          ? calculateDistance(params.userLatitude!, params.userLongitude!, coords.lat, coords.lon)
          : Number.POSITIVE_INFINITY

        return { org, distance }
      }),
    )

    // Sort by distance
    orgsWithDistance.sort((a, b) => a.distance - b.distance)
    organizations = orgsWithDistance.map((item) => item.org)

    console.log("[v0] Sorted by GPS distance, closest org:", organizations[0]?.navn)
  } else if (params.userPostnummer || params.userKommune) {
    // Fallback to postal code matching if no GPS coordinates
    organizations = organizations.sort((a, b) => {
      const priorityA = calculateLocationPriority(a, params.userPostnummer, params.userKommune)
      const priorityB = calculateLocationPriority(b, params.userPostnummer, params.userKommune)
      return priorityA - priorityB
    })
  }

  return organizations.slice(0, params.limit || 10)
}

export async function getOrganizationById(id: string): Promise<Organization | null> {
  const supabase = await createClient()

  console.log("[v0] Fetching organization from 'organisasjonar' table with ID:", id)

  const { data, error } = await supabase
    .from("organisasjonar")
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

  console.log("[v0] Successfully fetched organization:", data?.navn)

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
