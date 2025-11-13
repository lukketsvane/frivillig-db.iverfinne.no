"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, MapPin, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { OrganizationCard } from "@/components/organization-card"

interface Organization {
  id: string
  navn: string
  aktivitet: string
  vedtektsfestet_formaal: string
  forretningsadresse_poststed: string
  forretningsadresse_kommune: string
  naeringskode1_beskrivelse: string
  hjemmeside: string
  epost: string
  telefon: string
  _score?: number
}

export default function UtforskPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [locationQuery, setLocationQuery] = useState("")
  const [topResults, setTopResults] = useState<Organization[]>([])
  const [allResults, setAllResults] = useState<Organization[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    const storedLocation = localStorage.getItem("userLocation")
    if (storedLocation) {
      try {
        const location = JSON.parse(storedLocation)
        if (location.kommune || location.fylke) {
          const locationStr = location.kommune || location.fylke
          setLocationQuery(locationStr)
          // Auto-fetch organizations for this location
          fetchOrganizations(undefined, locationStr, location)
        }
      } catch (error) {
        console.error("[v0] Error parsing stored location:", error)
      }
    }
  }, [])

  const fetchOrganizations = useCallback(async (sok?: string, stad?: string, location?: any) => {
    if (!sok && !stad) {
      setHasSearched(false)
      setTopResults([])
      setAllResults([])
      return
    }

    setHasSearched(true)

    const params = new URLSearchParams()
    if (sok) params.append("sok", sok)
    if (stad) params.append("stad", stad)

    if (location?.latitude && location?.longitude) {
      params.append("userLatitude", location.latitude.toString())
      params.append("userLongitude", location.longitude.toString())
    }

    try {
      const response = await fetch(`/api/organizations?${params.toString()}`)
      const data = await response.json()
      setTopResults(data.topResults || [])
      setAllResults(data.organizations || [])
    } catch (error) {
      console.error("[v0] Error fetching organizations:", error)
      setTopResults([])
      setAllResults([])
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      const storedLocation = localStorage.getItem("userLocation")
      let location = null
      if (storedLocation) {
        try {
          location = JSON.parse(storedLocation)
        } catch (e) {
          console.error("[v0] Error parsing location:", e)
        }
      }
      fetchOrganizations(searchQuery || undefined, locationQuery || undefined, location)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, locationQuery, fetchOrganizations])

  return (
    <div className="min-h-screen pb-safe">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground active:opacity-70 transition-all mb-4 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Tilbake
          </Link>
        </div>

        <div className="mb-8">
          <div className="relative mb-3">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Søk etter organisasjon eller aktivitet..."
              className="pl-12 h-14 text-base rounded-xl border-2"
              autoFocus
            />
          </div>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              placeholder="Stad eller kommune..."
              className="pl-12 h-14 text-base rounded-xl border-2"
            />
          </div>
        </div>

        {hasSearched && topResults.length > 0 && (
          <div className="space-y-3 mb-6">
            {topResults.map((org) => (
              <OrganizationCard key={org.id} organization={org} showExtended />
            ))}
          </div>
        )}

        {hasSearched && allResults.length > topResults.length && (
          <>
            <div className="border-t border-border my-6" />
            <div className="space-y-3">
              {allResults.slice(topResults.length).map((org) => (
                <OrganizationCard key={org.id} organization={org} />
              ))}
            </div>
          </>
        )}

        {!hasSearched && (
          <Card className="border-2">
            <CardContent className="py-12 text-center">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">Søk etter frivilligorganisasjonar</p>
              <p className="text-sm text-muted-foreground">Skriv inn aktivitet, interesser eller stad for å starte</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
