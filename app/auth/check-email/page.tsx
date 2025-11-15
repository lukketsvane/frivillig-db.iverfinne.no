import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Mail } from 'lucide-react'

export default function CheckEmailPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 bg-gradient-to-br from-rose-50 to-teal-50 dark:from-zinc-900 dark:to-zinc-800">
      <div className="w-full max-w-md">
        <Card className="border-2">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <Mail className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Sjekk e-posten din</CardTitle>
            <CardDescription className="text-base">
              Vi har sendt deg ein e-post med ei lenke for å bekrefte kontoen din
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Klikk på lenka i e-posten for å bekrefte kontoen din. Etter det kan du logge inn og
                starte å utforske frivillige organisasjonar.
              </p>
            </div>
            <Button asChild className="w-full" size="lg">
              <Link href="/auth/login">Tilbake til innlogging</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
