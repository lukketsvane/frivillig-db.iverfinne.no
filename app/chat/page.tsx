"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Send, Bot, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  })

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="px-4 py-4 border-b lg:px-6">
        <div className="flex items-center justify-between mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold">Frivillighets-Chat</h1>
          <p className="text-sm text-muted-foreground">Powered by AI</p>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 mx-auto w-full max-w-4xl lg:px-6">
        <div className="flex flex-col gap-4 pb-32">
          {messages.length === 0 && (
            <Card className="p-8 text-center">
              <Bot className="mx-auto mb-4 w-12 h-12 text-muted-foreground" />
              <h2 className="mb-2 text-xl font-semibold">Velkommen til Frivillighets-Chat!</h2>
              <p className="text-muted-foreground">
                Spør meg om frivillige organisasjoner i Norge. Jeg kan hjelpe deg med å finne organisasjoner basert på
                interesser, lokasjon eller aktiviteter.
              </p>
            </Card>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex gap-3 max-w-[80%] ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  {message.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <Card className={`p-4 ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="m-0 whitespace-pre-wrap">{message.content}</p>
                  </div>
                </Card>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <Card className="p-4 bg-muted">
                  <div className="flex gap-1">
                    <div
                      className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>

      <div className="fixed right-0 bottom-0 left-0 px-4 py-4 border-t bg-background/80 backdrop-blur-sm lg:px-6">
        <form onSubmit={handleSubmit} className="flex gap-2 mx-auto max-w-4xl">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Spør om frivillige organisasjoner..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
            <span className="sr-only">Send melding</span>
          </Button>
        </form>
      </div>
    </div>
  )
}
