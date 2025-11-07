"use client"

import type React from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ArrowUp, Moon, Sun, MapPin } from "lucide-react"
import { useRef, useEffect, useState } from "react"
import { OrganizationCard } from "@/components/organization-card"
import type { OrganizationCardData } from "@/lib/organization-search"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { reverseGeocode } from "@/lib/geocoding"

type Theme = "light" | "dark"

const EXAMPLE_PROMPTS = [
  "Eg er pensjonist i Oslo og vil møte andre. Kva finst?",
  "Eg har barn på 7 år som elskar naturen. Finn turlag for born!",
  "Vil verte frivillig i miljøorganisasjon i Hordaland",
  "Ungdom 16 år - kulturaktivitetar i Trondheim?",
]

export default function ChatPage() {
  const [theme, setTheme] = useState<Theme>("light")
  const [userLocation, setUserLocation] = useState<{
    poststed?: string
    kommune?: string
    fylke?: string
    postnummer?: string
  } | null>(null)
  const [locationPermission, setLocationPermission] = useState<"prompt" | "granted" | "denied">("prompt")
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches

    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.classList.toggle("dark", savedTheme === "dark")
    } else if (systemPrefersDark) {
      setTheme("dark")
      document.documentElement.classList.add("dark")
    }

    const savedLocation = localStorage.getItem("userLocation")
    if (savedLocation) {
      try {
        setUserLocation(JSON.parse(savedLocation))
        setLocationPermission("granted")
      } catch (error) {
        console.error("[v0] Error parsing saved location:", error)
      }
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
  }

  const handleLocationRequest = async () => {
    if (!navigator.geolocation) {
      alert("Nettlesaren din støttar ikkje plasseringstenester")
      return
    }

    setIsLoadingLocation(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords

        // Reverse geocode koordinatane
        const location = await reverseGeocode(latitude, longitude)

        if (location) {
          setUserLocation(location)
          setLocationPermission("granted")
          localStorage.setItem("userLocation", JSON.stringify(location))
          alert(`Plassering sett til: ${location.poststed || location.kommune || location.fylke}`)
        } else {
          alert("Kunne ikkje hente plassering frå koordinatane")
        }

        setIsLoadingLocation(false)
      },
      (error) => {
        console.error("[v0] Geolocation error:", error)

        if (error.code === error.PERMISSION_DENIED) {
          setLocationPermission("denied")
          alert("Du må tillate tilgang til plasseringa di for å bruke denne funksjonen")
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          alert("Plasseringa di er ikkje tilgjengeleg akkurat no")
        } else if (error.code === error.TIMEOUT) {
          alert("Tidsavbrot ved henting av plassering")
        } else {
          alert("Kunne ikkje hente plasseringa di")
        }

        setIsLoadingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    )
  }

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    body: {
      userLocation,
    },
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const message = formData.get("message") as string

    if (message.trim()) {
      sendMessage({ text: message })
      e.currentTarget.reset()
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      const form = e.currentTarget.form
      if (form) {
        form.requestSubmit()
      }
    }
  }

  const handleExampleClick = (prompt: string) => {
    sendMessage({ text: prompt })
  }

  const createLinksFromOrgNames = (text: string, organizations: OrganizationCardData[]) => {
    let processedText = text

    // Sorter organisasjonar etter lengste namn først for å unngå delvis match
    const sortedOrgs = [...organizations].sort((a, b) => b.navn.length - a.navn.length)

    sortedOrgs.forEach((org) => {
      // Finn **Organisasjonsnamn** i teksten
      const boldPattern = new RegExp(`\\*\\*${org.navn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\*\\*`, "gi")
      processedText = processedText.replace(
        boldPattern,
        `**[${org.navn}](https://frivillig-db.iverfinne.no/organisasjon/${org.slug})**`,
      )

      // Finn også vanleg organisasjonsnamn (utan feitskrift) og konverter
      const plainPattern = new RegExp(`(?<!\\*)\\b${org.navn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b(?!\\*)`, "gi")
      processedText = processedText.replace(
        plainPattern,
        `**[${org.navn}](https://frivillig-db.iverfinne.no/organisasjon/${org.slug})**`,
      )
    })

    return processedText
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-3 gap-3 bg-background">
      <Card className="w-full max-w-4xl h-[600px] flex flex-col shadow-lg overflow-hidden">
        <div className="border-b px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-2xl font-semibold">Frivillig-utforskar</h1>
            <p className="text-sm text-muted-foreground mt-1">Finn organisasjonar som passar for deg</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild className="h-10 bg-transparent">
              <Link href="/utforsk">Alle</Link>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className={`h-10 w-10 bg-transparent ${locationPermission === "granted" ? "text-green-600 dark:text-green-400" : ""} ${isLoadingLocation ? "animate-pulse" : ""}`}
              title={
                locationPermission === "granted"
                  ? `Plassering: ${userLocation?.poststed || userLocation?.kommune || "Aktivert"}`
                  : "Del plassering"
              }
              onClick={handleLocationRequest}
              disabled={isLoadingLocation}
            >
              <MapPin className="w-4 h-4" />
              <span className="sr-only">Plassering</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="h-10 w-10 bg-transparent"
              title={theme === "light" ? "Bytt til mørk modus" : "Bytt til lys modus"}
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              <span className="sr-only">Bytt tema</span>
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-8">
              <div className="text-center space-y-3 max-w-2xl">
                <h2 className="text-xl text-foreground">Finn frivilligorganisasjonar</h2>
                <p className="text-base text-muted-foreground leading-relaxed">Sei alder, interesser og stad</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                {EXAMPLE_PROMPTS.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handleExampleClick(prompt)}
                    className="text-left p-4 border border-border hover:border-foreground/20 hover:bg-muted/50 transition-all text-sm text-foreground leading-relaxed"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const textContent = message.parts
                  .filter((part) => part.type === "text")
                  .map((part) => {
                    if ("text" in part) {
                      return part.text
                    }
                    return ""
                  })
                  .join("")

                let organizations: OrganizationCardData[] = []
                try {
                  if (message.data && typeof message.data === "object" && "organizations" in message.data) {
                    const orgs = message.data.organizations
                    if (Array.isArray(orgs)) {
                      organizations = orgs
                    }
                  }
                } catch (error) {
                  console.error("[v0] Error parsing organizations:", error)
                }

                const processedText =
                  message.role === "assistant" && organizations.length > 0
                    ? createLinksFromOrgNames(textContent, organizations)
                    : textContent

                return (
                  <div key={message.id} className="space-y-4">
                    {processedText && processedText.trim() && (
                      <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`relative max-w-[75%] px-4 py-3 text-base leading-relaxed ${
                            message.role === "user" ? "bg-foreground text-background" : "bg-muted text-foreground"
                          }`}
                        >
                          {message.role === "assistant" ? (
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              className="prose prose-sm dark:prose-invert max-w-none"
                              components={{
                                a: ({ node, ...props }) => (
                                  <a
                                    {...props}
                                    className="text-foreground font-bold italic underline hover:no-underline cursor-pointer"
                                  />
                                ),
                                p: ({ node, ...props }) => <p {...props} className="mb-2 last:mb-0" />,
                                strong: ({ node, ...props }) => <strong {...props} className="font-bold" />,
                              }}
                            >
                              {processedText}
                            </ReactMarkdown>
                          ) : (
                            <div className="whitespace-pre-wrap break-words">{processedText}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {message.role === "assistant" && organizations.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {organizations.map((org) => (
                          <OrganizationCard key={org.id} organization={org} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {status === "in_progress" && (
                <div className="flex justify-start">
                  <div className="relative max-w-[75%] px-4 py-3 bg-muted">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t px-6 py-4 shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Input
              ref={inputRef}
              name="message"
              placeholder="Skriv ei melding..."
              disabled={status === "in_progress"}
              className="flex-1 h-11"
              autoComplete="off"
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <Button type="submit" disabled={status === "in_progress"} size="icon" className="shrink-0 h-11 w-11">
              <ArrowUp className="w-5 h-5" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}
