import { NextResponse } from "next/server"
import { searchOrganizationsJSON, loadAllOrganizations } from "@/lib/json-search"

export const dynamic = "force-dynamic"

/**
 * Test-route for å verifisere at JSON-søket fungerer
 *
 * Test queries:
 * - /api/test-json-search?query=idrett
 * - /api/test-json-search?query=bergen
 * - /api/test-json-search?stats=true
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get("query")
  const showStats = searchParams.get("stats") === "true"

  try {
    if (showStats) {
      // Vis statistikk om databasen
      const allOrgs = await loadAllOrganizations()
      const orgsWithOrgnr = allOrgs.filter((org) => org.organisasjonsnummer)

      return NextResponse.json({
        success: true,
        stats: {
          totalOrganizations: allOrgs.length,
          withOrganisasjonsnummer: orgsWithOrgnr.length,
          withoutOrganisasjonsnummer: allOrgs.length - orgsWithOrgnr.length,
          sampleOrganization: orgsWithOrgnr[0]
            ? {
                navn: orgsWithOrgnr[0].navn,
                organisasjonsnummer: orgsWithOrgnr[0].organisasjonsnummer,
                url: `https://frivillig-db.iverfinne.no/organisasjon/${orgsWithOrgnr[0].organisasjonsnummer}`,
              }
            : null,
        },
      })
    }

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing query parameter. Try: ?query=idrett or ?stats=true",
        },
        { status: 400 },
      )
    }

    // Søk i JSON-databasen
    const results = await searchOrganizationsJSON({
      query,
      limit: 10,
    })

    return NextResponse.json({
      success: true,
      query,
      count: results.length,
      results: results.map((org) => ({
        navn: org.navn,
        organisasjonsnummer: org.organisasjonsnummer,
        url: `https://frivillig-db.iverfinne.no/organisasjon/${org.organisasjonsnummer}`,
        aktivitet: org.aktivitet?.substring(0, 100) + "...",
        poststed: org.forretningsadresse_poststed,
      })),
    })
  } catch (error) {
    console.error("[Test JSON Search] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
