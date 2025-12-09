"use client"

import { useState, useRef, useEffect } from "react"
import { X, Send, MessageCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/components/auth-provider"
import { getClientUserProfile, generatePersonalizedPrompts, type UserProfile } from "@/lib/user-profile"

const DEFAULT_SUGGESTIONS = [
  "Finn organisasjoner i Oslo",
  "Hvordan bli frivillig?",
  "Organisasjoner i Bergen",
  "Hva kan jeg bidra med?",
]

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  thinking?: string
}

function renderMessageContent(content: string) {
  if (!content) return content

  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match

  while ((match = linkRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index))
    }
    parts.push(
      <Link key={match.index} href={match[2]} className="text-blue-400 underline">
        {match[1]}
      </Link>
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex))
  }

  return parts.length > 0 ? parts : content
}

export function Chatbot() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentThinking, setCurrentThinking] = useState<string>("")
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS)
  const [userLocation, setUserLocation] = useState<{
    poststed?: string
    kommune?: string
    fylke?: string
  } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, currentThinking])

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [open])

  // Load user profile and personalized suggestions
  useEffect(() => {
    const loadProfile = async () => {
      if (user?.id) {
        const profile = await getClientUserProfile(user.id)
        if (profile) {
          setUserProfile(profile)
          const personalized = generatePersonalizedPrompts(profile)
          if (personalized.length > 0) {
            setSuggestions(personalized)
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
      } catch (error) {
        console.error("[Slikkepinne] Error parsing saved location:", error)
      }
    }
  }, [])

  const MAX_MESSAGE_LENGTH = 2000

  const sendMessage = async (text: string) => {
    const trimmedText = text.trim()
    if (!trimmedText || isLoading) return

    // Validate message length
    if (trimmedText.length > MAX_MESSAGE_LENGTH) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `Meldinga er for lang. Maks ${MAX_MESSAGE_LENGTH} teikn.`,
      }
      setMessages((prev) => [...prev, errorMessage])
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: trimmedText,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setCurrentThinking("")

    try {
      const response = await fetch("/api/slikkepinne/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          userLocation,
        }),
      })

      if (!response.ok) throw new Error("Failed to send message")

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
      }

      setMessages((prev) => [...prev, assistantMessage])

      if (reader) {
        let fullContent = ""
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          buffer += chunk

          // Check for SSE data events (thinking)
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.type === "thinking") {
                  setCurrentThinking(data.content)
                }
              } catch {
                // Not JSON, treat as regular content
                fullContent += line.slice(6)
                setMessages((prev) => {
                  const newMessages = [...prev]
                  const lastMsg = newMessages[newMessages.length - 1]
                  if (lastMsg && lastMsg.role === "assistant") {
                    lastMsg.content = fullContent
                  }
                  return newMessages
                })
              }
            } else if (line.trim()) {
              // Regular text chunk
              fullContent += line
              setMessages((prev) => {
                const newMessages = [...prev]
                const lastMsg = newMessages[newMessages.length - 1]
                if (lastMsg && lastMsg.role === "assistant") {
                  lastMsg.content = fullContent
                }
                return newMessages
              })
            }
          }

          // Handle any remaining content in chunk
          if (chunk && !chunk.includes("data:")) {
            fullContent += chunk
            setMessages((prev) => {
              const newMessages = [...prev]
              const lastMsg = newMessages[newMessages.length - 1]
              if (lastMsg && lastMsg.role === "assistant") {
                lastMsg.content = fullContent
              }
              return newMessages
            })
          }
        }

        setCurrentThinking("")
      }
    } catch (error) {
      console.error("Chat error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Beklager, noe gikk galt. Prøv igjen.",
      }
      setMessages((prev) => [...prev, errorMessage])
      setCurrentThinking("")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion)
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const isButtonDisabled = isLoading || !input.trim()

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed right-4 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center active:scale-95 transition-transform shadow-lg hover:shadow-xl z-[9999]"
        style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
        aria-label="Opne chat"
      >
        <MessageCircle className="w-5 h-5" />
      </button>
    )
  }

  return (
    <div
      className="fixed right-3 left-3 sm:left-auto sm:w-[90vw] sm:max-w-sm bg-card border border-border rounded-2xl flex flex-col z-[9999] shadow-lg"
      style={{
        bottom: "calc(5rem + env(safe-area-inset-bottom))",
        height: "min(500px, calc(100dvh - 12rem))",
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <span className="text-sm font-semibold text-foreground">slikkepinne chat</span>
          {userProfile && userProfile.conversation_count > 1 && (
            <p className="text-xs text-muted-foreground">
              Tilpassa for deg
            </p>
          )}
        </div>
        <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-muted rounded-full transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              {userProfile?.interests && userProfile.interests.length > 0
                ? "Spørsmål tilpassa dine interesser"
                : "Spør om frivillighet i Norge"}
            </div>
            <div className="grid grid-cols-1 gap-2 mt-4">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={isLoading}
                  className="text-left px-3 py-2 text-xs bg-muted hover:bg-muted/80 active:bg-muted/60 text-foreground rounded-lg border border-border transition-colors disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground border border-border"
              }`}
            >
              <div className="whitespace-pre-wrap">{renderMessageContent(m.content)}</div>
            </div>
          </div>
        ))}
        {currentThinking && (
          <div className="flex justify-start">
            <div className="max-w-[85%] px-3 py-2 rounded-2xl text-xs bg-accent/10 text-accent border border-accent/20 flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="italic">{currentThinking}</span>
            </div>
          </div>
        )}
        {isLoading && !currentThinking && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="text-xs text-muted-foreground px-3 py-2">...</div>
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="p-3 border-t border-border flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="skriv melding..."
          disabled={isLoading}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          className="flex-1 h-10 text-sm bg-background text-foreground border border-border rounded-xl placeholder-muted-foreground px-4 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
        />
        <button
          type="submit"
          disabled={isButtonDisabled}
          className="h-10 w-10 p-0 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
