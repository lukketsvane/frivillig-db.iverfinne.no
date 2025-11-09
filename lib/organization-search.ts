import { createClient } from "@/lib/supabase/server"

export interface Organization {
  id: string
  organisasjonsnummer: number // bigint in database
  navn: string
  organisasjonsform_kode?: string
  organisasjonsform_beskrivelse?: string

  // Forretningsadresse fields
  forretningsadresse_land?: string
  forretningsadresse_landkode?: string
  forretningsadresse_postnummer?: string
  forretningsadresse_poststed?: string
  forretningsadresse_adresse?: string
  forretningsadresse_kommune?: string
  forretningsadresse_kommunenummer?: string

  // Postadresse fields
  postadresse_land?: string
  postadresse_landkode?: string
  postadresse_postnummer?: string
  postadresse_poststed?: string
  postadresse_adresse?: string
  postadresse_kommune?: string
  postadresse_kommunenummer?: string

  // Contact information
  telefon?: string
  mobiltelefon?: string
  epost?: string
  hjemmeside?: string

  // Næringskode fields
  naeringskode1_kode?: string
  naeringskode1_beskrivelse?: string
  naeringskode2_kode?: string
  naeringskode2_beskrivelse?: string
  naeringskode3_kode?: string
  naeringskode3_beskrivelse?: string

  // Purpose and activity
  vedtektsfestet_formaal?: string
  aktivitet?: string

  // Registration dates and status
  registreringsdato_enhetsregisteret?: string
  stiftelsesdato?: string
  registrert_i_mvaregisteret?: boolean
  registrert_i_foretaksregisteret?: boolean
  registrert_i_stiftelsesregisteret?: boolean
  registrert_i_frivillighetsregisteret?: boolean
  registreringsdato_frivillighetsregisteret?: string

  // Employee information
  antall_ansatte?: string
  har_registrert_antall_ansatte?: boolean

  // Additional organization data
  siste_innsendte_aarsregnskap?: string
  overordnet_enhet?: string
  institusjonell_sektorkode_kode?: string
  institusjonell_sektorkode_beskrivelse?: string

  // Status flags
  konkurs?: boolean
  konkursdato?: string
  under_avvikling?: boolean
  under_avvikling_dato?: string
  under_tvangsavvikling_eller_tvangsopplosning?: boolean
  tvangsavviklet_pga_manglende_sletting_dato?: string

  // Other fields
  icnpo_kategorier?: string
  kontonummer?: string
  maalform?: string
  registrert_i_partiregisteret?: boolean
  paategninger?: string
  er_i_konsern?: boolean

  // Timestamps
  created_at?: string
  updated_at?: string
  synced_at?: string
}

export interface SearchParams {
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
  // Note: fylke field may not be available in new schema, keeping for compatibility
  if (userFylke && org.forretningsadresse_kommune?.toLowerCase().includes(userFylke.toLowerCase())) {
    return 3 // Same fylke/region (approximated by kommune)
  }
  return 4 // Andre plassar
}

export async function searchOrganizations(params: SearchParams): Promise<Organization[]> {
  const supabase = await createClient()

  let query = supabase
    .from("organisasjoner")
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
      hjemmeside,
      epost,
      telefon
    `)
    .eq("registrert_i_frivillighetsregisteret", true)
    .not("navn", "is", null)
    .limit(params.limit || 1000) // Hentar fleire for å sortere lokalt

  // Filter by location if provided
  if (params.location) {
    query = query.or(
      `forretningsadresse_poststed.ilike.%${params.location}%,forretningsadresse_kommune.ilike.%${params.location}%`,
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

export async function getOrganizationById(id: string): Promise<Organization | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("organisasjoner")
    .select(`
      id,
      organisasjonsnummer,
      navn,
      organisasjonsform_kode,
      organisasjonsform_beskrivelse,
      forretningsadresse_land,
      forretningsadresse_landkode,
      forretningsadresse_postnummer,
      forretningsadresse_poststed,
      forretningsadresse_adresse,
      forretningsadresse_kommune,
      forretningsadresse_kommunenummer,
      postadresse_land,
      postadresse_landkode,
      postadresse_postnummer,
      postadresse_poststed,
      postadresse_adresse,
      postadresse_kommune,
      postadresse_kommunenummer,
      telefon,
      mobiltelefon,
      epost,
      hjemmeside,
      naeringskode1_kode,
      naeringskode1_beskrivelse,
      naeringskode2_kode,
      naeringskode2_beskrivelse,
      naeringskode3_kode,
      naeringskode3_beskrivelse,
      vedtektsfestet_formaal,
      aktivitet,
      registreringsdato_enhetsregisteret,
      stiftelsesdato,
      registrert_i_mvaregisteret,
      registrert_i_foretaksregisteret,
      registrert_i_stiftelsesregisteret,
      registrert_i_frivillighetsregisteret,
      registreringsdato_frivillighetsregisteret,
      antall_ansatte,
      har_registrert_antall_ansatte,
      siste_innsendte_aarsregnskap,
      overordnet_enhet,
      institusjonell_sektorkode_kode,
      institusjonell_sektorkode_beskrivelse,
      konkurs,
      konkursdato,
      under_avvikling,
      under_avvikling_dato,
      under_tvangsavvikling_eller_tvangsopplosning,
      tvangsavviklet_pga_manglende_sletting_dato,
      icnpo_kategorier,
      kontonummer,
      maalform,
      registrert_i_partiregisteret,
      paategninger,
      er_i_konsern,
      created_at,
      updated_at,
      synced_at
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
