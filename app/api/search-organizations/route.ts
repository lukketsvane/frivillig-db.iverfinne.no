// Next.js API Route: /api/search-organizations
// Alternative to Edge Function for environments where Supabase Edge Functions aren't used

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

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

export async function GET(request: NextRequest) {
  const startTime = performance.now()

  try {
    const searchParams = request.nextUrl.searchParams

    // Parse parameters
    const params: SearchParams = {
      query: searchParams.get("query") || undefined,
      location: searchParams.get("location") || undefined,
      fylke: searchParams.get("fylke") || undefined,
      kommune: searchParams.get("kommune") || undefined,
      poststed: searchParams.get("poststed") || undefined,
      postnummer: searchParams.get("postnummer") || undefined,
      naeringskode: searchParams.get("naeringskode") || undefined,
      organisasjonsform: searchParams.get("organisasjonsform") || undefined,
      sort: (searchParams.get("sort") as any) || "relevance",
      order: (searchParams.get("order") as any) || "desc",
      limit: Math.min(Number(searchParams.get("limit")) || 20, 100),
      offset: Number(searchParams.get("offset")) || 0,
      include_contact: searchParams.get("include_contact") !== "false",
      include_detailed: searchParams.get("include_detailed") === "true",
      only_with_website: searchParams.get("only_with_website") === "true",
      only_with_email: searchParams.get("only_with_email") === "true",
    }

    // Validate parameters
    if (params.limit < 1 || params.limit > 100) {
      return NextResponse.json({ error: "Limit must be between 1 and 100" }, { status: 400 })
    }

    // Initialize Supabase client with service role
    // IMPORTANT: Only use service role on server-side routes
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Build select clause
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

    // Build query
    let query = supabase
      .from("organizations_with_fylke")
      .select(selectFields, { count: "exact" })
      .eq("registrert_i_frivillighetsregisteret", true)
      .not("navn", "is", null)

    // Apply text search
    if (params.query && params.query.trim()) {
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

    // Apply pagination
    query = query.range(params.offset, params.offset + params.limit - 1)

    // Execute query
    const { data, error, count } = await query

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Database query failed", details: error.message }, { status: 500 })
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
        has_more: params.offset + organizations.length < (count || 0),
        query_time_ms: Math.round(queryTime * 100) / 100,
      },
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
