import { getOrganizationByName } from "@/lib/organization-search"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { createStaticClient } from "@/lib/supabase/static"

interface OrganizationPageProps {
  params: Promise<{
    slug: string
  }>
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

export async function generateStaticParams() {
  const supabase = createStaticClient()

  console.log("[v0] Starting to fetch organizations for slug generation...")

  const allOrganizations: any[] = []
  let offset = 0
  const batchSize = 10000

  while (true) {
    const { data: batch, error } = await supabase
      .from("organizations_with_fylke")
      .select("navn")
      .range(offset, offset + batchSize - 1)

    if (error) {
      console.error(`[v0] Error fetching batch at offset ${offset}:`, error)
      break
    }

    if (!batch || batch.length === 0) {
      break
    }

    allOrganizations.push(...batch)
    console.log(`[v0] Fetched batch: ${batch.length} organizations (total: ${allOrganizations.length})`)

    if (batch.length < batchSize) {
      break
    }

    offset += batchSize
  }

  console.log(`[v0] Total organizations for static generation: ${allOrganizations.length}`)

  return allOrganizations.map((org) => ({
    slug: generateSlug(org.navn),
  }))
}

export const dynamic = "force-static"
export const dynamicParams = false
export const revalidate = 86400

export default async function OrganizationPage({ params }: OrganizationPageProps) {
  const { slug } = await params
  const organization = await getOrganizationByName(slug)

  if (!organization) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
              <span className="sr-only">Tilbake</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold text-foreground">{organization.navn}</h1>
            {organization.organisasjonsform_beskrivelse && (
              <p className="text-sm text-muted-foreground mt-1">{organization.organisasjonsform_beskrivelse}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
