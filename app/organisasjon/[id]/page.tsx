"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { toggleFavorite, isFavorite } from "@/lib/favorites"
import { toggleBookmark, isBookmarked } from "@/lib/bookmarks"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, MapPin, Mail, Phone, Globe, Calendar, Star, Bookmark, Copy } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

function ensureHttps(url: string): string {
  if (!url) return url
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url
  }
  return `https://${url}`
}
// </CHANGE>

export default function OrganizationPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [organization, setOrganization] = useState<any>(null)
  const [isFav, setIsFav] = useState(false)
  const [isBook, setIsBook] = useState(false)
  const [copied, setCopied] = useState(false)
  const [startX, setStartX] = useState(0)
  const [currentX, setCurrentX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)

  useEffect(() => {
    async function loadOrganization() {
      try {
        const response = await fetch(`/api/organizations/${id}`)
        if (!response.ok) {
          throw new Error("Failed to fetch organization")
        }
        const org = await response.json()

        if (org) {
          setOrganization(org)
          setIsFav(isFavorite(id))
          setIsBook(isBookmarked(id))
        }
      } catch (error) {
        console.error("[v0] Error loading organization:", error)
      }
    }
    loadOrganization()
  }, [id])

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches[0].clientX < 50) {
      setStartX(e.touches[0].clientX)
      setIsSwiping(true)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return
    const diff = e.touches[0].clientX - startX
    if (diff > 0 && diff < 200) {
      setCurrentX(diff)
    }
  }

  const handleTouchEnd = () => {
    if (isSwiping && currentX > 100) {
      router.back()
    }
    setIsSwiping(false)
    setCurrentX(0)
  }

  const handleFavorite = () => {
    if (!organization) return
    const newState = toggleFavorite({
      id: organization.id,
      navn: organization.navn,
      aktivitet: organization.aktivitet,
      poststed: organization.forretningsadresse_poststed,
      kommune: organization.forretningsadresse_kommune,
      addedAt: Date.now(),
    })
    setIsFav(newState)
  }

  const handleBookmark = () => {
    if (!organization) return
    const newState = toggleBookmark({
      id: organization.id,
      navn: organization.navn,
      aktivitet: organization.aktivitet,
      poststed: organization.forretningsadresse_poststed,
      kommune: organization.forretningsadresse_kommune,
      addedAt: Date.now(),
    })
    setIsBook(newState)
  }

  const handleCopyUrl = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
        <p className="text-muted-foreground">Fann ikkje organisasjon</p>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-background transition-transform duration-300"
      style={{ transform: isSwiping ? `translateX(${currentX}px)` : "translateX(0)" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-8 animate-fadeIn">
        {/* Header with back button */}
        <div className="flex items-center justify-between gap-4">
          <Link href="/">
            <Button variant="outline" size="icon-lg" className="active:scale-95 bg-transparent">
              <ArrowLeft className="w-5 h-5" />
              <span className="sr-only">Tilbake</span>
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-lg"
              className="active:scale-95 bg-transparent"
              onClick={handleFavorite}
            >
              <Star className={`w-5 h-5 ${isFav ? "fill-yellow-500 text-yellow-500" : ""}`} />
              <span className="sr-only">Favoritt</span>
            </Button>

            <Button
              variant="outline"
              size="icon-lg"
              className="active:scale-95 bg-transparent"
              onClick={handleBookmark}
            >
              <Bookmark className={`w-5 h-5 ${isBook ? "fill-blue-500 text-blue-500" : ""}`} />
              <span className="sr-only">Bokmerke</span>
            </Button>

            <Button variant="outline" size="icon-lg" className="active:scale-95 bg-transparent" onClick={handleCopyUrl}>
              <Copy className={`w-5 h-5 ${copied ? "text-green-500" : ""}`} />
              <span className="sr-only">Kopier URL</span>
            </Button>
          </div>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold text-foreground">{organization.navn}</h1>
          {organization.organisasjonsform_beskrivelse && (
            <p className="text-sm text-muted-foreground mt-1">{organization.organisasjonsform_beskrivelse}</p>
          )}
        </div>

        {/* Main information card */}
        <Card className="p-6 space-y-6">
          {/* Purpose */}
          {organization.vedtektsfestet_formaal && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Formål</h2>
              <p className="text-foreground leading-relaxed">{organization.vedtektsfestet_formaal}</p>
            </div>
          )}

          {/* Activity */}
          {organization.aktivitet && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Aktivitet</h2>
              <p className="text-foreground leading-relaxed">{organization.aktivitet}</p>
            </div>
          )}

          {/* Contact information */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Kontaktinformasjon</h2>
            <div className="space-y-3">
              {organization.forretningsadresse_poststed && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-foreground">
                      {organization.forretningsadresse_adresse && (
                        <>
                          {organization.forretningsadresse_adresse}
                          <br />
                        </>
                      )}
                      {organization.forretningsadresse_postnummer && <>{organization.forretningsadresse_postnummer} </>}
                      {organization.forretningsadresse_poststed}
                    </p>
                    {organization.forretningsadresse_kommune && (
                      <p className="text-sm text-muted-foreground">{organization.forretningsadresse_kommune}</p>
                    )}
                  </div>
                </div>
              )}

              {organization.telefon && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground shrink-0" />
                  <a href={`tel:${organization.telefon}`} className="text-foreground hover:underline">
                    {organization.telefon}
                  </a>
                </div>
              )}

              {organization.mobiltelefon && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground shrink-0" />
                  <a href={`tel:${organization.mobiltelefon}`} className="text-foreground hover:underline">
                    {organization.mobiltelefon}
                  </a>
                </div>
              )}

              {organization.epost && (
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground shrink-0" />
                  <a href={`mailto:${organization.epost}`} className="text-foreground hover:underline">
                    {organization.epost}
                  </a>
                </div>
              )}

              {organization.hjemmeside && (
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-muted-foreground shrink-0" />
                  <a
                    href={ensureHttps(organization.hjemmeside)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:underline"
                  >
                    {organization.hjemmeside}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Additional details */}
          <div className="border-t pt-6 space-y-3">
            <h2 className="text-lg font-semibold mb-3">Detaljar</h2>

            {organization.naeringskode1_beskrivelse && (
              <div>
                <span className="text-sm text-muted-foreground">Næringskode: </span>
                <span className="text-sm text-foreground">{organization.naeringskode1_beskrivelse}</span>
              </div>
            )}

            {organization.organisasjonsnummer && (
              <div>
                <span className="text-sm text-muted-foreground">Organisasjonsnummer: </span>
                <span className="text-sm text-foreground">{organization.organisasjonsnummer}</span>
              </div>
            )}

            {organization.antall_ansatte !== null && organization.antall_ansatte !== undefined && (
              <div>
                <span className="text-sm text-muted-foreground">Antall tilsette: </span>
                <span className="text-sm text-foreground">{organization.antall_ansatte}</span>
              </div>
            )}

            {organization.registreringsdato_frivillighetsregisteret && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Registrert i frivillighetsregisteret: </span>
                <span className="text-sm text-foreground">
                  {new Date(organization.registreringsdato_frivillighetsregisteret).toLocaleDateString("nn-NO")}
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Action buttons */}
        <div className="flex gap-3">
          {organization.hjemmeside && (
            <Button asChild className="flex-1 h-11 active:scale-95">
              <a href={ensureHttps(organization.hjemmeside)} target="_blank" rel="noopener noreferrer">
                Nettside
              </a>
            </Button>
          )}
          {organization.epost && (
            <Button asChild variant="outline" className="flex-1 h-11 bg-transparent active:scale-95">
              <a href={`mailto:${organization.epost}`}>E-post</a>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
