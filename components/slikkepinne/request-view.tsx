"use client"

import { useEffect, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { Clock, MapPin, Calendar, ArrowLeft, Share2, Check } from "lucide-react"
import Link from "next/link"

interface Request {
  id: string
  title: string
  description: string
  timeSlot: string
  location: string
  duration: string
  date: string
  createdAt: string
}

const timeSlotLabels: Record<string, string> = {
  morning: "Formiddag (09:00–12:00)",
  afternoon: "Ettermiddag (12:00–17:00)",
  evening: "Kveld (17:00–20:00)",
  flexible: "Fleksibel",
}

export function RequestView({ id }: { id: string }) {
  const [request, setRequest] = useState<Request | null>(null)
  const [copied, setCopied] = useState(false)
  const [url, setUrl] = useState("")

  useEffect(() => {
    const requests = JSON.parse(localStorage.getItem("slikkepinne-requests") || "[]")
    const found = requests.find((r: Request) => r.id === id)
    setRequest(found || null)
    setUrl(window.location.href)
  }, [id])

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: request?.title,
          url: url,
        })
      } else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (error) {
      // Fallback to clipboard if share fails (permission denied, user cancelled, etc.)
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // Final fallback: show URL in alert
        alert(`Kopier denne lenken:\n${url}`)
      }
    }
  }

  if (!request) {
    return (
      <div className="rounded-2xl bg-card p-8 text-center shadow-lg">
        <p className="text-muted-foreground">Forespørselen ble ikke funnet.</p>
        <Link href="/slikkepinne">
          <Button className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90">Tilbake til forsiden</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold italic text-primary">FRIVILLIG HJELP</h1>
        <p className="mt-1 text-primary/80">Forespørsel</p>
      </div>

      {/* Request card */}
      <div className="rounded-2xl bg-card p-6 shadow-lg">
        <h2 className="text-xl font-bold text-card-foreground">{request.title}</h2>
        {request.description && <p className="mt-2 text-muted-foreground">{request.description}</p>}

        <div className="mt-6 space-y-3 rounded-xl bg-muted p-4">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 text-accent" />
            <div>
              <div className="text-sm font-medium text-muted-foreground">Tid:</div>
              <div className="text-card-foreground">{timeSlotLabels[request.timeSlot] || request.timeSlot}</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 text-accent" />
            <div>
              <div className="text-sm font-medium text-muted-foreground">Sted:</div>
              <div className="text-card-foreground">{request.location}</div>
            </div>
          </div>
          {request.duration && (
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 text-accent" />
              <div>
                <div className="text-sm font-medium text-muted-foreground">Varighet:</div>
                <div className="text-card-foreground">{request.duration}</div>
              </div>
            </div>
          )}
          {request.date && (
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-5 w-5 text-accent" />
              <div>
                <div className="text-sm font-medium text-muted-foreground">Dato:</div>
                <div className="text-card-foreground">
                  {new Date(request.date).toLocaleDateString("nb-NO", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CTA Button */}
        <Button className="mt-6 w-full bg-accent py-6 text-lg font-semibold text-accent-foreground hover:bg-accent/90">
          MELD DEG PÅ
        </Button>
      </div>

      {/* QR Code section */}
      <div className="rounded-2xl bg-card p-6 shadow-lg">
        <h3 className="mb-4 text-center text-lg font-semibold text-card-foreground">Del denne forespørselen</h3>
        <div className="flex justify-center">
          <div className="rounded-xl bg-card p-4 shadow-inner" role="img" aria-label={`QR-kode for å dele forespørsel: ${request.title}`}>
            <QRCodeSVG value={url} size={180} bgColor="var(--card)" fgColor="var(--primary)" level="M" />
          </div>
        </div>
        <Button variant="outline" onClick={handleShare} className="mt-4 w-full gap-2 bg-transparent">
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Kopiert!
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4" />
              Del lenke
            </>
          )}
        </Button>
      </div>

      {/* Back link */}
      <Link href="/slikkepinne" className="block">
        <Button variant="ghost" className="w-full gap-2 text-primary">
          <ArrowLeft className="h-4 w-4" />
          Opprett ny forespørsel
        </Button>
      </Link>

      {/* Footer */}
      <footer className="text-center text-sm text-primary/70">
        <p>Oppsal Frivilligsentral · Bydel Østensjø</p>
      </footer>
    </div>
  )
}
