import { createClient } from "./supabase/server"
import type { Organization, SearchFilters } from "./types"

export async function searchOrganizations(
  filters: SearchFilters = {},
  page = 1,
  pageSize = 50,
): Promise<{ data: Organization[]; total: number }> {
  const supabase = await createClient()

  let query = supabase
    .from("organisasjonar")
    .select(
      "id, navn, aktivitet, vedtektsfestet_formaal, forretningsadresse_poststed, forretningsadresse_kommune, naeringskode1_beskrivelse, hjemmeside, epost, telefon",
      { count: "exact" },
    )
    .eq("registrert_i_frivillighetsregisteret", true)
    .not("navn", "is", null)

  if (filters.searchQuery) {
    query = query.or(
      `navn.ilike.%${filters.searchQuery}%,aktivitet.ilike.%${filters.searchQuery}%,vedtektsfestet_formaal.ilike.%${filters.searchQuery}%`,
    )
  }

  if (filters.kommune) {
    query = query.eq("forretningsadresse_kommune", filters.kommune)
  }

  if (filters.aktivitet) {
    query = query.ilike("aktivitet", `%${filters.aktivitet}%`)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await query.order("navn", { ascending: true }).range(from, to)

  if (error) {
    console.error("[v0] Error fetching organizations:", error)
    throw error
  }

  return {
    data: data || [],
    total: count || 0,
  }
}

export async function getOrganizationById(id: string): Promise<Organization | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.from("organisasjonar").select("*").eq("id", id).single()

  if (error) {
    console.error("[v0] Error fetching organization:", error)
    return null
  }

  return data
}

export async function getUniqueKommuner(): Promise<string[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("organisasjonar")
    .select("forretningsadresse_kommune")
    .eq("registrert_i_frivillighetsregisteret", true)
    .not("forretningsadresse_kommune", "is", null)

  if (error) {
    console.error("[v0] Error fetching kommuner:", error)
    return []
  }

  const kommuner = Array.from(new Set(data.map((d) => d.forretningsadresse_kommune).filter(Boolean)))
  return kommuner.sort()
}
