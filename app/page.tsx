"use client"

import type React from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ArrowUp, MapPin, HelpCircle, Paperclip, X, FileText, Bot, Check } from "lucide-react"
import { useRef, useEffect, useState } from "react"
import { OrganizationCard } from "@/components/organization-card"
import type { OrganizationCardData } from "@/lib/organization-search"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Shader, SolidColor, Pixelate, SineWave } from "shaders/react"
import { UserMenu } from "@/components/user-menu"

interface AgentProgress {
  step: string
  progress: number
  message: string
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

const AGENT_STEPS = [
  { id: "reading", label: "Les vedlegg", icon: "📄" },
  { id: "analyzing", label: "Analyserer profil", icon: "🔍" },
  { id: "extracting", label: "Finn interesser", icon: "💡" },
  { id: "searching", label: "Søkjer organisasjonar", icon: "🏢" },
  { id: "recommending", label: "Lagar anbefalingar", icon: "✨" },
  { id: "complete", label: "Ferdig", icon: "✅" },
]

export default function ChatPage() {
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
  const [agentProgress, setAgentProgress] = useState<AgentProgress | null>(null)
  const [agentResult, setAgentResult] = useState<{
    recommendation: string
    organizations: OrganizationCardData[]
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const shuffled = [...ALL_EXAMPLE_PROMPTS].sort(() => Math.random() - 0.5)
    setExamplePrompts(shuffled.slice(0, 4))

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
  }, [messages, agentProgress, agentResult])

