import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Organisasjon ikkje funne</h1>
        <p className="text-muted-foreground">Vi kunne ikkje finne organisasjonen du leitar etter.</p>
        <Button asChild>
          <Link href="/utforsk">Tilbake til søk</Link>
        </Button>
      </div>
    </div>
  )
}
