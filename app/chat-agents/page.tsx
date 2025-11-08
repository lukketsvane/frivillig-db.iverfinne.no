"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ArrowUp, Moon, Sun, MapPin, Loader2 } from "lucide-react"
import { useRef, useEffect, useState } from "react"
import { OrganizationCard } from "@/components/organization-card"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { reverseGeocode } from "@/lib/geocoding"
import { useAgentsChat } from "@/lib/hooks/use-agents-chat"

type Theme = "light" | "dark"

const EXAMPLE_PROMPTS = [
  "Eg er pensjonist i Oslo og vil møte andre. Kva finst?",
  "Eg har barn på 7 år som elskar naturen. Finn turlag for born!",
  "Vil verte frivillig i miljøorganisasjon i Hordaland",
  "Ungdom 16 år - kulturaktivitetar i Trondheim?",
]

export default function AgentsChatPage() {
  const [theme, setTheme] = useState<Theme>("light")
  const [userLocation, setUserLocation] = useState<{
    poststed?: string
    kommune?: string
    fylke?: string
    postnummer?: string
  } | null>(null)
  const [locationPermission, setLocationPermission] = useState<"prompt" | "granted" | "denied">("prompt")
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [input, setInput] = useState("")

  const { messages, isLoading, organizations, sendMessage, reset } = useAgentsChat({
    onError: (error) => {
      console.error("Chat error:", error)
    },
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
        console.error("Error parsing saved location:", error)
      }
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

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
        console.error("Geolocation error:", error)

        if (error.code === error.PERMISSION_DENIED) {
          setLocationPermission("denied")
          alert("Du må tillate tilgang til plasseringa di for å bruke denne funksjonen")
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          alert("Plasseringa di er ikkje tilgjengeleg")
        } else if (error.code === error.TIMEOUT) {
          alert("Tidsavbrot ved henting av plassering")
        }

        setIsLoadingLocation(false)
      },
    )
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()

    if (!input.trim() || isLoading) return

    const message = input.trim()
    setInput("")

    await sendMessage(message, {
      postnummer: userLocation?.postnummer,
      kommune: userLocation?.kommune,
      fylke: userLocation?.fylke,
    })

    inputRef.current?.focus()
  }

  const handleExampleClick = (prompt: string) => {
    setInput(prompt)
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Finn Frivillig Organisasjon (OpenAI Agents)</h1>
          <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">Agents API</span>
        </div>
        <div className="flex items-center gap-2">
          {userLocation && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>{userLocation.poststed || userLocation.kommune || userLocation.fylke}</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLocationRequest}
            disabled={isLoadingLocation}
            title={userLocation ? "Oppdater plassering" : "Del plassering"}
          >
            {isLoadingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Velkommen! 👋</h2>
              <p className="text-muted-foreground">
                Eg hjelper deg med å finne frivillige organisasjonar i Noreg. Prøv eit av eksempla under:
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {EXAMPLE_PROMPTS.map((prompt, i) => (
                <Card
                  key={i}
                  className="p-4 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleExampleClick(prompt)}
                >
                  <p className="text-sm">{prompt}</p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, i) => (
          <div key={i} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground prose prose-sm dark:prose-invert"
              }`}
            >
              {message.role === "user" ? (
                <p className="text-sm">{message.content}</p>
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ node, ...props }) => (
                      <a {...props} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" />
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}

        {/* Organization cards */}
        {organizations.length > 0 && (
          <div className="max-w-4xl mx-auto space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Organisasjonar:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {organizations.map((org) => (
                <OrganizationCard key={org.id} organization={org} />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-card px-4 py-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Kva leitar du etter? (t.d. 'musikk i Bergen', 'hjelpe eldre')"
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={!input.trim() || isLoading} size="icon">
            <ArrowUp className="h-4 w-4" />
          </Button>
        </form>
        <p className="text-xs text-center text-muted-foreground mt-2">
          Powered by OpenAI Agents API • Data frå Brønnøysundregisteret
        </p>
      </div>
    </div>
  )
}
