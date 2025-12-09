import { SearchInterface } from "@/components/slikkepinne/search-interface"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "slikkepinne - søk organisasjonar",
  description:
    "Søk blant tusenvis av frivillige organisasjonar i Norge. Finn organisasjonar basert på lokasjon, interesser og aktivitet.",
  openGraph: {
    title: "slikkepinne - søk organisasjonar",
    description: "Søk blant tusenvis av frivillige organisasjonar i Norge",
    type: "website",
  },
}

export default function SlikkepinnePage() {
  return <SearchInterface />
}
