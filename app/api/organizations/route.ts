import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateObject } from "ai"
import { z } from "zod"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sok = searchParams.get("sok")
  const stad = searchParams.get("stad")
  const limit = searchParams.get("limit") ? Number.parseInt(searchParams.get("limit")!) : 50

  const supabase = await createClient()

  let query = supabase
    .from("organisasjonar")
    .select(
      `
      id,
      navn,
      aktivitet,
      vedtektsfestet_formaal,
      forretningsadresse_poststed,
      forretningsadresse_kommune,
      naeringskode1_beskrivelse,
      naeringskode2_beskrivelse,
      organisasjonsform_beskrivelse,
      hjemmeside,
      epost,
      telefon
    `,
    )
    .eq("registrert_i_frivillighetsregisteret", true)
    .not("navn", "is", null)
    .order("navn")
    .limit(200)

  let searchKeywords: string[] = []
  let searchCategories: string[] = []

  if (sok && sok.length > 2) {
    try {
      const { object } = await generateObject({
        model: "openai/gpt-4o-mini",
        schema: z.object({
          keywords: z.array(z.string()).describe("Key search terms extracted from the query"),
          categories: z
            .array(z.string())
            .describe(
              "Volunteer categories: kultur, idrett, miljø, sosial, helse, barn, ungdom, eldre, dyr, utdanning, lokal",
            ),
          location: z.string().optional().describe("Location mentioned in query"),
        }),
        prompt: `Analyser denne søkjespørsmålet frå ein brukar som leitar etter frivilligorganisasjonar i Noreg: "${sok}"
        
Ekstrahér:
1. Viktige søkjeord (keywords) - enkeltord og uttrykk som organisasjonar kan innehalde
2. Kategoriar (categories) - kva type frivilligarbeid brukaren er interessert i
3. Stad (location) - om det er nemnt ein stad

Døme: "Eg vil jobbe med barn i Bergen" → keywords: ["barn"], categories: ["barn", "sosial"], location: "Bergen"`,
      })

      searchKeywords = object.keywords
      searchCategories = object.categories
      if (object.location && !stad) {
        searchParams.set("stad", object.location)
      }

      console.log("[v0] AI extracted:", { searchKeywords, searchCategories })
    } catch (error) {
      console.error("[v0] AI search enhancement failed, falling back to basic search:", error)
      searchKeywords = sok
        .toLowerCase()
        .split(/\s+/)
        .filter((k) => k.length > 2)
    }
  }

  if (sok) {
    const allTerms = [...searchKeywords, ...searchCategories, sok]
    const uniqueTerms = [...new Set(allTerms.map((t) => t.toLowerCase()))]

    const conditions = uniqueTerms
      .map(
        (term) =>
          `navn.ilike.%${term}%,aktivitet.ilike.%${term}%,vedtektsfestet_formaal.ilike.%${term}%,naeringskode1_beskrivelse.ilike.%${term}%,naeringskode2_beskrivelse.ilike.%${term}%,organisasjonsform_beskrivelse.ilike.%${term}%`,
      )
      .join(",")

    query = query.or(conditions)
  }

  if (stad) {
    query = query.or(`forretningsadresse_poststed.ilike.%${stad}%,forretningsadresse_kommune.ilike.%${stad}%`)
  }

  const { data: organizations, error } = await query

  if (error) {
    console.error("[v0] Error fetching organizations:", error)
    return NextResponse.json({ error: error.message, organizations: [], topResults: [] }, { status: 500 })
  }

  const scoredOrgs = (organizations || []).map((org: any) => {
    let score = 0

    if (sok) {
      const searchLower = sok.toLowerCase()
      const allTerms = [...searchKeywords, ...searchCategories, searchLower]

      allTerms.forEach((term) => {
        const termLower = term.toLowerCase()

        // Exact match in name is highest priority
        if (org.navn?.toLowerCase() === termLower) score += 100
        if (org.navn?.toLowerCase().startsWith(termLower)) score += 50
        if (org.navn?.toLowerCase().includes(termLower)) score += 20

        if (org.aktivitet?.toLowerCase().includes(termLower)) score += 10
        if (org.vedtektsfestet_formaal?.toLowerCase().includes(termLower)) score += 8
        if (org.naeringskode1_beskrivelse?.toLowerCase().includes(termLower)) score += 5
        if (org.naeringskode2_beskrivelse?.toLowerCase().includes(termLower)) score += 3
        if (org.organisasjonsform_beskrivelse?.toLowerCase().includes(termLower)) score += 2
      })

      // Boost if multiple keywords match
      const keywordMatches = searchKeywords.filter((kw) =>
        `${org.navn} ${org.aktivitet} ${org.vedtektsfestet_formaal}`.toLowerCase().includes(kw.toLowerCase()),
      ).length
      score += keywordMatches * 15
    }

    return { ...org, _score: score }
  })

  // Sort by score
  scoredOrgs.sort((a, b) => b._score - a._score)

  const topResults = scoredOrgs.slice(0, 5)
  const allResults = scoredOrgs.slice(0, limit)

  return NextResponse.json({
    organizations: allResults,
    topResults: topResults,
  })
}
