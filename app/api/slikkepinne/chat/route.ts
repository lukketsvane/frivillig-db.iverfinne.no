import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"

export const maxDuration = 30

interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

function isValidMessages(messages: unknown): messages is ChatMessage[] {
  if (!Array.isArray(messages)) return false
  return messages.every(
    (msg) =>
      typeof msg === "object" &&
      msg !== null &&
      typeof msg.role === "string" &&
      ["user", "assistant", "system"].includes(msg.role) &&
      typeof msg.content === "string" &&
      msg.content.length <= 10000
  )
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { messages } = body

    if (!isValidMessages(messages)) {
      return new Response(JSON.stringify({ error: "Invalid messages format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (messages.length > 50) {
      return new Response(JSON.stringify({ error: "Too many messages" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const result = streamText({
      model: openai("gpt-4o-mini"),
      messages,
      system: `Du er en hjelpsom assistent for frivilligjungel, en app som hjelper folk med å finne frivillige organisasjoner i Norge.

Du kan svare på spørsmål om frivillighet, organisasjoner, og hvordan folk kan engasjere seg.

Når brukere spør om spesifikke organisasjoner eller ønsker å søke:
- Forklar at de kan bruke søkefeltet på hovedsiden for å finne organisasjoner
- De kan søke basert på navn, sted, fylke eller formål
- Hver organisasjon har en detaljert side med kontaktinfo, adresse, og mer

Vær vennlig, oppmuntrende og informativ på norsk. Gi gode råd om frivillig arbeid og hvordan man kan engasjere seg.`,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error("Chat API error:", error)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
