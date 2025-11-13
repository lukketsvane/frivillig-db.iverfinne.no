import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateObject } from "ai"
import { z } from "zod"

const geocodeCache = new Map<string, { lat: number; lon: number } | null>()

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function geocodeAddress(
  address: string,
  poststed: string,
  postnummer: string,
): Promise<{ lat: number; lon: number } | null> {
  if (!poststed || !postnummer || postnummer.length < 4) {
    return null
  }

  const cacheKey = `${postnummer}-${poststed}`

  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!
  }

  try {
    await delay(100)

    const query = address ? `${address}, ${postnummer} ${poststed}, Norway` : `${postnummer} ${poststed}, Norway`

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&accept-language=no`,
      {
        headers: {
          "User-Agent": "frivillig-db/1.0",
        },
      },
    )

    if (!response.ok) {
      geocodeCache.set(cacheKey, null)
      return null
    }

    const data = await response.json()

    if (data && data.length > 0) {
      const latStr = data[0].lat
      const lonStr = data[0].lon

      if (latStr && lonStr && !isNaN(Number.parseFloat(latStr)) && !isNaN(Number.parseFloat(lonStr))) {
        const coords = {
          lat: Number.parseFloat(latStr),
          lon: Number.parseFloat(lonStr),
        }
        geocodeCache.set(cacheKey, coords)
        return coords
      }
    }
  } catch (error) {
    geocodeCache.set(cacheKey, null)
    return null
  }

  geocodeCache.set(cacheKey, null)
  return null
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sok = searchParams.get("sok")
  const stad = searchParams.get("stad")
  const limit = searchParams.get("limit") ? Number.parseInt(searchParams.get("limit")!) : 50

  const userLatitude = searchParams.get("userLatitude") ? Number.parseFloat(searchParams.get("userLatitude")!) : null
  const userLongitude = searchParams.get("userLongitude") ? Number.parseFloat(searchParams.get("userLongitude")!) : null

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
      forretningsadresse_postnummer,
      forretningsadresse_adresse,
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

  let scoredOrgs = (organizations || []).map((org: any) => {
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

  if (userLatitude && userLongitude) {
    console.log("[v0] Sorting by GPS proximity for user location")

    const orgsToGeocode = scoredOrgs.slice(0, 50)

    const orgsWithDistance = await Promise.all(
      orgsToGeocode.map(async (org) => {
        if (!org.forretningsadresse_poststed || !org.forretningsadresse_postnummer) {
          return { ...org, distance: Number.POSITIVE_INFINITY }
        }

        const coords = await geocodeAddress(
          org.forretningsadresse_adresse || "",
          org.forretningsadresse_poststed,
          org.forretningsadresse_postnummer,
        )

        const distance = coords
          ? calculateDistance(userLatitude, userLongitude, coords.lat, coords.lon)
          : Number.POSITIVE_INFINITY

        return { ...org, distance }
      }),
    )

    const remainingOrgs = scoredOrgs.slice(50).map((org) => ({ ...org, distance: Number.POSITIVE_INFINITY }))

    // Sort by distance first, then by score for ties
    orgsWithDistance.sort((a, b) => {
      if (a.distance !== b.distance) {
        return a.distance - b.distance
      }
      return b._score - a._score
    })

    scoredOrgs = [...orgsWithDistance, ...remainingOrgs]

    const closestWithCoords = scoredOrgs.find((org) => org.distance !== Number.POSITIVE_INFINITY)
    if (closestWithCoords) {
      console.log(
        "[v0] Closest organization:",
        closestWithCoords.navn,
        "at",
        closestWithCoords.distance?.toFixed(1),
        "km",
      )
    }
  } else {
    // Sort by score only
    scoredOrgs.sort((a, b) => b._score - a._score)
  }

  const topResults = scoredOrgs.slice(0, 5)
  const allResults = scoredOrgs.slice(0, limit)

  return NextResponse.json({
    organizations: allResults,
    topResults: topResults,
  })
}
