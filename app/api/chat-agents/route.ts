import { Runner, AgentInputItem, withTrace } from "@openai/agents"
import { volunteerOrgAgent, type AgentOutput } from "@/lib/agents"

export const maxDuration = 30

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set")
}

interface ChatRequest {
  messages: Array<{
    role: "user" | "assistant" | "system"
    content: string
  }>
  userLocation?: {
    postnummer?: string
    kommune?: string
    fylke?: string
  }
}

export async function POST(req: Request) {
  try {
    const body: ChatRequest = await req.json()
    const { messages, userLocation } = body

    console.log("[Agents API] Received request with", messages.length, "messages")
    console.log("[Agents API] User location:", userLocation)

    // Convert messages to agent format
    const conversationHistory: AgentInputItem[] = messages.map((msg) => ({
      role: msg.role,
      content: [
        {
          type: "input_text",
          text: msg.content,
        },
      ],
    }))

    // Add user location context if available
    if (userLocation && conversationHistory.length > 0) {
      const lastMessage = conversationHistory[conversationHistory.length - 1]
      if (lastMessage.role === "user" && lastMessage.content[0]) {
        const locationContext = []
        if (userLocation.kommune) locationContext.push(`Kommune: ${userLocation.kommune}`)
        if (userLocation.fylke) locationContext.push(`Fylke: ${userLocation.fylke}`)
        if (userLocation.postnummer) locationContext.push(`Postnummer: ${userLocation.postnummer}`)

        if (locationContext.length > 0) {
          lastMessage.content[0].text += `\n\n[Brukar sin lokasjon: ${locationContext.join(", ")}]`
        }
      }
    }

    // Run the agent with tracing
    const result = await withTrace("Volunteer Organization Chat", async () => {
      const runner = new Runner({
        traceMetadata: {
          __trace_source__: "frivillig-db-chat",
          user_location: userLocation,
        },
      })

      return await runner.run(volunteerOrgAgent, conversationHistory)
    })

    console.log("[Agents API] Agent completed with", result.newItems.length, "new items")

    // Extract the final response
    const assistantMessages = result.newItems.filter((item) => item.rawItem.role === "assistant")
    const lastAssistantMessage = assistantMessages[assistantMessages.length - 1]

    if (!lastAssistantMessage) {
      throw new Error("No assistant response generated")
    }

    // Extract text content from the assistant's response
    let responseText = ""
    if (lastAssistantMessage.rawItem.content) {
      for (const content of lastAssistantMessage.rawItem.content) {
        if (content.type === "output_text") {
          responseText += content.text
        }
      }
    }

    // Extract organizations from final output
    const organizations = result.finalOutput?.organizations || []

    console.log("[Agents API] Response text length:", responseText.length)
    console.log("[Agents API] Organizations found:", organizations.length)

    // Return response in a format compatible with the chat UI
    return new Response(
      JSON.stringify({
        success: true,
        message: responseText,
        organizations: organizations.map((org) => ({
          id: org.organisasjonsnummer || org.id,
          navn: org.navn,
          aktivitet: org.aktivitet,
          formaal: org.vedtektsfestet_formaal,
          poststed: org.forretningsadresse_poststed,
          kommune: org.forretningsadresse_kommune,
          hjemmeside: org.hjemmeside,
          telefon: org.telefon,
          epost: org.epost,
        })),
        conversationHistory: result.newItems.map((item) => item.rawItem),
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  } catch (error) {
    console.error("[Agents API] Error:", error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Ukjent feil oppstod",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  }
}
