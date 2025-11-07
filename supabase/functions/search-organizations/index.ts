// Supabase Edge Function: search-organizations
// Endpoint: /functions/v1/search-organizations
// Description: Search Norwegian volunteer organizations with full-text search and location filtering

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface SearchParams {
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

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[æøå]/g, (char) => {
      const map: Record<string, string> = { æ: "ae", ø: "o", å: "aa" }
      return map[char] || char
    })
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const startTime = performance.now()

  try {
    // Parse query parameters
    const url = new URL(req.url)
    const params: SearchParams = {
      query: url.searchParams.get("query") || undefined,
      location: url.searchParams.get("location") || undefined,
      fylke: url.searchParams.get("fylke") || undefined,
      kommune: url.searchParams.get("kommune") || undefined,
      poststed: url.searchParams.get("poststed") || undefined,
      postnummer: url.searchParams.get("postnummer") || undefined,
      naeringskode: url.searchParams.get("naeringskode") || undefined,
      organisasjonsform: url.searchParams.get("organisasjonsform") || undefined,
      sort: (url.searchParams.get("sort") as any) || "relevance",
      order: (url.searchParams.get("order") as any) || "desc",
      limit: Math.min(Number(url.searchParams.get("limit")) || 20, 100),
      offset: Number(url.searchParams.get("offset")) || 0,
      include_contact: url.searchParams.get("include_contact") !== "false",
      include_detailed: url.searchParams.get("include_detailed") === "true",
      only_with_website: url.searchParams.get("only_with_website") === "true",
      only_with_email: url.searchParams.get("only_with_email") === "true",
    }

    // Validate parameters
    if (params.limit < 1 || params.limit > 100) {
      return new Response(
        JSON.stringify({ error: "Limit must be between 1 and 100" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Initialize Supabase client with service role for full access
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Build select clause based on inclusion flags
    let selectFields = `
      id,
      navn,
      organisasjonsform_beskrivelse,
      naeringskode1_beskrivelse,
      aktivitet,
      vedtektsfestet_formaal,
      forretningsadresse_poststed,
      forretningsadresse_kommune,
      forretningsadresse_postnummer,
      forretningsadresse_adresse,
      fylke
    `

    if (params.include_contact) {
      selectFields += `,
        hjemmeside,
        epost,
        telefon`
    }

    if (params.include_detailed) {
      selectFields += `,
        organisasjonsnummer,
        naeringskode2_beskrivelse,
        naeringskode3_beskrivelse,
        mobiltelefon,
        antall_ansatte,
        stiftelsesdato,
        registreringsdato_frivillighetsregisteret,
        postadresse_poststed,
        postadresse_postnummer,
        postadresse_adresse`
    }

    // Use view for fylke support
    let query = supabase
      .from("organizations_with_fylke")
      .select(selectFields, { count: "exact" })
      .eq("registrert_i_frivillighetsregisteret", true)
      .not("navn", "is", null)

    // Apply text search if query provided
    if (params.query && params.query.trim()) {
      // Use textSearch for tsvector if available, otherwise use ilike
      const searchTerm = params.query.trim()
      query = query.or(
        `navn.ilike.%${searchTerm}%,aktivitet.ilike.%${searchTerm}%,vedtektsfestet_formaal.ilike.%${searchTerm}%`
      )
    }

    // Apply location filters
    if (params.location) {
      query = query.or(
        `forretningsadresse_poststed.ilike.%${params.location}%,forretningsadresse_kommune.ilike.%${params.location}%,fylke.ilike.%${params.location}%`
      )
    }

    if (params.fylke) {
      query = query.ilike("fylke", `%${params.fylke}%`)
    }

    if (params.kommune) {
      query = query.ilike("forretningsadresse_kommune", `%${params.kommune}%`)
    }

    if (params.poststed) {
      query = query.ilike("forretningsadresse_poststed", `%${params.poststed}%`)
    }

    if (params.postnummer) {
      query = query.eq("forretningsadresse_postnummer", params.postnummer)
    }

    if (params.naeringskode) {
      query = query.ilike("naeringskode1_beskrivelse", `%${params.naeringskode}%`)
    }

    if (params.organisasjonsform) {
      query = query.ilike("organisasjonsform_beskrivelse", `%${params.organisasjonsform}%`)
    }

    // Contact filters
    if (params.only_with_website) {
      query = query.not("hjemmeside", "is", null)
    }

    if (params.only_with_email) {
      query = query.not("epost", "is", null)
    }

    // Apply sorting
    if (params.sort === "name") {
      query = query.order("navn", { ascending: params.order === "asc" })
    } else if (params.sort === "stiftelsesdato") {
      query = query.order("stiftelsesdato", { ascending: params.order === "asc", nullsFirst: false })
    } else if (params.sort === "registreringsdato_frivillighetsregisteret") {
      query = query.order("registreringsdato_frivillighetsregisteret", {
        ascending: params.order === "asc",
        nullsFirst: false,
      })
    }
    // Note: relevance sorting would require ts_rank with tsvector

    // Apply pagination
    query = query.range(params.offset, params.offset + params.limit - 1)

    // Execute query
    const { data, error, count } = await query

    if (error) {
      console.error("Database error:", error)
      return new Response(
        JSON.stringify({ error: "Database query failed", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Add slug to each organization
    const organizations = (data || []).map((org: any) => ({
      ...org,
      slug: generateSlug(org.navn),
    }))

    const queryTime = performance.now() - startTime

    // Build response
    const response = {
      data: organizations,
      meta: {
        total: count || 0,
        limit: params.limit,
        offset: params.offset,
        returned: organizations.length,
        has_more: (params.offset + organizations.length) < (count || 0),
        query_time_ms: Math.round(queryTime * 100) / 100,
      },
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Function error:", error)
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
