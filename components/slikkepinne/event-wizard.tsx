"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  MapPin,
  Calendar,
  Sparkles,
  Loader2,
  LocateFixed,
  Building2,
  Check,
  Search,
  X,
} from "lucide-react"
import type { TimeSlot, CreateEventInput } from "@/lib/slikkepinne/event-types"
import { TIME_SLOT_INFO } from "@/lib/slikkepinne/event-types"

interface OrganizationOption {
  id: string
  navn: string
  aktivitet: string | null
  forretningsadresse_poststed: string | null
}

function getTomorrowDate() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split("T")[0]
}

export function EventWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationName, setLocationName] = useState("")
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Organization search
  const [orgSearch, setOrgSearch] = useState("")
  const [orgResults, setOrgResults] = useState<OrganizationOption[]>([])
  const [isSearchingOrgs, setIsSearchingOrgs] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState<OrganizationOption | null>(null)

  const [formData, setFormData] = useState<CreateEventInput>({
    title: "",
    description: "",
    time_slot: "flexible",
    location: "",
    duration: "1 time",
    event_date: getTomorrowDate(),
    lat: undefined,
    lng: undefined,
    organization_id: undefined,
    organization_name: undefined,
    contact_info: "",
  })

  useEffect(() => {
    // Default to Oslo center
    setUserLocation({ lat: 59.9139, lng: 10.7522 })
  }, [])

  // Organization search with debounce
  useEffect(() => {
    if (orgSearch.length < 2) {
      setOrgResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearchingOrgs(true)
      try {
        const res = await fetch(`/api/organizations?q=${encodeURIComponent(orgSearch)}&limit=5`)
        const data = await res.json()
        if (data.organizations) {
          setOrgResults(data.organizations)
        }
      } catch (e) {
        console.error("Organization search failed:", e)
      } finally {
        setIsSearchingOrgs(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [orgSearch])

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

      const mapWidth = rect.width
      const mapHeight = rect.height
      const bbox = 0.02

      const lng = userLocation.lng - 0.01 + (x / mapWidth) * bbox
      const lat = userLocation.lat + 0.01 - (y / mapHeight) * bbox

      setUserLocation({ lat, lng })
      setFormData((prev) => ({ ...prev, lat, lng }))

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

  const handleSelectOrg = (org: OrganizationOption) => {
    setSelectedOrg(org)
    setFormData((prev) => ({
      ...prev,
      organization_id: org.id,
      organization_name: org.navn,
    }))
    setOrgSearch("")
    setOrgResults([])
  }

  const handleClearOrg = () => {
    setSelectedOrg(null)
    setFormData((prev) => ({
      ...prev,
      organization_id: undefined,
      organization_name: undefined,
    }))
  }

  const handleNext = () => {
    if (step < 4) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleSubmit = async () => {
    setIsSaving(true)
    try {
      const res = await fetch("/api/slikkepinne/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        throw new Error("Failed to create event")
      }

      const data = await res.json()
      router.push(`/slikkepinne/event/${data.event.id}`)
    } catch (e) {
      console.error("Failed to create event:", e)
      // Fallback to localStorage
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
    } finally {
      setIsSaving(false)
    }
  }

  const canProceed = () => {
    if (step === 1) return formData.title.trim().length > 0
    if (step === 2) return formData.time_slot !== ""
    if (step === 3) return formData.location.trim().length > 0
    if (step === 4) return true
    return false
  }

  const mapUrl = userLocation
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${userLocation.lng - 0.01},${userLocation.lat - 0.01},${userLocation.lng + 0.01},${userLocation.lat + 0.01}&layer=mapnik&marker=${userLocation.lat},${userLocation.lng}`
    : null

  const timeSlots = Object.entries(TIME_SLOT_INFO) as [TimeSlot, typeof TIME_SLOT_INFO[TimeSlot]][]

  return (
    <div className="h-full flex flex-col">
      {/* Progress header - matches main page card header */}
      <div className="shrink-0 px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Steg {step} av 4</span>
          <span className="text-xs text-muted-foreground">
            {step === 1 && "Aktivitet"}
            {step === 2 && "Tid"}
            {step === 3 && "Stad"}
            {step === 4 && "Organisasjon"}
          </span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-accent" : "bg-border"}`}
            />
          ))}
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-foreground">Kva treng du hjelp til?</h3>
              <div className="relative">
                <Input
                  ref={inputRef}
                  placeholder="F.eks. Hjelp med matte, handling, hagearbeid..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="border-border pr-12 text-base bg-white"
                  autoFocus
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
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="border-border bg-white resize-none"
              />
              {isGenerating && <p className="text-sm text-primary">Genererer beskrivelse...</p>}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-foreground">Kva tid passar best?</h3>
              <div className="space-y-2">
                {timeSlots.map(([id, slot]) => (
                  <button
                    key={id}
                    onClick={() => setFormData({ ...formData, time_slot: id })}
                    className={`flex w-full items-center gap-3 rounded-lg border-2 p-3 text-left transition-all ${
                      formData.time_slot === id
                        ? "border-secondary bg-secondary/10"
                        : "border-border hover:border-muted-foreground bg-white"
                    }`}
                  >
                    <span className="text-xl">{slot.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium text-foreground text-sm">{slot.label}</div>
                      {slot.time && <div className="text-xs text-muted-foreground">{slot.time}</div>}
                    </div>
                    {formData.time_slot === id && <Check className="h-5 w-5 text-secondary" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-foreground">Stad og tid</h3>

              {mapUrl && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Trykk på kartet for å velje stad:</p>
                  <div
                    ref={mapRef}
                    className="relative cursor-crosshair overflow-hidden rounded-lg border border-border"
                    onClick={handleMapClick}
                  >
                    <iframe
                      src={mapUrl}
                      width="100%"
                      height="150"
                      style={{ border: 0, pointerEvents: "none" }}
                      title="Velg posisjon"
                    />
                    {isLoadingLocation && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/50">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={detectCurrentLocation}
                    disabled={isLoadingLocation}
                    className="w-full gap-2 text-xs"
                  >
                    <LocateFixed className="h-3 w-3" />
                    Bruk min posisjon
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <MapPin className="h-3 w-3" />
                    Stad
                  </label>
                  <Input
                    placeholder="F.eks. Oppsal bibliotek"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="border-border bg-white text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <Clock className="h-3 w-3" />
                      Varigheit
                    </label>
                    <Input
                      placeholder="F.eks. 1 time"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      className="border-border bg-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <Calendar className="h-3 w-3" />
                      Dato
                    </label>
                    <Input
                      type="date"
                      value={formData.event_date}
                      onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                      className="border-border bg-white text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-foreground">Knytt til organisasjon (valfritt)</h3>
              <p className="text-xs text-muted-foreground">
                Legg til ein organisasjon for å gjere det enklare å finne frivillige.
              </p>

              {selectedOrg ? (
                <div className="flex items-center gap-3 p-3 bg-secondary/10 border-2 border-secondary rounded-lg">
                  <Building2 className="h-5 w-5 text-secondary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{selectedOrg.navn}</div>
                    {selectedOrg.forretningsadresse_poststed && (
                      <div className="text-xs text-muted-foreground">{selectedOrg.forretningsadresse_poststed}</div>
                    )}
                  </div>
                  <button
                    onClick={handleClearOrg}
                    className="p-1 hover:bg-white/50 rounded"
                    title="Fjern organisasjon"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Søk etter organisasjon..."
                      value={orgSearch}
                      onChange={(e) => setOrgSearch(e.target.value)}
                      className="pl-9 border-border bg-white text-sm"
                    />
                    {isSearchingOrgs && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>

                  {orgResults.length > 0 && (
                    <div className="border border-border rounded-lg bg-white overflow-hidden">
                      {orgResults.map((org) => (
                        <button
                          key={org.id}
                          onClick={() => handleSelectOrg(org)}
                          className="w-full p-3 text-left hover:bg-muted/50 border-b border-border last:border-b-0 transition-colors"
                        >
                          <div className="font-medium text-sm">{org.navn}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {org.aktivitet || org.forretningsadresse_poststed || "Frivillig organisasjon"}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-foreground">
                  Kontaktinformasjon (valfritt)
                </label>
                <Input
                  placeholder="Telefon eller e-post"
                  value={formData.contact_info || ""}
                  onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
                  className="border-border bg-white text-sm"
                />
              </div>

              {/* Summary */}
              <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                <h4 className="font-medium text-sm">Oppsummering</h4>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <p><strong>Aktivitet:</strong> {formData.title}</p>
                  <p><strong>Tid:</strong> {TIME_SLOT_INFO[formData.time_slot].label}</p>
                  <p><strong>Stad:</strong> {formData.location}</p>
                  <p><strong>Dato:</strong> {new Date(formData.event_date).toLocaleDateString("nb-NO")}</p>
                  {selectedOrg && <p><strong>Organisasjon:</strong> {selectedOrg.navn}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation - fixed at bottom - matches main page input area */}
      <div className="shrink-0 p-4 border-t">
        <div className="flex gap-3">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex-1 gap-2 h-11"
              disabled={isSaving}
            >
              <ArrowLeft className="h-4 w-4" />
              Tilbake
            </Button>
          )}
          {step < 4 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex-1 gap-2 h-11"
            >
              Neste
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || isSaving}
              className="flex-1 h-11"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Lagrar...
                </>
              ) : (
                "Opprett aktivitet"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
