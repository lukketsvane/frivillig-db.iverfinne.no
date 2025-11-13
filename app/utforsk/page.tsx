import { Suspense } from "react"
import { searchOrganizations, getUniqueKommuner } from "@/lib/organization-search"
import { OrganizationGrid } from "@/components/organization-grid"
import { SearchFilters } from "@/components/search-filters"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function UtforskPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const searchQuery = typeof params.search === "string" ? params.search : undefined
  const kommune = typeof params.kommune === "string" ? params.kommune : undefined
  const page = typeof params.page === "string" ? Number.parseInt(params.page) : 1

  const [{ data: organizations, total }, kommuner] = await Promise.all([
    searchOrganizations({ searchQuery, kommune }, page),
    getUniqueKommuner(),
  ])

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tilbake til chat
            </Link>
          </Button>
        </div>

        <h1 className="text-4xl font-bold mb-8">Utforsk Organisasjonar</h1>

        <Suspense fallback={<Skeleton className="h-20 w-full" />}>
          <SearchFilters kommuner={kommuner} />
        </Suspense>

        <div className="mt-8">
          <p className="text-muted-foreground mb-4">
            Viser {organizations.length} av {total} organisasjonar
          </p>
          <OrganizationGrid organizations={organizations} />
        </div>
      </div>
    </div>
  )
}
