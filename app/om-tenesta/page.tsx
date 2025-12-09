"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { Shader, SolidColor, Pixelate, SineWave } from "shaders/react"

export default function OmTenestaPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-3 gap-3 relative">
      <div className="fixed inset-0 -z-10 w-full h-full">
        <Shader className="w-full h-full">
          <SolidColor color="#27085E" maskType="alpha" />
          <Pixelate scale={15} maskType="alpha" opacity={0.84}>
            <SineWave
              color="#EDF455"
              amplitude={0.87}
              frequency={10.8}
              speed={-0.5}
              angle={6}
              position={{ x: 0.5, y: 0.5 }}
              thickness={0.22}
              softness={0.44}
              maskType="alpha"
            />
          </Pixelate>
        </Shader>
      </div>

      <Card className="w-full max-w-3xl p-8 shadow-lg">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground active:opacity-70 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Tilbake
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-6">Om tenesta</h1>

        <div className="prose prose-lg max-w-none space-y-4 text-foreground">
          <div className="space-y-4">
            <p className="text-base leading-relaxed">
              <strong>1.</strong> Ein QR-kode på slikkepinnen (Vinmonopolets "Kjærlighet på pinne" visleg kampanje) leier direkte til frivillig.iverfinne.no – ein enkel webapp der kven som helst kan opprette ei førespursel om frivillig hjelp.
            </p>

            <p className="text-base leading-relaxed">
              <strong>2.</strong> Prosessen tek under eitt minutt: Skriv kva du treng hjelp til → vel stad, tid og dato → få ein delbar QR-kode og lenke.
            </p>

            <p className="text-base leading-relaxed">
              <strong>3.</strong> Piggy-backing-mekanismen: Me rir på eksisterande infrastruktur (Vinmonopolet sine 350 butikkar) for å nå folk i kvardagen – ikkje gjennom kampanjar, men gjennom tilfeldig oppdaging.
            </p>

            <p className="text-base leading-relaxed">
              <strong>4.</strong> Unge vaksne (18-30) kan bruke plattforma som eit kreativt verktøy – opprette annonsar for frivilligsentralen, formulere engasjerande tekstar, og slik bidra med kompetansen sin utan å forplikte seg til langsiktig frivillighet.
            </p>

            <p className="text-base leading-relaxed">
              <strong>5.</strong> Eksempelet "Bli med å lage pannekaker med bestemor" viser korleis konkret, relasjonell formulering appellerer til 50-65-åringar – ikkje abstrakt "bli frivillig", men dette mennesket treng deg.
            </p>

            <p className="text-base leading-relaxed">
              <strong>6.</strong> QR-koden som vert generert kan printast, delast på sosiale medium, eller hengast opp lokalt – kvar førespursel blir sin eigen mini-kampanje.
            </p>

            <p className="text-base leading-relaxed">
              <strong>7.</strong> Oppsal Frivilligsentral og Bydel Østensjø står som avsendarar – dette gir legitimitet og lokal forankring utan at sentralen treng administrere kvar enkelt annonse.
            </p>

            <p className="text-base leading-relaxed">
              <strong>8.</strong> Plattforma inverterer rekrutteringslogikken: I staden for at sentralen leitar etter frivillige, kjem behovet til den frivillige gjennom ein konkret, stadlokalisert førespursel.
            </p>

            <p className="text-base leading-relaxed">
              <strong>9.</strong> Koplinga til visleg.no som overordna plattform gjer det mogleg å aggregere data på tvers av sentralar – kva type førespurnader konverterer, kor lang tid tek det, kva formuleringar fungerer.
            </p>

            <p className="text-base leading-relaxed">
              <strong>10.</strong> Sluttresultatet: Ein distribuert rekrutteringsinfrastruktur der unge skapar innhald, eksisterande nettverk (Vinmonopolet, bibliotek, butikkar) distribuerer, og 50-65-åringar oppdagar moglegheiter der dei allereie er.
            </p>
          </div>

          <div className="flex gap-3 pt-6">
            <Button asChild className="active:scale-95">
              <Link href="/slikkepinne">Opprett førespursel</Link>
            </Button>
            <Button variant="outline" asChild className="active:scale-95">
              <Link href="/">Utforsk organisasjonar</Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
