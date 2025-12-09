import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

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
