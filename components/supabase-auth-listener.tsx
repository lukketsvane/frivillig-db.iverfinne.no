"use client"

import { useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function SupabaseAuthListener() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        await fetch("/auth/callback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ event, session }),
        })

        router.refresh()
      } catch (error) {
        console.error("[auth] Failed to sync Supabase session", error)
      }
    })

    return () => {
      data?.subscription.unsubscribe()
    }
  }, [supabase, router])

  return null
}
