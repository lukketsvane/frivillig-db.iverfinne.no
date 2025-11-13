import { getOrganizationById } from "@/lib/organization-search"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, MapPin, Mail, Phone, Globe, Calendar } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

interface OrganizationPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function OrganizationPage({ params }: OrganizationPageProps) {
  const { id } = await params

  console.log("[v0] Loading organization with ID:", id)

  const organization = await getOrganizationById(id)

  console.log("[v0] Organization found:", organization ? "yes" : "no")

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

        {/* Main information card */}
        <Card className="p-6 space-y-6">
          {/* Purpose */}
          {organization.vedtektsfestet_formaal && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Formål</h2>
              <p className="text-foreground leading-relaxed">{organization.vedtektsfestet_formaal}</p>
            </div>
          )}

          {/* Activity */}
          {organization.aktivitet && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Aktivitet</h2>
              <p className="text-foreground leading-relaxed">{organization.aktivitet}</p>
            </div>
          )}

          {/* Contact information */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Kontaktinformasjon</h2>
            <div className="space-y-3">
              {organization.forretningsadresse_poststed && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-foreground">
                      {organization.forretningsadresse_adresse &&
                        organization.forretningsadresse_adresse.length > 0 && (
                          <>
                            {organization.forretningsadresse_adresse.join(", ")}
                            <br />
                          </>
                        )}
                      {organization.forretningsadresse_postnummer && <>{organization.forretningsadresse_postnummer} </>}
                      {organization.forretningsadresse_poststed}
                    </p>
                    {organization.forretningsadresse_kommune && (
                      <p className="text-sm text-muted-foreground">{organization.forretningsadresse_kommune}</p>
                    )}
                  </div>
                </div>
              )}

              {organization.telefon && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground shrink-0" />
                  <a href={`tel:${organization.telefon}`} className="text-foreground hover:underline">
                    {organization.telefon}
                  </a>
                </div>
              )}

              {organization.mobiltelefon && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground shrink-0" />
                  <a href={`tel:${organization.mobiltelefon}`} className="text-foreground hover:underline">
                    {organization.mobiltelefon}
                  </a>
                </div>
              )}

              {organization.epost && (
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground shrink-0" />
                  <a href={`mailto:${organization.epost}`} className="text-foreground hover:underline">
                    {organization.epost}
                  </a>
                </div>
              )}

              {organization.hjemmeside && (
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-muted-foreground shrink-0" />
                  <a
                    href={organization.hjemmeside}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:underline"
                  >
                    {organization.hjemmeside}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Additional details */}
          <div className="border-t pt-6 space-y-3">
            <h2 className="text-lg font-semibold mb-3">Detaljar</h2>

            {organization.naeringskode1_beskrivelse && (
              <div>
                <span className="text-sm text-muted-foreground">Næringskode: </span>
                <span className="text-sm text-foreground">{organization.naeringskode1_beskrivelse}</span>
              </div>
            )}

            {organization.organisasjonsnummer && (
              <div>
                <span className="text-sm text-muted-foreground">Organisasjonsnummer: </span>
                <span className="text-sm text-foreground">{organization.organisasjonsnummer}</span>
              </div>
            )}

            {organization.antall_ansatte !== null && organization.antall_ansatte !== undefined && (
              <div>
                <span className="text-sm text-muted-foreground">Antall tilsette: </span>
                <span className="text-sm text-foreground">{organization.antall_ansatte}</span>
              </div>
            )}

            {organization.registreringsdato_frivillighetsregisteret && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Registrert i frivillighetsregisteret: </span>
                <span className="text-sm text-foreground">
                  {new Date(organization.registreringsdato_frivillighetsregisteret).toLocaleDateString("nn-NO")}
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Action buttons */}
        <div className="flex gap-3">
          {organization.hjemmeside && (
            <Button asChild className="flex-1">
              <a href={organization.hjemmeside} target="_blank" rel="noopener noreferrer">
                <Globe className="w-4 h-4 mr-2" />
                Besøk nettside
              </a>
            </Button>
          )}
          {organization.epost && (
            <Button asChild variant="outline" className="flex-1 bg-transparent">
              <a href={`mailto:${organization.epost}`}>
                <Mail className="w-4 h-4 mr-2" />
                Send e-post
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
