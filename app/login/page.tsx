"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Mode = "signin" | "signup"

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialMode: Mode = searchParams?.get("mode") === "signup" ? "signup" : "signin"

  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (!email || !password) {
      setError("Skriv inn e-post og passord")
      return
    }

    setLoading(true)

    if (mode === "signin") {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError(signInError.message)
      } else {
        setMessage("Innlogginga var vellukka")
        router.push("/")
        router.refresh()
      }
    } else {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
      if (signUpError) {
        setError(signUpError.message)
      } else {
        const requiresConfirmation = !data.session
        setMessage(
          requiresConfirmation
            ? "Vi har sendt ei stadfestingslenkje til e-posten din."
            : "Kontoen din er klar.",
        )
        router.push("/")
        router.refresh()
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <CardTitle>{mode === "signin" ? "Logg inn" : "Opprett konto"}</CardTitle>
          <CardDescription>
            {mode === "signin"
              ? "Logg inn for å lagre søk og favorittar på tvers av einingar."
              : "Registrer deg for å synkronisere profilen og lagrede element."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant={mode === "signin" ? "default" : "outline"} onClick={() => setMode("signin")}>
              Logg inn
            </Button>
            <Button type="button" variant={mode === "signup" ? "default" : "outline"} onClick={() => setMode("signup")}>
              Registrer
            </Button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="email">
                E-post
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="navn@example.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="password">
                Passord
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-green-600">{message}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Arbeider..." : mode === "signin" ? "Logg inn" : "Registrer deg"}
            </Button>
          </form>

          <div className="text-sm text-muted-foreground text-center">
            <Link href="/" className="underline underline-offset-4 hover:text-foreground">
              Tilbake til forsida
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
