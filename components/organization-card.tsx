import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { MapPin, Globe, Mail, Phone } from "lucide-react"
import type { OrganizationCardData } from "@/lib/organization-search"

interface OrganizationCardProps {
  organization: OrganizationCardData
  showExtended?: boolean
}

export function OrganizationCard({ organization, showExtended = false }: OrganizationCardProps) {
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

          {showExtended && (
            <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2 border-t border-border/50">
              {organization.hjemmeside && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Nettside</span>
                </div>
              )}
              {organization.epost && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" />
                  <span>E-post</span>
                </div>
              )}
              {organization.telefon && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" />
                  <span>Telefon</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
