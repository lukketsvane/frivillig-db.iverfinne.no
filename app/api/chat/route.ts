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
  let organizationList = "" // Legg til liste med gyldige organisasjonar

  try {
    const organizations = await searchOrganizations({
      location,
      limit: 500,
      userPostnummer: userLocation?.postnummer,
      userKommune: userLocation?.kommune,
      userFylke: userLocation?.fylke,
    })

    foundOrganizations = organizations
    console.log("[v0] Found organizations:", foundOrganizations.length)

    if (organizations.length > 0) {
      organizationList = "\n\n=== GYLDIGE ORGANISASJONAR (KUN DESSE FINST I DATABASEN) ===\n"
      organizations.forEach((org, index) => {
        organizationList += `${index + 1}. "${org.navn}" (ID: ${org.id})\n`
        organizationList += `   URL: https://frivillig-db.iverfinne.no/organisasjon/${org.id}\n`
      })
      organizationList += "=== SLUTT PÅ LISTE ===\n\n"

      organizationsContext = "\n\nRelevante frivilligorganisasjonar:\n"
      organizations.forEach((org) => {
        organizationsContext += formatOrganizationForChat(org)
      })
    }
  } catch (error) {
    console.error("[v0] Error fetching organizations:", error)
  }

  const systemPrompt = `Du er ein hjelpsam assistent som hjelper folk med å finne frivilligorganisasjonar i Noreg. 

Du kommuniserer på nynorsk og gir direkte, konkrete svar.

${stageGuidance ? `Livsfasevurdering: ${stageGuidance}` : ""}

${organizationList}

${organizationsContext ? `${organizationsContext}` : ""}

🚨 KRITISKE REGLAR - BRYT ALDRI DESSE:

1. Du KAN KUN nemne organisasjonar som er lista ovanfor i "GYLDIGE ORGANISASJONAR"
2. ALDRI finn på organisasjonsnamn eller ID-ar som ikkje er i lista
3. Når du nemner ein organisasjon, bruk markdown-lenkje med ID frå lista: [Organisasjonsnamn](https://frivillig-db.iverfinne.no/organisasjon/ID)
4. Om du ikkje finn relevante organisasjonar i lista, sei det ærleg: "Eg fann ingen perfekt match, men her er organisasjonar i området..."
5. ALDRI kopier/lim inn ID-ar feil - sjekk nøye at ID-en matcher organisasjonsnamnet

EKSEMPEL PÅ RIKTIG SVAR:
"Eg fann desse organisasjonane for deg:
- [137 Aktiv](https://frivillig-db.iverfinne.no/organisasjon/abc-123-xyz) er perfekt for turinteresserte
- [Oslo Turlag](https://frivillig-db.iverfinne.no/organisasjon/def-456-uvw) har turar kvar helg"

Ver kort og direkte (maksimum 3-4 setningar).`

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
