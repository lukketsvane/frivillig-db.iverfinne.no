import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin } from "lucide-react"
import type { Organization } from "@/lib/types"

interface OrganizationCardProps {
  organization: Organization
}

export function OrganizationCard({ organization }: OrganizationCardProps) {
  return (
    <Link href={`/organisasjon/${organization.id}`}>
      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <CardTitle className="text-balance">{organization.navn}</CardTitle>
          {organization.forretningsadresse_kommune && (
            <CardDescription className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {organization.forretningsadresse_kommune}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {organization.aktivitet && <Badge variant="secondary">{organization.aktivitet}</Badge>}
          {organization.vedtektsfestet_formaal && (
            <p className="text-sm text-muted-foreground line-clamp-3 text-pretty">
              {organization.vedtektsfestet_formaal}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
