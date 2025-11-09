import { streamText, convertToCoreMessages } from "ai"
import { searchOrganizations, formatOrganizationForChat, createOrganizationCards } from "@/lib/organization-search"
import { identifyLifeStage, generateStageGuidance } from "@/lib/erikson-theory"

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages, userLocation }: { messages: any[]; userLocation?: any } = await req.json()

  const coreMessages = convertToCoreMessages(messages)

  const latestUserMessage = messages.filter((m) => m.role === "user").pop()
  const userMessageText = latestUserMessage?.content || ""

  console.log("[v0] User message:", userMessageText)
  console.log("[v0] User location:", userLocation)

  // Identify life stage based on Erikson's theory
  const lifeStage = identifyLifeStage(userMessageText)
  const stageGuidance = lifeStage ? generateStageGuidance(lifeStage) : ""

  // Extract location from message
  const locationMatch = userMessageText.match(/i\s+([A-ZÆØÅ][a-zæøå]+)/i)
  const location = locationMatch ? locationMatch[1] : undefined

  console.log("[v0] Detected location:", location)

  // Search for organizations
  let organizationsContext = ""
  let foundOrganizations: any[] = []
  try {
    const maxOrganizations = 5
    const organizations = await searchOrganizations({
      location,
      limit: maxOrganizations,
      userPostnummer: userLocation?.postnummer,
      userKommune: userLocation?.kommune,
      userFylke: userLocation?.fylke,
    })

    foundOrganizations = organizations.slice(0, maxOrganizations)
    console.log("[v0] Found organizations:", organizations.length)

    if (foundOrganizations.length > 0) {
      organizationsContext = "\n\nRelevante frivilligorganisasjonar:\n"
      foundOrganizations.forEach((org) => {
        organizationsContext += formatOrganizationForChat(org)
      })
    }
  } catch (error) {
    console.error("[v0] Error fetching organizations:", error)
  }

  // Build enhanced system prompt
  const systemPrompt = `Du er ein hjelpsam assistent som hjelper folk med å finne frivilligorganisasjonar i Noreg. 

Du kommuniserer på nynorsk og gir direkte, konkrete svar.

${stageGuidance ? `Livsfasevurdering: ${stageGuidance}` : ""}

${organizationsContext ? `${organizationsContext}` : ""}

Oppgåva di:
1. Analyser brukarens behov basert på alder, interesser og stad
2. Presenter relevante organisasjonar frå databasen med hyperlenkjer
3. Gje konkrete forslag til kva organisasjonar som passar best
4. Ver støttande og oppmuntrande

VIKTIG: Når du nemner ein organisasjon, bruk alltid markdown-lenkjer slik:
[Organisasjonsnamn](https://frivillig-db.iverfinne.no/organisasjon/ORGANISASJONS_ID)

Eksempel: [137 Aktiv](https://frivillig-db.iverfinne.no/organisasjon/abc-123) er perfekt for deg!

Svar kort og direkte (maksimum 3-4 setningar).`

  const result = streamText({
    model: "anthropic/claude-sonnet-4.5",
    messages: coreMessages,
    abortSignal: req.signal,
    system: systemPrompt,
    apiKey: "vck_5GJE6iWRKwefpMlSNR8ObURjaSdP3iYB88aJZXNu5V4EN5jpqL4aVT1f",
  })

  const stream = result.toUIMessageStreamResponse({
    getErrorMessage: (error) => {
      console.error("[v0] Stream error:", error)
      return "Beklagar, det oppstod ein feil. Prøv igjen."
    },
  })

  if (foundOrganizations.length > 0) {
    const orgCards = createOrganizationCards(foundOrganizations)
    console.log("[v0] Sending organization cards:", orgCards.length)

    // Return response with organizations embedded in data
    return new Response(
      new ReadableStream({
        async start(controller) {
          const reader = stream.body?.getReader()
          if (!reader) {
            controller.close()
            return
          }

          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) {
                // Send organizations as data at the end
                const dataLine = `2:[${JSON.stringify({ organizations: orgCards })}]\n`
                controller.enqueue(new TextEncoder().encode(dataLine))
                controller.close()
                break
              }
              controller.enqueue(value)
            }
          } catch (error) {
            console.error("[v0] Stream processing error:", error)
            controller.error(error)
          }
        },
      }),
      {
        headers: stream.headers,
      },
    )
  }

  return stream
}
