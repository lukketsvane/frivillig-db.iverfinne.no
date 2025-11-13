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

type Theme = "light" | "dark"

const EXAMPLE_PROMPTS = [
  "54 år, erfaring innan leiing - vil bidra til lokalsamfunnet i Stavanger",
  "Vil dele kompetanse innan IT med nye innvandrarar. Korleis starte?",
  "Interessert i naturvern og vil lede lokale tiltak i Sogn og Fjordane",
  "50 år, ynskjer å bli mentor for unge i karrierestart. Organisasjonar i Bergen?",
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

  const handleLocationRequest = () => {
    if (!navigator.geolocation) {
      alert("Nettlesaren din støttar ikkje plasseringstenester")
      return
    }

    const location = prompt("Skriv inn poststad, kommune eller fylke:")
    if (location) {
      const savedLocation = {
        poststed: location,
        kommune: location,
        fylke: location,
      }
      setUserLocation(savedLocation)
      setLocationPermission("granted")
      localStorage.setItem("userLocation", JSON.stringify(savedLocation))
    }
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-3 gap-3 bg-background">
      <Card className="w-full max-w-4xl h-[600px] flex flex-col shadow-lg overflow-hidden">
        <div className="border-b px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-2xl font-semibold">Frivilligorganisasjon-utforskar</h1>
            <p className="text-sm text-muted-foreground mt-1">Finn den rette frivilligorganisasjonen for deg</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild className="h-10 bg-transparent">
              <Link href="/utforsk">Utforsk alle</Link>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className={`h-10 w-10 bg-transparent ${locationPermission === "granted" ? "text-green-600 dark:text-green-400" : ""}`}
              title={
                locationPermission === "granted"
                  ? `Plassering: ${userLocation?.poststed || "Aktivert"}`
                  : "Legg til plassering"
              }
              onClick={handleLocationRequest}
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
                <h2 className="text-xl text-foreground">Finn frivilligorganisasjonar som passar for deg!</h2>
                <p className="text-base text-muted-foreground leading-relaxed">
                  Ver spesifikk om alder, interesser og stad - så søkjer eg blant over 70 000 organisasjonar med ein
                  gong.
                </p>
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

                return (
                  <div key={message.id} className="space-y-4">
                    {textContent && textContent.trim() && (
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
                                  <a {...props} className="font-bold italic underline hover:opacity-80" />
                                ),
                                p: ({ node, ...props }) => <p {...props} className="mb-2 last:mb-0" />,
                                strong: ({ node, ...props }) => <strong {...props} className="font-bold" />,
                              }}
                            >
                              {textContent}
                            </ReactMarkdown>
                          ) : (
                            <div className="whitespace-pre-wrap break-words">{textContent}</div>
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
