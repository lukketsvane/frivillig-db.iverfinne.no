import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-semibold text-foreground">Organisasjon ikkje funne</h1>
        <p className="text-muted-foreground">Vi kunne ikkje finne organisasjonen du leitar etter.</p>
        <Link href="/">
          <Button>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tilbake til søk
          </Button>
        </Link>
      </div>
    </div>
  )
}
