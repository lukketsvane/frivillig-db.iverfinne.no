"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, ArrowRight, Clock, MapPin, Calendar, Sparkles, Loader2, LocateFixed } from "lucide-react"

type TimeSlot = "morning" | "afternoon" | "evening" | "flexible"

const timeSlots: { id: TimeSlot; label: string; icon: string; time: string }[] = [
  { id: "morning", label: "Formiddag", icon: "🌅", time: "09:00–12:00" },
  { id: "afternoon", label: "Ettermiddag", icon: "☀️", time: "12:00–17:00" },
  { id: "evening", label: "Kveld", icon: "🌆", time: "17:00–20:00" },
  { id: "flexible", label: "Fleksibel / Varierer", icon: "🔄", time: "" },
]

function getTomorrowDate() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split("T")[0]
}

export function RequestWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationName, setLocationName] = useState("")
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    timeSlot: "" as TimeSlot | "",
    location: "",
    duration: "1 time",
    date: getTomorrowDate(),
    lat: 0,
    lng: 0,
  })

  useEffect(() => {
    // Default to Oslo center
    setUserLocation({ lat: 59.9139, lng: 10.7522 })
  }, [])

  const detectCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) return

    setIsLoadingLocation(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setUserLocation({ lat: latitude, lng: longitude })
        setFormData((prev) => ({ ...prev, lat: latitude, lng: longitude }))
        await reverseGeocode(latitude, longitude)
        setIsLoadingLocation(false)
      },
      () => {
        setIsLoadingLocation(false)
      },
    )
  }, [])

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
      const data = await res.json()
      const name =
        data.address?.suburb ||
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        data.display_name?.split(",")[0] ||
        ""
      if (name) {
        setLocationName(name)
        setFormData((prev) => ({ ...prev, location: name }))
      }
    } catch (e) {
      console.log("Could not reverse geocode")
    }
  }

  const handleMapClick = useCallback(
    async (e: React.MouseEvent<HTMLDivElement>) => {
      if (!mapRef.current || !userLocation) return

      const rect = mapRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // Calculate lat/lng from click position
      // Map bounds: 0.02 degrees total (0.01 on each side)
      const mapWidth = rect.width
      const mapHeight = rect.height
      const bbox = 0.02

      const lng = userLocation.lng - 0.01 + (x / mapWidth) * bbox
      const lat = userLocation.lat + 0.01 - (y / mapHeight) * bbox

      setUserLocation({ lat, lng })
      setFormData((prev) => ({ ...prev, lat, lng }))

      // Reverse geocode the tapped location
      setIsLoadingLocation(true)
      await reverseGeocode(lat, lng)
      setIsLoadingLocation(false)
    },
    [userLocation],
  )

  const handleAIAutofill = useCallback(async () => {
    if (!formData.title.trim()) return

    setIsGenerating(true)
    try {
      const res = await fetch("/api/slikkepinne/autofill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: formData.title, location: locationName }),
      })
      const data = await res.json()
      if (data.description) {
        setFormData((prev) => ({
          ...prev,
          description: data.description,
          title: data.title || prev.title,
        }))
      }
    } catch (e) {
      console.log("AI autofill failed")
    } finally {
      setIsGenerating(false)
    }
  }, [formData.title, locationName])

  const handleNext = () => {
    if (step < 3) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleSubmit = () => {
    const id = crypto.randomUUID().substring(0, 8)
    const requests = JSON.parse(localStorage.getItem("slikkepinne-requests") || "[]")
    const newRequest = {
      id,
      ...formData,
      createdAt: new Date().toISOString(),
    }
    requests.push(newRequest)
    localStorage.setItem("slikkepinne-requests", JSON.stringify(requests))
    router.push(`/slikkepinne/request/${id}`)
  }

  const canProceed = () => {
    if (step === 1) return formData.title.trim().length > 0
    if (step === 2) return formData.timeSlot !== ""
    if (step === 3) return formData.location.trim().length > 0
    return false
  }

  const mapUrl = userLocation
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${userLocation.lng - 0.01},${userLocation.lat - 0.01},${userLocation.lng + 0.01},${userLocation.lat + 0.01}&layer=mapnik&marker=${userLocation.lat},${userLocation.lng}`
    : null

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <div className="rounded-2xl bg-primary p-4 text-center text-primary-foreground">
        <h2 className="text-xl font-semibold">Opprett forespørsel</h2>
        <p className="text-sm opacity-90">Steg {step} av 3</p>
        <div className="mt-3 flex gap-1">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-secondary" : "bg-primary-foreground/30"}`}
            />
          ))}
        </div>
      </div>

      {/* Form content */}
      <div className="rounded-2xl bg-card p-6 shadow-lg">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Jeg trenger frivillig hjelp til...</h3>
            <div className="relative">
              <Input
                placeholder="F.eks. Hjelp med matte, handling, hagearbeid..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="border-input pr-12 text-base"
              />
              <button
                type="button"
                onClick={handleAIAutofill}
                disabled={isGenerating || !formData.title.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-primary p-1.5 text-primary-foreground transition-opacity hover:opacity-80 disabled:opacity-40"
                title="Autofyll med AI"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              </button>
            </div>
            <Textarea
              placeholder="Beskriv hva du trenger hjelp med (valgfritt)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="border-input"
            />
            {isGenerating && <p className="text-sm text-primary">Genererer beskrivelse...</p>}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Kva tid passar deg best?</h3>
            <div className="space-y-3">
              {timeSlots.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => setFormData({ ...formData, timeSlot: slot.id })}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                    formData.timeSlot === slot.id
                      ? "border-secondary bg-secondary/10"
                      : "border-input hover:border-muted-foreground"
                  }`}
                >
                  <span className="text-2xl">{slot.icon}</span>
                  <div>
                    <div className="font-medium text-foreground">{slot.label}</div>
                    {slot.time && <div className="text-sm text-muted-foreground">({slot.time})</div>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Detaljer</h3>

            {mapUrl && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Trykk på kartet for å plassere markør:</p>
                <div
                  ref={mapRef}
                  className="relative cursor-crosshair overflow-hidden rounded-xl border border-input"
                  onClick={handleMapClick}
                >
                  <iframe
                    src={mapUrl}
                    width="100%"
                    height="200"
                    style={{ border: 0, pointerEvents: "none" }}
                    title="Velg posisjon"
                  />
                  {isLoadingLocation && (
                    <div className="absolute inset-0 flex items-center justify-center bg-card/50">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={detectCurrentLocation}
                  disabled={isLoadingLocation}
                  className="w-full gap-2 border-primary bg-transparent text-primary hover:bg-primary/10"
                >
                  <LocateFixed className="h-4 w-4" />
                  Bruk min posisjon
                </Button>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
                  <MapPin className="h-4 w-4" />
                  Sted
                </label>
                <Input
                  placeholder="F.eks. Oppsal bibliotek"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="border-input"
                />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Clock className="h-4 w-4" />
                  Varighet
                </label>
                <Input
                  placeholder="F.eks. 1 time"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="border-input"
                />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Calendar className="h-4 w-4" />
                  Dato
                </label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="border-input"
                />
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex gap-3">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex-1 gap-2 border-primary bg-transparent text-primary hover:bg-primary/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Tilbake
            </Button>
          )}
          {step < 3 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex-1 gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              Neste
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed()}
              className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              Opprett forespørsel
            </Button>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-sm text-primary">
        <p className="font-medium">Oppsal Frivilligsentral · Bydel Østensjø</p>
        <p className="mt-1 text-xs opacity-70">Ei oppdaging frå Vinmonopolet i samarbeid med Frivillighet Norge</p>
      </footer>
    </div>
  )
}
