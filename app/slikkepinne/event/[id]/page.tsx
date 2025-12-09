"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Clock,
  MapPin,
  Calendar,
  Building2,
  Share2,
  ArrowLeft,
  Phone,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { Shader, SolidColor, Pixelate, SineWave } from "shaders/react"
import Link from "next/link"
import type { SlikkepinneEvent } from "@/lib/slikkepinne/event-types"
import { TIME_SLOT_INFO } from "@/lib/slikkepinne/event-types"

export default function EventPage() {
  const params = useParams()
  const router = useRouter()
  const [event, setEvent] = useState<SlikkepinneEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState("")

  useEffect(() => {
    const fetchEvent = async () => {
      const id = params.id as string

      // Try to fetch from API first
      try {
        const res = await fetch(`/api/slikkepinne/events/${id}`)
        if (res.ok) {
          const data = await res.json()
          setEvent(data.event)
          setLoading(false)
          return
        }
      } catch (e) {
        console.log("API fetch failed, trying localStorage")
      }

      // Fallback to localStorage
      const requests = JSON.parse(localStorage.getItem("slikkepinne-requests") || "[]")
      const found = requests.find((r: any) => r.id === id)
      if (found) {
        setEvent({
          id: found.id,
          title: found.title,
          description: found.description || null,
          time_slot: found.timeSlot || found.time_slot || "flexible",
          location: found.location,
          duration: found.duration,
          event_date: found.date || found.event_date,
          lat: found.lat || null,
          lng: found.lng || null,
          organization_id: found.organization_id || null,
          organization_name: found.organization_name || null,
          created_at: found.createdAt || found.created_at,
          updated_at: null,
          status: "active",
          contact_info: found.contact_info || null,
        })
      }
      setLoading(false)
    }

    fetchEvent()
    setShareUrl(typeof window !== "undefined" ? window.location.href : "")
  }, [params.id])

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Frivillig hjelp: ${event?.title}`,
          text: `Eg treng frivillig hjelp til: ${event?.title}`,
          url: shareUrl,
        })
      } catch (e) {
        console.log("Share cancelled")
      }
    } else {
      handleCopy()
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-primary">
        <div className="animate-pulse text-white">Lastar...</div>
      </main>
    )
  }

  if (!event) {
    return (
      <main className="fixed inset-0 flex flex-col items-center justify-center bg-primary p-4">
        <h1 className="text-xl font-bold text-white mb-4">Aktivitet ikkje funnen</h1>
        <Button onClick={() => router.push("/slikkepinne")} variant="secondary">
          Tilbake
        </Button>
      </main>
    )
  }

  const timeInfo = TIME_SLOT_INFO[event.time_slot] || TIME_SLOT_INFO.flexible
  const eventDate = new Date(event.event_date).toLocaleDateString("nb-NO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <main className="fixed inset-0 flex flex-col overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10 w-full h-full">
        <Shader className="w-full h-full">
          <SolidColor color="#0F172B" maskType="alpha" />
          <Pixelate scale={15} maskType="alpha" opacity={0.84}>
            <SineWave
              color="#1ABAA4"
              amplitude={0.87}
              frequency={10.8}
              speed={-0.5}
              angle={6}
              position={{ x: 0.5, y: 0.5 }}
              thickness={0.22}
              softness={0.44}
              maskType="alpha"
            />
          </Pixelate>
        </Shader>
      </div>

      {/* Header */}
      <header className="shrink-0 px-4 pt-6 pb-4 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/slikkepinne")}
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold text-white flex-1">Aktivitet</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleShare}
          className="text-white hover:bg-white/10"
        >
          <Share2 className="h-5 w-5" />
        </Button>
      </header>

      {/* Content */}
      <div className="flex-1 min-h-0 px-4 pb-4 overflow-y-auto">
        <Card className="max-w-md mx-auto bg-white/95 backdrop-blur-sm overflow-hidden">
          {/* QR Code */}
          <div className="p-6 flex flex-col items-center border-b">
            <div className="bg-white p-4 rounded-lg shadow-inner">
              <QRCodeSVG value={shareUrl} size={180} level="H" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground text-center">
              Skann QR-koden for å sjå aktiviteten
            </p>
          </div>

          {/* Event Details */}
          <div className="p-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">{event.title}</h2>
              {event.description && (
                <p className="mt-2 text-sm text-muted-foreground">{event.description}</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <span className="font-medium">{timeInfo.icon} {timeInfo.label}</span>
                  {timeInfo.time && <span className="text-muted-foreground"> ({timeInfo.time})</span>}
                  <span className="text-muted-foreground"> · {event.duration}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-primary shrink-0" />
                <span className="capitalize">{eventDate}</span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <span>{event.location}</span>
              </div>

              {event.organization_name && (
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="h-4 w-4 text-primary shrink-0" />
                  <Link
                    href={`/slikkepinne/org/${event.organization_id}`}
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    {event.organization_name}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}

              {event.contact_info && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-primary shrink-0" />
                  <span>{event.contact_info}</span>
                </div>
              )}
            </div>

            {/* Map preview */}
            {event.lat && event.lng && (
              <div className="rounded-lg overflow-hidden border">
                <iframe
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${event.lng - 0.005},${event.lat - 0.005},${event.lng + 0.005},${event.lat + 0.005}&layer=mapnik&marker=${event.lat},${event.lng}`}
                  width="100%"
                  height="150"
                  style={{ border: 0 }}
                  title="Plassering"
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-6 pt-0 space-y-2">
            <Button onClick={handleCopy} variant="outline" className="w-full gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Kopiert!" : "Kopier lenke"}
            </Button>
            <Button onClick={handleShare} className="w-full gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <Share2 className="h-4 w-4" />
              Del aktivitet
            </Button>
          </div>
        </Card>
      </div>
    </main>
  )
}
