"use client"

import type React from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ArrowUp, Moon, Sun, MapPin, HelpCircle, Paperclip, X, FileText } from "lucide-react"
import { useRef, useEffect, useState } from "react"
import { OrganizationCard } from "@/components/organization-card"
import type { OrganizationCardData } from "@/lib/organization-search"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Shader, SolidColor, Pixelate, SineWave } from "shaders/react"

type Theme = "light" | "dark"

interface MessageWithAttachments {
  id: string
  role: string
  content: string
  attachments?: { name: string; type: string }[]
}

const ALL_EXAMPLE_PROMPTS = [
  "54 år, erfaring innan leiing - vil bidra til lokalsamfunnet i Stavanger",
  "Vil dele kompetanse innan IT med nye innvandrarar. Korleis starte?",
  "Interessert i naturvern og vil lede lokale tiltak i Sogn og Fjordane",
  "50 år, ynskjer å bli mentor for unge i karrierestart. Organisasjonar i Bergen?",
  "Pensjonist med bakgrunn i helse, vil hjelpe eldre i Trondheim",
  "Erfaring som økonomisjef, vil gi råd til små bedrifter i Tromsø",
  "Vil arrangere kulturarrangement for lokalsamfunnet i Kristiansand",
  "55 år, lidenskapleg om idrett - vil trene ungdomslag i Oslo",
  "Ønskjer å støtte flyktningar med integrasjon og språkopplæring i Drammen",
  "Erfaring med mat og servering, vil hjelpe matbank i Fredrikstad",
  "Vil lede miljøprosjekt for berekraftig utvikling i Haugesund",
  "Pensjonist, glad i dyr - vil jobbe med dyrevelferd i Lillehammer",
  "Pedagogisk bakgrunn, vil hjelpe barn med leksehjelp i Molde",
  "Erfaring som ingeniør, vil inspirere unge til teknologifag i Bodø",
  "Vil arbeide med likestilling og kvinners rettar i Ålesund",
  "Pensjonist med erfaring i rettsvesen, vil gi juridisk rettleiing til familiar i Sarpsborg",
  "Musikkinteressert, vil undervise barn og unge i Sandefjord",
  "Vil støtte menneske med psykisk helse gjennom samtalegrupper i Arendal",
  "Handverkserfaring, vil lære unge restaurering og håndverk i Hamar",
  "Vil arbeide med demokrati og menneskerettar internasjonalt frå Porsgrunn",
]

