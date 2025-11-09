import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { EnhancedSearch } from "@/components/enhanced-search"

export default function UtforskPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Tilbake til chat
          </Link>

          <h1 className="text-4xl font-bold mb-2">Utforsk organisasjonar</h1>
          <p className="text-lg text-muted-foreground">Søk blant over 70 000 frivilligorganisasjonar i Noreg</p>
        </div>

        <EnhancedSearch />
      </div>
    </div>
  )
}
