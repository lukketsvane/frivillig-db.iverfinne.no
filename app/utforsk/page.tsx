import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, MapPin, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { OrganizationGrid } from "@/components/organization-grid"

export const dynamic = "force-dynamic"

interface SearchParams {
  sok?: string
  stad?: string
}

export default async function UtforskPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from("organizations")
    .select(
      `
      id,
      navn,
      aktivitet,
      vedtektsfestet_formaal,
      forretningsadresse_poststed,
      forretningsadresse_kommune,
      naeringskode1_beskrivelse,
      hjemmeside,
      epost,
      telefon
    `,
    )
    .eq("registrert_i_frivillighetsregisteret", true)
    .not("navn", "is", null)
    .order("navn")
    .limit(50)

  // Filter by search term
  if (params.sok) {
    query = query.or(
      `navn.ilike.%${params.sok}%,aktivitet.ilike.%${params.sok}%,vedtektsfestet_formaal.ilike.%${params.sok}%`,
    )
  }

  // Filter by location
  if (params.stad) {
    query = query.or(
      `forretningsadresse_poststed.ilike.%${params.stad}%,forretningsadresse_kommune.ilike.%${params.stad}%`,
    )
  }

  const { data: organizations, error } = await query

  if (error) {
    console.error("[v0] Error fetching organizations:", error)
  }

  const orgs = organizations || []

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Tilbake
          </Link>

          <h1 className="text-4xl font-bold mb-2">Utforsk</h1>
          <p className="text-lg text-muted-foreground">
            Søk blant 70 000+ organisasjonar
            {orgs.length > 0 && ` (${orgs.length} resultat)`}
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Søk</CardTitle>
            <CardDescription>Namn, aktivitet eller stad</CardDescription>
          </CardHeader>
          <CardContent>
            <form method="get" className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  name="sok"
                  defaultValue={params.sok}
                  placeholder="Organisasjon, aktivitet..."
                  className="pl-10"
                />
              </div>
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input name="stad" defaultValue={params.stad} placeholder="Stad..." className="pl-10" />
              </div>
              <Button type="submit" className="md:w-auto">
                Søk
              </Button>
            </form>
          </CardContent>
        </Card>

        {orgs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Ingen treff</p>
              <Button asChild variant="outline" className="mt-4 bg-transparent">
                <Link href="/utforsk">Nullstill</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <OrganizationGrid organizations={orgs} />
        )}
      </div>
    </div>
  )
}
