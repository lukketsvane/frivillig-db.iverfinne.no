"use client"

import type React from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ArrowUp, MapPin, HelpCircle, Paperclip, X, FileText, Bot, Check, Loader2, Sparkles } from "lucide-react"
import { useRef, useEffect, useState, useCallback } from "react"
import { OrganizationCard } from "@/components/organization-card"
import type { OrganizationCardData } from "@/lib/organization-search"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Shader, SolidColor, Pixelate, SineWave } from "shaders/react"
import { UserMenu } from "@/components/user-menu"
import { useAuth } from "@/components/auth-provider"
import { getClientUserProfile, generatePersonalizedPrompts, type UserProfile } from "@/lib/user-profile"

interface AgentProgress {
  step: string
  progress: number
  message: string
  details?: string
}

interface AgentThinking {
  thought: string
  timestamp: number
}

const DEFAULT_PROMPTS = [
  "54 år, erfaring innan leiing - vil bidra til lokalsamfunnet",
  "Vil dele kompetanse innan IT med nye innvandrarar",
  "Interessert i naturvern og vil lede lokale tiltak",
  "Pensjonist med bakgrunn i helse, vil hjelpe eldre",
]

const AGENT_STEPS = [
  { id: "start", label: "Startar", icon: "🚀" },
  { id: "reading", label: "Les vedlegg", icon: "📄" },
  { id: "analyzing", label: "Analyserer profil", icon: "🔍" },
  { id: "extracting", label: "Finn interesser", icon: "💡" },
  { id: "searching", label: "Søkjer organisasjonar", icon: "🏢" },
  { id: "recommending", label: "Lagar anbefalingar", icon: "✨" },
  { id: "complete", label: "Ferdig", icon: "✅" },
]