  const handleAgentAnalysis = async (files: File[], message: string) => {
    setIsProcessing(true)
    setAgentProgress({ step: "reading", progress: 0, message: "Startar analyse..." })
    setAgentResult(null)

    const uploadFormData = new FormData()
    files.forEach((file) => {
      uploadFormData.append("files", file)
    })
    uploadFormData.append("message", message)
    if (userLocation) {
      uploadFormData.append("location", JSON.stringify(userLocation))
    }

    try {
      const response = await fetch("/api/analyze-profile", {
        method: "POST",
        headers: {
          Accept: "text/event-stream",
        },
        body: uploadFormData,
      })

      if (!response.ok) {
        throw new Error("Failed to analyze")
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("No response body")
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === "progress") {
                setAgentProgress({
                  step: data.step,
                  progress: data.progress,
                  message: data.message,
                })
              } else if (data.type === "result") {
                setAgentResult({
                  recommendation: data.recommendation,
                  organizations: data.organizations,
                })
                setAgentProgress({ step: "complete", progress: 100, message: "Ferdig!" })
              } else if (data.type === "error") {
                throw new Error(data.error)
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("[v0] Agent analysis error:", error)
      setAgentProgress({ step: "error", progress: 0, message: "Noko gjekk gale. Prøv igjen." })
    } finally {
      setIsProcessing(false)
      setAttachments([])
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (isProcessing) {
      return
    }

    const formData = new FormData(e.currentTarget)
    const message = formData.get("message") as string

    if (message.trim() || attachments.length > 0) {
      if (attachments.length > 0) {
        setIsAgentMode(true)
        await handleAgentAnalysis(attachments, message)
        if (formRef.current) {
          formRef.current.reset()
        }
      } else {
        setIsProcessing(true)
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
    setAgentProgress(null)
    setAgentResult(null)
  }

  const getCurrentStepIndex = () => {
    if (!agentProgress) return -1
    return AGENT_STEPS.findIndex((s) => s.id === agentProgress.step)
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-3 gap-3">
      <div className="fixed inset-0 -z-10 w-full h-full">
        <Shader className="w-full h-full">
          <SolidColor color="#27085E" maskType="alpha" />
          <Pixelate scale={15} maskType="alpha" opacity={0.84}>
            <SineWave
              color="#EDF455"
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

      <Card className="w-full max-w-4xl h-[600px] max-h-[85vh] flex flex-col shadow-lg overflow-hidden">
        <div className="border-b px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <button
              onClick={toggleAgentMode}
              className="text-2xl font-semibold hover:opacity-70 transition-opacity active:scale-95 flex items-center gap-2"
              title="Bytt mellom normal og agent-modus"
            >
              {isAgentMode && <Bot className="w-6 h-6 text-accent" />}
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
              className={`h-11 w-11 bg-transparent active:scale-95 ${locationPermission === "granted" ? "text-green-600" : ""}`}
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
            <UserMenu />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {/* Agent Mode Progress UI */}
          {isAgentMode && (agentProgress || agentResult) && (
            <div className="space-y-6 mb-6">
              {/* Progress Steps */}
              {agentProgress && agentProgress.step !== "complete" && (
                <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-accent animate-pulse" />
                    <span className="font-medium">Agent analyserer...</span>
                  </div>

                  {/* Step indicators */}
                  <div className="space-y-2">
                    {AGENT_STEPS.map((step, index) => {
                      const currentIndex = getCurrentStepIndex()
                      const isComplete = index < currentIndex
                      const isCurrent = index === currentIndex
                      const isPending = index > currentIndex

                      return (
                        <div
                          key={step.id}
                          className={`flex items-center gap-3 p-2 rounded transition-all ${
                            isCurrent ? "bg-accent/10" : ""
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                              isComplete
                                ? "bg-green-500 text-white"
                                : isCurrent
                                  ? "bg-accent text-white animate-pulse"
                                  : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isComplete ? <Check className="w-4 h-4" /> : step.icon}
                          </div>
                          <span
                            className={`text-sm ${
                              isComplete
                                ? "text-green-600 line-through"
                                : isCurrent
                                  ? "text-foreground font-medium"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all duration-500 ease-out"
                      style={{ width: `${agentProgress.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Agent Result */}
              {agentResult && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="w-5 h-5 text-accent" />
                      <span className="font-medium text-accent">Anbefaling</span>
                    </div>
                    <p className="text-foreground leading-relaxed">{agentResult.recommendation}</p>
                  </div>

                  {agentResult.organizations.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-medium text-foreground">Tilpassa organisasjonar for deg:</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {agentResult.organizations.map((org) => (
                          <OrganizationCard key={org.id} organization={org} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Normal Chat Mode */}
          {!isAgentMode && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-8">
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
            </div>
          ) : isAgentMode && !agentProgress && !agentResult ? (
            <div className="flex flex-col items-center justify-center h-full gap-8">
              <div className="text-center max-w-md space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-accent/10 flex items-center justify-center">
                  <Bot className="w-8 h-8 text-accent" />
                </div>
                <div className="text-lg font-medium">Last opp CV eller profil</div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Last opp CV, profilskildring eller andre dokument, så analyserer eg dei og finn dei beste
                  organisasjonane for deg.
                </p>
                <Button onClick={handleFileSelect} className="gap-2">
                  <Paperclip className="w-4 h-4" />
                  Vel fil
                </Button>
              </div>
            </div>
          ) : (
            !isAgentMode && (
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
                    if (message.data && typeof message.data === "object") {
                      if ("organizations" in message.data) {
                        const orgs = message.data.organizations
                        if (Array.isArray(orgs)) {
                          organizations = orgs
                        }
                      }
                    }
                  } catch (error) {
                    console.error("[v0] Error parsing message data:", error)
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
                                className="prose prose-sm max-w-none"
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
            )
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
              className={`shrink-0 h-11 w-11 bg-transparent active:scale-95 ${isAgentMode ? "border-accent text-accent" : ""}`}
              title="Legg til vedlegg"
            >
              <Paperclip className="w-5 h-5" />
              <span className="sr-only">Legg til vedlegg</span>
            </Button>

            <Input
              ref={inputRef}
              name="message"
              placeholder={isAgentMode ? "Skriv om deg sjølv (valfritt)..." : "Skriv ei melding..."}
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
          <div className="mt-2 flex gap-3 justify-center">
            <Link
              href="/slikkepinne"
              className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              slikkepinne
            </Link>
            <Link
              href="/om-tenesta"
              className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              om tenesta
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}
