"use client"

import { useState, useRef, useEffect } from "react"
import { X, Send, MessageCircle } from "lucide-react"
import Link from "next/link"

const suggestions = [
  "Finn organisasjoner i Oslo",
  "Hvordan bli frivillig?",
  "Organisasjoner i Bergen",
  "Hva kan jeg bidra med?",
]

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
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
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [open])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/slikkepinne/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
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
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = decoder.decode(value, { stream: true })
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
    } catch (error) {
      console.error("Chat error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Beklager, noe gikk galt. Prøv igjen.",
      }
      setMessages((prev) => [...prev, errorMessage])
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
        className="fixed right-4 w-12 h-12 bg-white text-black rounded-full flex items-center justify-center active:scale-95 transition-transform z-[9999]"
        style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
      >
        <MessageCircle className="w-5 h-5" />
      </button>
    )
  }

  return (
    <div
      className="fixed right-3 left-3 sm:left-auto sm:w-[90vw] sm:max-w-sm bg-black border border-white/20 rounded-2xl flex flex-col z-[9999]"
      style={{
        bottom: "calc(5rem + env(safe-area-inset-bottom))",
        height: "min(500px, calc(100dvh - 12rem))",
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="text-sm font-mono text-white/80">chat</span>
        <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-white/5 rounded-full">
          <X className="w-4 h-4 text-white/60" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="text-xs text-white/40 font-mono">Spør om frivillighet i Norge</div>
            <div className="grid grid-cols-1 gap-2 mt-4">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={isLoading}
                  className="text-left px-3 py-2 text-xs font-mono bg-white/5 hover:bg-white/10 active:bg-white/15 text-white/80 rounded-lg border border-white/10 transition-colors disabled:opacity-50"
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
              className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs font-mono ${
                m.role === "user" ? "bg-white text-black" : "bg-white/10 text-white border border-white/10"
              }`}
            >
              <div className="whitespace-pre-wrap">{renderMessageContent(m.content)}</div>
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="text-xs text-white/40 font-mono px-3 py-2">...</div>
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="p-3 border-t border-white/10 flex gap-2">
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
          className="flex-1 h-10 text-sm font-mono bg-white/10 text-white border border-white/20 rounded-xl placeholder-white/40 px-4 focus:outline-none focus:ring-1 focus:ring-white/40 focus:border-white/40"
        />
        <button
          type="submit"
          disabled={isButtonDisabled}
          className="h-10 w-10 p-0 bg-white text-black rounded-xl hover:bg-white/90 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-transform"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
