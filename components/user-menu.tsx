"use client"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { User, LogIn, Loader2 } from "lucide-react"
import Link from "next/link"

export function UserMenu() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <Button variant="outline" size="icon-lg" className="bg-transparent" disabled>
        <Loader2 className="w-5 h-5 animate-spin" />
      </Button>
    )
  }

  if (user) {
    return (
      <Button
        variant="outline"
        size="icon-lg"
        asChild
        className="bg-transparent active:scale-95"
        title="Min profil"
      >
        <Link href="/profile">
          <User className="w-5 h-5" />
          <span className="sr-only">Min profil</span>
        </Link>
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="icon-lg"
      asChild
      className="bg-transparent active:scale-95"
      title="Logg inn"
    >
      <Link href="/login">
        <LogIn className="w-5 h-5" />
        <span className="sr-only">Logg inn</span>
      </Link>
    </Button>
  )
}