export default function ChatPage() {
  const [theme, setTheme] = useState<Theme>("light")
  const [userLocation, setUserLocation] = useState<{
    poststed?: string
    kommune?: string
    fylke?: string
    postnummer?: string
    latitude?: number
    longitude?: number
  } | null>(null)
  const [locationPermission, setLocationPermission] = useState<"prompt" | "granted" | "denied">("prompt")

  const [examplePrompts, setExamplePrompts] = useState<string[]>([])
  const [attachments, setAttachments] = useState<File[]>([])
  const [isAgentMode, setIsAgentMode] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const shuffled = [...ALL_EXAMPLE_PROMPTS].sort(() => Math.random() - 0.5)
    setExamplePrompts(shuffled.slice(0, 4))

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

    setLocationPermission("prompt")
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=no`,
          )
          const data = await response.json()

          const savedLocation = {
            poststed: data.address?.city || data.address?.town || data.address?.village,
            kommune: data.address?.municipality || data.address?.city,
            fylke: data.address?.state,
            postnummer: data.address?.postcode,
            latitude,
            longitude,
          }

          setUserLocation(savedLocation)
          setLocationPermission("granted")
          localStorage.setItem("userLocation", JSON.stringify(savedLocation))
        } catch (error) {
          console.error("[v0] Error getting location details:", error)
          alert("Kunne ikkje hente plasseringsdetaljar")
          setLocationPermission("denied")
        }
      },
      (error) => {
        console.error("[v0] Geolocation error:", error)
        setLocationPermission("denied")
        alert("Kunne ikkje få tilgang til plasseringa di. Sjekk nettlesarinnstillingane.")
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (isProcessing) {
      return
    }

    const formData = new FormData(e.currentTarget)
    const message = formData.get("message") as string

    if (message.trim() || attachments.length > 0) {
      setIsProcessing(true)

      if (attachments.length > 0) {
        setIsAgentMode(true)

        const uploadFormData = new FormData()
        attachments.forEach((file) => {
          uploadFormData.append("files", file)
        })
        uploadFormData.append("message", message)
        if (userLocation) {
          uploadFormData.append("location", JSON.stringify(userLocation))
        }

        const attachmentInfo = attachments.map((file) => ({
          name: file.name,
          type: file.type,
        }))

        try {
          const response = await fetch("/api/analyze-profile", {
            method: "POST",
            body: uploadFormData,
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || "Failed to analyze attachments")
          }

          const data = await response.json()

          const combinedMessage = `${data.recommendation}\n\n**Profil:**\n${data.profile}`
          sendMessage({
            text: combinedMessage,
            data: {
              organizations: data.organizations,
              attachments: attachmentInfo,
            },
          })

          setAttachments([])
          if (formRef.current) {
            formRef.current.reset()
          }
        } catch (error) {
          console.error("[v0] Error uploading attachments:", error)
          alert("Kunne ikkje laste opp vedlegg. Prøv igjen.")
        } finally {
          setIsProcessing(false)
        }
      } else {
        try {
          await sendMessage({ text: message })
          if (formRef.current) {
            formRef.current.reset()
          }
        } finally {
          setIsProcessing(false)
        }
      }

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

  const handleFileSelect = () => {
    if (isProcessing) return
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isProcessing) return
    const files = Array.from(e.target.files || [])
    setAttachments((prev) => [...prev, ...files])
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const toggleAgentMode = () => {
    setIsAgentMode((prev) => !prev)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-3 gap-3 relative">
      <div className="fixed inset-0 -z-10 w-full h-full">
        <Shader className="w-full h-full">
          <SolidColor color="#000000" maskType="alpha" />
          <Pixelate scale={15} maskType="alpha" opacity={0.84}>
            <SineWave
              color="#ffffff"
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

      <Card className="w-full max-w-4xl h-[600px] flex flex-col shadow-lg overflow-hidden">
        <div className="border-b px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <button
              onClick={toggleAgentMode}
              className="text-2xl font-semibold hover:opacity-70 transition-opacity active:scale-95"
              title="Bytt mellom normal og agent-modus"
            >
              {isAgentMode ? "agent-modus" : "frivillig-db"}
            </button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild className="h-11 bg-transparent active:scale-95">
              <Link href="/utforsk">Utforsk alle</Link>
            </Button>
            <Button
              variant="outline"
              size="icon-lg"
              asChild
              className="h-11 w-11 bg-transparent active:scale-95"
              title="Ta quiz"
            >
              <Link href="/quiz">
                <HelpCircle className="w-5 h-5" />
                <span className="sr-only">Ta quiz</span>
              </Link>
            </Button>
            <Button
              variant="outline"
              size="icon-lg"
              className={`h-11 w-11 bg-transparent active:scale-95 ${locationPermission === "granted" ? "text-green-600 dark:text-green-400" : ""}`}
              title={
                locationPermission === "granted"
                  ? `Plassering: ${userLocation?.poststed || "Aktivert"}`
                  : "Legg til plassering"
              }
              onClick={handleLocationRequest}
            >
              <MapPin className="w-5 h-5" />
              <span className="sr-only">Plassering</span>
            </Button>
            <Button
              variant="outline"
              size="icon-lg"
              onClick={toggleTheme}
              className="h-11 w-11 bg-transparent active:scale-95"
              title={theme === "light" ? "Bytt til mørk modus" : "Bytt til lys modus"}
            >
              {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              <span className="sr-only">Bytt tema</span>
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-8">
              {isAgentMode ? (
                <div className="text-center max-w-md space-y-4">
                  <div className="text-lg font-medium">Last opp vedlegg for personaliserte forslag</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Vi analyserer dokumenta dine og gir tilpassa organisasjonsanbefalingar basert på profilen din.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                  {examplePrompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => handleExampleClick(prompt)}
                      className="text-left p-4 min-h-[44px] border border-border hover:border-foreground/20 hover:bg-muted/50 active:scale-95 transition-all text-sm text-foreground leading-relaxed"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
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
                let messageAttachments: { name: string; type: string }[] = []
                try {
                  if (message.data && typeof message.data === "object") {
                    if ("organizations" in message.data) {
                      const orgs = message.data.organizations
                      if (Array.isArray(orgs)) {
                        organizations = orgs
                      }
                    }
                    if ("attachments" in message.data) {
                      const atts = message.data.attachments
                      if (Array.isArray(atts)) {
                        messageAttachments = atts
                      }
                    }
                  }
                } catch (error) {
                  console.error("[v0] Error parsing message data:", error)
                }

                return (
                  <div key={message.id} className="space-y-4">
                    {messageAttachments.length > 0 && (
                      <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className="flex flex-wrap gap-2 max-w-[75%]">
                          {messageAttachments.map((att, idx) => (
                            <div
                              key={idx}
                              className={`flex items-center gap-2 px-3 py-2 text-sm ${
                                message.role === "user"
                                  ? "bg-foreground text-background"
                                  : "bg-muted text-foreground border border-border"
                              }`}
                            >
                              <FileText className="w-4 h-4 shrink-0" />
                              <span className="truncate max-w-[200px]">{att.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {textContent &&
                      textContent.trim() &&
                      !(
                        message.role === "assistant" &&
                        messageAttachments.length > 0 &&
                        textContent.includes("**Profil:**")
                      ) && (
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
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center gap-2 px-3 py-2 bg-muted text-sm border border-border">
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="truncate max-w-[200px]">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    disabled={isProcessing}
                    className="shrink-0 hover:bg-muted-foreground/10 p-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form ref={formRef} onSubmit={handleSubmit} className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.doc,.docx,.jpg,.jpeg,.png,.gif"
              onChange={handleFileChange}
              className="hidden"
            />

            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              onClick={handleFileSelect}
              disabled={isProcessing || status === "in_progress"}
              className="shrink-0 h-11 w-11 bg-transparent active:scale-95"
              title="Legg til vedlegg"
            >
              <Paperclip className="w-5 h-5" />
              <span className="sr-only">Legg til vedlegg</span>
            </Button>

            <Input
              ref={inputRef}
              name="message"
              placeholder="Skriv ei melding..."
              disabled={isProcessing || status === "in_progress"}
              className="flex-1 h-11"
              autoComplete="off"
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <Button
              type="submit"
              disabled={isProcessing || status === "in_progress"}
              size="icon-lg"
              className="shrink-0 active:scale-95"
            >
              <ArrowUp className="w-5 h-5" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}
