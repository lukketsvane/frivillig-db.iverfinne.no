import { RequestWizard } from "@/components/slikkepinne/request-wizard"
import type { Metadata } from "next"

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
    <main className="min-h-screen bg-gradient-to-b from-[#d4fc79] via-[#96e6a1] to-[#d4fc79]">
      <div className="mx-auto max-w-md px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[#5a1d82] italic">FRIVILLIG HJELP</h1>
          <p className="mt-2 text-[#5a1d82]/80">Opprett en forespørsel og del QR-koden</p>
        </header>
        <RequestWizard />
      </div>
    </main>
  )
}
