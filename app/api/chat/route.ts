import { streamText, convertToCoreMessages } from "ai"
import { searchOrganizationsWithVector, createOrganizationCards } from "@/lib/organization-search"

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages, userLocation }: { messages: any[]; userLocation?: any } = await req.json()

  const coreMessages = convertToCoreMessages(messages)

  const latestUserMessage = messages.filter((m) => m.role === "user").pop()
  const userMessageText = latestUserMessage?.content || ""

  let foundOrganizations: any[] = []

  const validUUIDs = new Set<string>()

  if (!userMessageText || userMessageText.trim().length === 0) {
    console.log("[v0] Empty message, using default query")
    const organizations = await searchOrganizationsWithVector({
      query: "frivillig arbeid aktivitetar",
      limit: 5,
      userPostnummer: userLocation?.postnummer,
      userKommune: userLocation?.kommune,
      userFylke: userLocation?.fylke,
    })

    foundOrganizations = organizations
    organizations.forEach((org) => validUUIDs.add(org.id))
    console.log("[v0] Found organizations (default):", foundOrganizations.length)
    console.log("[v0] Valid UUIDs:", Array.from(validUUIDs).join(", "))
  } else {
    console.log("[v0] User message:", userMessageText.substring(0, 100))
  }

  console.log("[v0] User location:", userLocation)

  const identifyLifeStage = (text: string) => {
    const lowerText = text.toLowerCase()
    if (lowerText.includes("pensjonist") || lowerText.includes("eldre") || /\b[6-9]\d\b/.test(text)) {
      return "Integritet vs. fortviling (65+)"
    }
    if (lowerText.includes("barn") || lowerText.includes("familie") || /\b[3-6]\d\b/.test(text)) {
      return "Generativitet vs. stagnasjon (40-65)"
    }
    if (lowerText.includes("ungdom") || lowerText.includes("student") || /\b[1-2]\d\b/.test(text)) {
      return "Intimitet vs. isolasjon (18-40)"
    }
    return undefined
  }

  const lifeStage = identifyLifeStage(userMessageText)
  const stageGuidance = lifeStage ? `Vurdering: ${lifeStage}` : ""

  const locationMatch = userMessageText.match(/i\s+([A-ZÆØÅ][a-zæøå]+)/i)
  const location = locationMatch ? locationMatch[1] : undefined

  console.log("[v0] Detected location:", location)

  let organizationsContext = ""

  if (userMessageText && userMessageText.trim().length > 0) {
    try {
      const organizations = await searchOrganizationsWithVector({
        query: userMessageText.trim(),
        location,
        limit: 5,
        userPostnummer: userLocation?.postnummer,
        userKommune: userLocation?.kommune,
        userFylke: userLocation?.fylke,
      })

      foundOrganizations = organizations
      console.log("[v0] Found organizations:", foundOrganizations.length)
      console.log("[v0] Valid UUIDs:", Array.from(validUUIDs).join(", "))

      if (organizations.length > 0) {
        organizationsContext = "\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        organizationsContext += "🎯 ORGANISASJONAR FRÅ DATABASEN:\n"
        organizationsContext += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"

        organizations.forEach((org, index) => {
          validUUIDs.add(org.id)
          organizationsContext += `${index + 1}. **${org.navn}**\n`
          organizationsContext += `   UUID: ${org.id}\n`
          if (org.aktivitet) {
            organizationsContext += `   Aktivitet: ${org.aktivitet.substring(0, 150)}...\n`
          }
          if (org.forretningsadresse_poststed) {
            organizationsContext += `   Stad: ${org.forretningsadresse_poststed}\n`
          }
          organizationsContext += `\n`
        })

        organizationsContext += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        organizationsContext += `🚨 VIKTIG: Bruk UUID over til å lage hyperlenker.\n`
        organizationsContext += `🚨 Eksempel: **[${organizations[0].navn}](https://frivillig-db.iverfinne.no/organisasjon/${organizations[0].id})**\n`
        organizationsContext += "🚨 Organisasjonskort med lenkjer visast automatisk nedanfor.\n"
        organizationsContext += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
      }
    } catch (error) {
      console.error("[v0] Error fetching organizations:", error)
    }
  }

  const systemPrompt = `Du er ein hjelpsam assistent som hjelper folk med å finne frivilligorganisasjonar i Noreg.

Du kommuniserer på nynorsk og gir direkte, konkrete svar.

${stageGuidance ? `Livsfasevurdering: ${stageGuidance}` : ""}

${organizationsContext ? `${organizationsContext}` : ""}

⚠️ KRITISKE REGLAR FOR ORGANISASJONSLENKER ⚠️

NÅR du nemner ein organisasjon, MÅ du ALLTID bruke KLIKKBAR LENKE med dette EKSAKTE formatet:
**[Organisasjonsnamn](https://frivillig-db.iverfinne.no/organisasjon/{id})**

Der {id} er UUID-en frå organisasjonen (finn den i lista over).

✅ RIKTIG eksempel:
"Eg anbefaler **[Bergen Idrettslag](https://frivillig-db.iverfinne.no/organisasjon/b409f77a-3e74-49f6-bd9a-9f135ecd7deb)** fordi dei har gode ungdomstilbod."

❌ GALT (ALDRI gjer dette):
"Eg anbefaler **Bergen Idrettslag** fordi..." (utan lenke)
"Bergen Idrettslag (ID: b409f77a...)" (viser UUID)
"Bergen Idrettslag" (ikkje feitskrift, ikkje lenke)

VIKTIGE REGLAR:
1. ✅ ALLTID bruk klikkbar lenke når du nemner organisasjon: **[Namn](https://frivillig-db.iverfinne.no/organisasjon/{id})**
2. ✅ Bruk UUID frå 'id'-feltet (IKKJE slug)
3. ✅ Forklar kvifor det passar (2-3 setningar)
4. ❌ ALDRI vis UUID eller rå data til brukar
5. ❌ ALDRI nemn organisasjonar som ikkje står i lista
6. ❌ ALDRI nemn organisasjon utan klikkbar hyperlenke

Hugs: KVAR gong du nemner ein organisasjon = klikkbar lenke til https://frivillig-db.iverfinne.no/organisasjon/{id}

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
