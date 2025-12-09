import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Organisasjon ikkje funnen - slikkepinne",
  description: "Organisasjonen du leitar etter finst ikkje",
}

export default function NotFound() {
  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center p-3">
      <div className="text-center space-y-3">
        <p className="text-xs text-white/60">fant ikkje organisasjonen</p>
        <Link
          href="/slikkepinne"
          className="inline-block text-xs underline underline-offset-2 text-white active:text-white/80 transition-colors"
        >
          tilbake
        </Link>
      </div>
    </div>
  )
}
