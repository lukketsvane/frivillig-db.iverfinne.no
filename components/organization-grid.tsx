import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Activity, Target } from "lucide-react"

interface Organization {
  id: string
  navn: string
  aktivitet?: string
  vedtektsfestet_formaal?: string
  forretningsadresse_poststed?: string
  forretningsadresse_kommune?: string
  naeringskode1_beskrivelse?: string
  hjemmeside?: string
  epost?: string
  telefon?: string
}

export function OrganizationGrid({ organizations }: { organizations: Organization[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {organizations.map((org) => (
        <Link key={org.id} href={`/organisasjon/${org.id}`} className="group active:scale-95 transition-transform">
          <Card className="h-full hover:border-foreground/20 transition-all hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-lg group-hover:text-foreground/80 transition-colors line-clamp-2">
                {org.navn}
              </CardTitle>
              {(org.forretningsadresse_poststed || org.naeringskode1_beskrivelse) && (
                <CardDescription className="flex items-center gap-4 text-sm flex-wrap">
                  {org.forretningsadresse_poststed && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {org.forretningsadresse_poststed}
                    </span>
                  )}
                  {org.naeringskode1_beskrivelse && (
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      {org.naeringskode1_beskrivelse}
                    </span>
                  )}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {org.aktivitet && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    Aktivitet
                  </p>
                  <p className="text-sm leading-relaxed line-clamp-3">{org.aktivitet}</p>
                </div>
              )}
              {org.vedtektsfestet_formaal && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    Formål
                  </p>
                  <p className="text-sm leading-relaxed line-clamp-3">{org.vedtektsfestet_formaal}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
