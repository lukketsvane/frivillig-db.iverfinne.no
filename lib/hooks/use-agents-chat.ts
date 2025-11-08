import { useState, useCallback } from "react"
import type { OrganizationCardData } from "@/lib/organization-search"

export interface Message {
  role: "user" | "assistant" | "system"
  content: string
  id?: string
}

export interface UserLocation {
  postnummer?: string
  kommune?: string
  fylke?: string
}

export interface AgentsChatResponse {
  success: boolean
  message: string
  organizations: OrganizationCardData[]
  conversationHistory?: any[]
  error?: string
}

export interface UseAgentsChatOptions {
  onResponse?: (response: AgentsChatResponse) => void
  onError?: (error: Error) => void
}

export function useAgentsChat(options?: UseAgentsChatOptions) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [organizations, setOrganizations] = useState<OrganizationCardData[]>([])

  const sendMessage = useCallback(
    async (content: string, userLocation?: UserLocation) => {
      setIsLoading(true)

      const newUserMessage: Message = {
        role: "user",
        content,
        id: `user-${Date.now()}`,
      }

      // Add user message to UI immediately
      setMessages((prev) => [...prev, newUserMessage])

      try {
        const response = await fetch("/api/chat-agents", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [...messages, newUserMessage],
            userLocation,
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data: AgentsChatResponse = await response.json()

        if (!data.success) {
          throw new Error(data.error || "Unknown error occurred")
        }

        // Add assistant message
        const assistantMessage: Message = {
          role: "assistant",
          content: data.message,
          id: `assistant-${Date.now()}`,
        }

        setMessages((prev) => [...prev, assistantMessage])
        setOrganizations(data.organizations || [])

        options?.onResponse?.(data)
      } catch (error) {
        console.error("[useAgentsChat] Error:", error)
        const errorMessage: Message = {
          role: "assistant",
          content: "Beklagar, det oppstod ein feil. Prøv igjen.",
          id: `error-${Date.now()}`,
        }
        setMessages((prev) => [...prev, errorMessage])
        options?.onError?.(error instanceof Error ? error : new Error(String(error)))
      } finally {
        setIsLoading(false)
      }
    },
    [messages, options],
  )

  const reset = useCallback(() => {
    setMessages([])
    setOrganizations([])
  }, [])

  return {
    messages,
    isLoading,
    organizations,
    sendMessage,
    reset,
  }
}
