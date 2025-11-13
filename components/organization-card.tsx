import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { MapPin } from "lucide-react"
import type { OrganizationCardData } from "@/lib/organization-search"

interface OrganizationCardProps {
  organization: OrganizationCardData
}

export function OrganizationCard({ organization }: OrganizationCardProps) {
  return (
    <Link
      href={`/organisasjon/${organization.id}`}
      className="block transition-transform hover:scale-[1.02] active:scale-95"
    >
      <Card className="h-full hover:border-foreground/30 transition-colors cursor-pointer">
        <CardHeader>
          <CardTitle className="text-lg leading-tight">{organization.navn}</CardTitle>
          {(organization.poststed || organization.kommune) && (
            <CardDescription className="flex items-center gap-1.5 mt-2">
              <MapPin className="w-3.5 h-3.5" />
              {organization.poststed || organization.kommune}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {organization.aktivitet && (
            <p className="text-sm text-foreground/80 line-clamp-2">{organization.aktivitet}</p>
          )}
          {organization.formaal && <p className="text-sm text-muted-foreground line-clamp-2">{organization.formaal}</p>}
        </CardContent>
      </Card>
    </Link>
  )
}
