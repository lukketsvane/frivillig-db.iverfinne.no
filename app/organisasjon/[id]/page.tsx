import { notFound } from "next/navigation"
import { getOrganizationById } from "@/lib/organization-search"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Mail, Phone, Globe, Calendar, Users } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const organization = await getOrganizationById(id)

  if (!organization) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button variant="outline" asChild className="mb-6 bg-transparent">
          <Link href="/utforsk">← Tilbake til søk</Link>
        </Button>

        <div className="max-w-4xl">
          <h1 className="text-4xl font-bold mb-2 text-balance">{organization.navn}</h1>

          {organization.forretningsadresse_kommune && (
            <p className="text-lg text-muted-foreground flex items-center gap-2 mb-6">
              <MapPin className="h-5 w-5" />
              {organization.forretningsadresse_kommune}
              {organization.forretningsadresse_poststed && `, ${organization.forretningsadresse_poststed}`}
            </p>
          )}

          <div className="grid gap-6">
            {organization.aktivitet && (
              <Card>
                <CardHeader>
                  <CardTitle>Aktivitet</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary" className="text-base">
                    {organization.aktivitet}
                  </Badge>
                </CardContent>
              </Card>
            )}

            {organization.vedtektsfestet_formaal && (
              <Card>
                <CardHeader>
                  <CardTitle>Vedtektsfestet Formål</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-pretty leading-relaxed">{organization.vedtektsfestet_formaal}</p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Kontaktinformasjon</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {organization.epost && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <a href={`mailto:${organization.epost}`} className="text-blue-600 hover:underline">
                      {organization.epost}
                    </a>
                  </div>
                )}
                {organization.telefon && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <a href={`tel:${organization.telefon}`} className="text-blue-600 hover:underline">
                      {organization.telefon}
                    </a>
                  </div>
                )}
                {organization.hjemmeside && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <a
                      href={organization.hjemmeside}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {organization.hjemmeside}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Organisasjonsinformasjon</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {organization.organisasjonsform_beskrivelse && (
                  <div className="flex items-start gap-2">
                    <span className="font-medium min-w-[140px]">Organisasjonsform:</span>
                    <span>{organization.organisasjonsform_beskrivelse}</span>
                  </div>
                )}
                {organization.naeringskode1_beskrivelse && (
                  <div className="flex items-start gap-2">
                    <span className="font-medium min-w-[140px]">Næringskode:</span>
                    <span>{organization.naeringskode1_beskrivelse}</span>
                  </div>
                )}
                {organization.registreringsdato_frivillighetsregisteret && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Registrert:</span>
                    <span>
                      {new Date(organization.registreringsdato_frivillighetsregisteret).toLocaleDateString("no-NO")}
                    </span>
                  </div>
                )}
                {organization.antall_ansatte && (
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Ansatte:</span>
                    <span>{organization.antall_ansatte}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
