"use client"

import type React from "react"

export const dynamic = "force-dynamic"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { MapPin, Sun, Moon, ArrowUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import Link from "next/link"

const exampleQueries = [
  "Eg er pensjonist i Oslo og vil møte andre. Kva finst?",
  "Eg har barn på 7 år som elskar naturen. Finn turlag for born!",
  "Vil verte frivillig i miljøorganisasjon i Hordaland",
  "Ungdom 16 år - kulturaktivitetar i Trondheim?",
]

export default function HomePage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  })
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border/40">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Frivillig-utforskar</h1>
              <p className="text-muted-foreground mt-1">Finn organisasjonar som passar for deg</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="lg" asChild>
                <Link href="/utforsk">Alle</Link>
              </Button>
              <Button variant="outline" size="icon">
                <MapPin className="h-5 w-5" />
              </Button>
              {mounted && (
                <Button variant="outline" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                  {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full">
            <h2 className="text-2xl font-medium text-center mb-4">Finn frivilligorganisasjonar</h2>
            <p className="text-muted-foreground text-center mb-8">Sei alder, interesser og stad</p>

            <div className="space-y-3 w-full">
              {exampleQueries.map((query, index) => (
                <button
                  key={index}
                  onClick={() => {
                    const syntheticEvent = {
                      preventDefault: () => {},
                    } as React.FormEvent<HTMLFormElement>
                    handleInputChange({
                      target: { value: query },
                    } as React.ChangeEvent<HTMLInputElement>)
                    setTimeout(() => handleSubmit(syntheticEvent), 0)
                  }}
                  className="w-full p-4 text-left rounded-lg border border-border/40 bg-card hover:bg-accent transition-colors"
                >
                  <p className="text-foreground">{query}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 max-w-3xl mx-auto w-full space-y-4 mb-8">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`rounded-lg p-4 ${
                  message.role === "user"
                    ? "bg-foreground text-background ml-auto max-w-[80%]"
                    : "bg-card border border-border/40"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            ))}
            {isLoading && (
              <div className="bg-card border border-border/40 rounded-lg p-4">
                <p className="text-muted-foreground">Søker...</p>
              </div>
            )}
          </div>
        )}

        <div className="max-w-3xl mx-auto w-full">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Skriv ei melding..."
              className="flex-1 px-4 py-3 rounded-lg border border-border/40 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" className="h-12 w-12" disabled={isLoading || !input?.trim()}>
              <ArrowUp className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </main>
    </div>
  )
}
