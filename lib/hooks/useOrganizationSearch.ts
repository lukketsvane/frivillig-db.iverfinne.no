// React Hook: useOrganizationSearch
// Purpose: Client-side hook for searching organizations using the custom tool API
// Usage: const { results, loading, error, search } = useOrganizationSearch()

import { useState, useCallback } from "react"

export interface SearchOrganizationParams {
  query?: string
  location?: string
  fylke?: string
  kommune?: string
  poststed?: string
  postnummer?: string
  naeringskode?: string
  organisasjonsform?: string
  sort?: "relevance" | "name" | "stiftelsesdato" | "registreringsdato_frivillighetsregisteret"
  order?: "asc" | "desc"
  limit?: number
  offset?: number
  include_contact?: boolean
  include_detailed?: boolean
  only_with_website?: boolean
  only_with_email?: boolean
}

export interface OrganizationSearchResult {
  id: string
  navn: string
  slug: string
  aktivitet?: string
  vedtektsfestet_formaal?: string
  organisasjonsform_beskrivelse?: string
  naeringskode1_beskrivelse?: string
  forretningsadresse_poststed?: string
  forretningsadresse_kommune?: string
  forretningsadresse_postnummer?: string
  forretningsadresse_adresse?: string
  fylke?: string
  hjemmeside?: string
  epost?: string
  telefon?: string
  [key: string]: any
}

export interface SearchMeta {
  total: number
  limit: number
  offset: number
  returned: number
  has_more: boolean
  query_time_ms?: number
}

export interface SearchResponse {
  data: OrganizationSearchResult[]
  meta: SearchMeta
}

interface UseOrganizationSearchReturn {
  results: OrganizationSearchResult[]
  meta: SearchMeta | null
  loading: boolean
  error: Error | null
  search: (params: SearchOrganizationParams) => Promise<void>
  reset: () => void
}

export function useOrganizationSearch(): UseOrganizationSearchReturn {
  const [results, setResults] = useState<OrganizationSearchResult[]>([])
  const [meta, setMeta] = useState<SearchMeta | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const search = useCallback(async (params: SearchOrganizationParams) => {
    try {
      setLoading(true)
      setError(null)

      // Build query parameters
      const searchParams = new URLSearchParams()

      if (params.query) searchParams.set("query", params.query)
      if (params.location) searchParams.set("location", params.location)
      if (params.fylke) searchParams.set("fylke", params.fylke)
      if (params.kommune) searchParams.set("kommune", params.kommune)
      if (params.poststed) searchParams.set("poststed", params.poststed)
      if (params.postnummer) searchParams.set("postnummer", params.postnummer)
      if (params.naeringskode) searchParams.set("naeringskode", params.naeringskode)
      if (params.organisasjonsform) searchParams.set("organisasjonsform", params.organisasjonsform)
      if (params.sort) searchParams.set("sort", params.sort)
      if (params.order) searchParams.set("order", params.order)
      if (params.limit !== undefined) searchParams.set("limit", params.limit.toString())
      if (params.offset !== undefined) searchParams.set("offset", params.offset.toString())
      if (params.include_contact !== undefined) searchParams.set("include_contact", params.include_contact.toString())
      if (params.include_detailed !== undefined)
        searchParams.set("include_detailed", params.include_detailed.toString())
      if (params.only_with_website !== undefined)
        searchParams.set("only_with_website", params.only_with_website.toString())
      if (params.only_with_email !== undefined) searchParams.set("only_with_email", params.only_with_email.toString())

      // Call API route (adjust endpoint if using Edge Function)
      const response = await fetch(`/api/search-organizations?${searchParams.toString()}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Search failed with status ${response.status}`)
      }

      const data: SearchResponse = await response.json()

      setResults(data.data)
      setMeta(data.meta)
    } catch (err) {
      console.error("[useOrganizationSearch] Search error:", err)
      setError(err instanceof Error ? err : new Error("Search failed"))
      setResults([])
      setMeta(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResults([])
    setMeta(null)
    setError(null)
  }, [])

  return {
    results,
    meta,
    loading,
    error,
    search,
    reset,
  }
}
