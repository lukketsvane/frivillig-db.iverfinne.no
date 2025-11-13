"use client"

import type React from "react"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { MapPin, Globe, Mail, Phone, Star } from "lucide-react"
import type { OrganizationCardData } from "@/lib/organization-search"
import { useState, useEffect } from "react"
import { toggleFavorite, isFavorite } from "@/lib/favorites"

interface OrganizationCardProps {
  organization: OrganizationCardData
  showExtended?: boolean
}

export function OrganizationCard({ organization, showExtended = false }: OrganizationCardProps) {
  const [favorite, setFavorite] = useState(false)

  useEffect(() => {
    setFavorite(isFavorite(organization.id))
  }, [organization.id])

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const newState = toggleFavorite({
      id: organization.id,
      navn: organization.navn,
      aktivitet: organization.aktivitet,
      poststed: organization.poststed,
      kommune: organization.kommune,
      addedAt: Date.now(),
    })
    setFavorite(newState)
  }

  return (
    <Link
      href={`/organisasjon/${organization.id}`}
      className="block transition-transform hover:scale-[1.02] active:scale-95"
    >
      <Card className="h-full hover:border-foreground/30 transition-colors cursor-pointer relative">
        <button
          onClick={handleFavoriteClick}
          className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-accent transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label={favorite ? "Fjern frå favoritter" : "Legg til favoritter"}
        >
          <Star className={`w-5 h-5 ${favorite ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`} />
        </button>

        <CardHeader className="pr-16">
          <CardTitle className="text-lg leading-tight">{organization.navn}</CardTitle>
          {(organization.poststed || organization.kommune) && (
            <CardDescription className="flex items-center gap-1.5 mt-2">
              <MapPin className="w-3.5 h-3.5" />
              {organization.poststed || organization.kommune}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {organization.aktivitet && (
            <p className="text-sm text-foreground/80 line-clamp-2">{organization.aktivitet}</p>
          )}
          {organization.formaal && <p className="text-sm text-muted-foreground line-clamp-2">{organization.formaal}</p>}

          {showExtended && (
            <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2 border-t border-border/50">
              {organization.hjemmeside && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Nettside</span>
                </div>
              )}
              {organization.epost && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" />
                  <span>E-post</span>
                </div>
              )}
              {organization.telefon && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" />
                  <span>Telefon</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
