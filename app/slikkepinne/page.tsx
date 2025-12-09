import { RequestWizard } from "@/components/slikkepinne/request-wizard"
import type { Metadata } from "next"
import { Shader, SolidColor, Pixelate, SineWave } from "shaders/react"

export const metadata: Metadata = {
  title: "Frivillig Hjelp - Opprett forespørsel",
  description: "Opprett en forespørsel om frivillig hjelp og del QR-koden",
  openGraph: {
    title: "Frivillig Hjelp - Opprett forespørsel",
    description: "Opprett en forespørsel om frivillig hjelp og del QR-koden",
    type: "website",
  },
}

export default function SlikkepinnePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-3 gap-3 relative">
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

      <div className="mx-auto max-w-md px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white italic">FRIVILLIG HJELP</h1>
          <p className="mt-2 text-white/80">Opprett en forespørsel og del QR-koden</p>
        </header>
        <RequestWizard />
      </div>
    </main>
  )
}
