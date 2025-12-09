"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { User } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export function AuthMenu() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return
      if (error) {
        setEmail(null)
      } else {
        setEmail(data.user?.email ?? null)
      }
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setEmail(session?.user?.email ?? null)
    })

    return () => {
      active = false
      data?.subscription.unsubscribe()
    }
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setEmail(null)
  }

  if (loading) {
    return (
      <div className="h-11 px-3 inline-flex items-center text-sm text-muted-foreground rounded-md border border-transparent">
        Laster…
      </div>
    )
  }

  if (email) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground max-w-[200px] truncate">
          <User className="w-4 h-4" />
          <span className="truncate">{email}</span>
        </div>
        <Button variant="outline" size="sm" className="h-11" onClick={handleSignOut}>
          Logg ut
        </Button>
      </div>
    )
  }

  return (
    <Button asChild size="sm" className="h-11">
      <Link href="/login">Logg inn</Link>
    </Button>
  )
}