export default function ChatPage() {
  const { user } = useAuth()
  const [userLocation, setUserLocation] = useState<{
    poststed?: string
    kommune?: string
    fylke?: string
    postnummer?: string
    latitude?: number
    longitude?: number
  } | null>(null)
  const [locationPermission, setLocationPermission] = useState<"prompt" | "granted" | "denied">("prompt")

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [examplePrompts, setExamplePrompts] = useState<string[]>(DEFAULT_PROMPTS)
  const [attachments, setAttachments] = useState<File[]>([])
  const [isAgentMode, setIsAgentMode] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [agentProgress, setAgentProgress] = useState<AgentProgress | null>(null)
  const [agentThinking, setAgentThinking] = useState<AgentThinking | null>(null)
  const [agentResult, setAgentResult] = useState<{
    recommendation: string
    organizations: OrganizationCardData[]
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Load user profile and generate personalized prompts
  useEffect(() => {
    const loadProfile = async () => {
      if (user?.id) {
        const profile = await getClientUserProfile(user.id)
        if (profile) {
          setUserProfile(profile)
          const personalized = generatePersonalizedPrompts(profile)
          if (personalized.length > 0) {
            setExamplePrompts(personalized)
          }
        }
      }
    }
    loadProfile()
  }, [user?.id])

  // Load saved location
  useEffect(() => {
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

  const handleLocationRequest = useCallback(() => {
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
          setLocationPermission("denied")
        }
      },
      () => {
        setLocationPermission("denied")
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }, [])

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    body: { userLocation },
  })

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, agentProgress, agentResult, scrollToBottom])

  const handleAgentAnalysis = async (files: File[], message: string) => {
    setIsProcessing(true)
    setAgentProgress({ step: "start", progress: 0, message: "Startar..." })
    setAgentThinking(null)
    setAgentResult(null)

    const uploadFormData = new FormData()
    files.forEach((file) => uploadFormData.append("files", file))
    uploadFormData.append("message", message)
    if (userLocation) {
      uploadFormData.append("location", JSON.stringify(userLocation))
    }

    try {
      const response = await fetch("/api/analyze-profile", {
        method: "POST",
        headers: { Accept: "text/event-stream" },
        body: uploadFormData,
      })

      if (!response.ok) throw new Error("Failed to analyze")

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error("No response body")

      let buffer = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === "progress") {
                setAgentProgress({
                  step: data.step,
                  progress: data.progress,
                  message: data.message,
                  details: data.details,
                })
              } else if (data.type === "thinking") {
                setAgentThinking({ thought: data.thought, timestamp: data.timestamp })
              } else if (data.type === "result") {
                setAgentResult({
                  recommendation: data.recommendation,
                  organizations: data.organizations,
                })
                setAgentProgress({ step: "complete", progress: 100, message: "Ferdig!" })
                setAgentThinking(null)
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
    if (isProcessing) return

    const formData = new FormData(e.currentTarget)
    const message = formData.get("message") as string

    if (message.trim() || attachments.length > 0) {
      if (attachments.length > 0) {
        setIsAgentMode(true)
        await handleAgentAnalysis(attachments, message)
        formRef.current?.reset()
      } else {
        setIsProcessing(true)
        try {
          await sendMessage({ text: message })
          formRef.current?.reset()
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
      e.currentTarget.form?.requestSubmit()
    }
  }

  const handleExampleClick = (prompt: string) => sendMessage({ text: prompt })
  const handleFileSelect = () => !isProcessing && fileInputRef.current?.click()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isProcessing) return
    const files = Array.from(e.target.files || [])
    setAttachments((prev) => [...prev, ...files])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const toggleAgentMode = () => {
    setIsAgentMode((prev) => !prev)
    setAgentProgress(null)
    setAgentResult(null)
    setAgentThinking(null)
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
            >
              {isAgentMode && <Bot className="w-6 h-6 text-accent" />}
              {isAgentMode ? "agent-modus" : "frivillig-db"}
            </button>
            {userProfile && userProfile.conversation_count > 1 && (
              <p className="text-xs text-muted-foreground mt-1">
                Tilpassa for deg basert på {userProfile.conversation_count} samtalar
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild className="h-11 bg-transparent active:scale-95">
              <Link href="/utforsk">Utforsk alle</Link>
            </Button>
            <Button variant="outline" size="icon-lg" asChild className="h-11 w-11 bg-transparent active:scale-95">
              <Link href="/quiz">
                <HelpCircle className="w-5 h-5" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="icon-lg"
              className={`h-11 w-11 bg-transparent active:scale-95 ${locationPermission === "granted" ? "text-green-600" : ""}`}
              onClick={handleLocationRequest}
            >
              <MapPin className="w-5 h-5" />
            </Button>
            <UserMenu />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {/* Agent Mode UI */}
          {isAgentMode && (agentProgress || agentResult) && (
            <div className="space-y-6 mb-6">
              {/* Live Progress with Thinking */}
              {agentProgress && agentProgress.step !== "complete" && (
                <div className="bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-accent animate-pulse" />
                      <span className="font-medium">Agent analyserer</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{agentProgress.progress}%</span>
                  </div>

                  {/* Thinking bubble - shows what AI is doing right now */}
                  {agentThinking && (
                    <div className="flex items-center gap-2 text-sm text-accent animate-pulse">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="italic">{agentThinking.thought}</span>
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-accent to-secondary transition-all duration-300 ease-out"
                      style={{ width: `${agentProgress.progress}%` }}
                    />
                  </div>

                  {/* Step indicators */}
                  <div className="grid grid-cols-7 gap-1">
                    {AGENT_STEPS.map((step, index) => {
                      const currentIndex = getCurrentStepIndex()
                      const isComplete = index < currentIndex
                      const isCurrent = index === currentIndex

                      return (
                        <div key={step.id} className="flex flex-col items-center gap-1">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
                              isComplete
                                ? "bg-green-500 text-white scale-90"
                                : isCurrent
                                  ? "bg-accent text-white scale-110 shadow-lg"
                                  : "bg-muted text-muted-foreground scale-75 opacity-50"
                            }`}
                          >
                            {isComplete ? <Check className="w-4 h-4" /> : step.icon}
                          </div>
                          <span
                            className={`text-[10px] text-center leading-tight ${isCurrent ? "text-accent font-medium" : "text-muted-foreground"}`}
                          >
                            {step.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Current step details */}
                  {agentProgress.details && (
                    <p className="text-sm text-muted-foreground text-center">{agentProgress.details}</p>
                  )}
                </div>
              )}

              {/* Agent Result */}
              {agentResult && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="w-5 h-5 text-accent" />
                      <span className="font-medium text-accent">Personleg anbefaling</span>
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

          {/* Chat Mode */}
          {!isAgentMode && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-8">
              {userProfile && userProfile.conversation_count > 1 && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Velkomen tilbake! Forslag basert på det eg har lært om deg:
                  </p>
                </div>
              )}
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
                  Last opp CV, profilskildring eller andre dokument. Eg analyserer dei med Gemini AI og finn dei beste
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
                    .map((part) => ("text" in part ? part.text : ""))
                    .join("")

                  let organizations: OrganizationCardData[] = []
                  try {
                    if (message.data && typeof message.data === "object" && "organizations" in message.data) {
                      const orgs = message.data.organizations
                      if (Array.isArray(orgs)) organizations = orgs
                    }
                  } catch {}

                  return (
                    <div key={message.id} className="space-y-4">
                      {textContent?.trim() && (
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
                                  a: ({ ...props }) => (
                                    <a {...props} className="font-bold italic underline hover:opacity-80" />
                                  ),
                                  p: ({ ...props }) => <p {...props} className="mb-2 last:mb-0" />,
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
                    className="shrink-0 hover:bg-muted-foreground/10 p-1 active:scale-95 disabled:opacity-50"
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
            >
              <Paperclip className="w-5 h-5" />
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
