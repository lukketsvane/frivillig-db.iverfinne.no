import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Search, MapPin, Users } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-5xl font-bold text-balance">Utforsk Frivillige Organisasjonar i Norge</h1>

          <p className="text-xl text-muted-foreground text-pretty max-w-2xl mx-auto">
            Søk og oppdag tusenvis av frivillige organisasjonar registrert i Frivillighetsregisteret
          </p>

          <div className="flex gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/utforsk">
                <Search className="mr-2 h-5 w-5" />
                Utforsk Organisasjonar
              </Link>
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <Card>
              <CardContent className="pt-6 space-y-2">
                <Search className="h-10 w-10 text-primary mx-auto" />
                <h3 className="font-semibold text-lg">Søk og Filtrer</h3>
                <p className="text-sm text-muted-foreground">
                  Finn organisasjonar basert på kommune, aktivitet eller namn
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-2">
                <MapPin className="h-10 w-10 text-primary mx-auto" />
                <h3 className="font-semibold text-lg">Lokale Organisasjonar</h3>
                <p className="text-sm text-muted-foreground">Oppdag frivillige organisasjonar i ditt nærområde</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-2">
                <Users className="h-10 w-10 text-primary mx-auto" />
                <h3 className="font-semibold text-lg">Detaljert Informasjon</h3>
                <p className="text-sm text-muted-foreground">
                  Se formål, kontaktinformasjon og meir om kvar organisasjon
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
