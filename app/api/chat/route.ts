import { streamText, convertToCoreMessages } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { createOrganizationCards, searchOrganizationsWithVector, searchOrganizations } from "@/lib/organization-search"

export const maxDuration = 30

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set")
}

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(req: Request) {
  const { messages, userLocation }: { messages: any[]; userLocation?: any } = await req.json()

  const coreMessages = convertToCoreMessages(messages)

  const latestUserMessage = messages.filter((m) => m.role === "user").pop()
  const userMessageText = latestUserMessage?.content || ""

  let foundOrganizations: any[] = []

  const validOrgnr = new Set<string>()

  if (!userMessageText || userMessageText.trim().length === 0) {
    console.log("[v0] Empty message, using default query")
    let organizations = await searchOrganizationsWithVector({
      query: "frivillig arbeid aktivitetar",
      limit: 5,
      userPostnummer: userLocation?.postnummer,
      userKommune: userLocation?.kommune,
      userFylke: userLocation?.fylke,
    })

    if (organizations.length === 0) {
      organizations = await searchOrganizations({
        limit: 5,
        userPostnummer: userLocation?.postnummer,
        userKommune: userLocation?.kommune,
        userFylke: userLocation?.fylke,
      })
    }

    foundOrganizations = organizations
    organizations.forEach((org) => org.organisasjonsnummer && validOrgnr.add(org.organisasjonsnummer))
    console.log("[v0] Found organizations (default):", foundOrganizations.length)
    console.log("[v0] Valid Orgnr:", Array.from(validOrgnr).join(", "))
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
      let organizations = await searchOrganizationsWithVector({
        query: userMessageText.trim(),
        location,
        limit: 5,
        userPostnummer: userLocation?.postnummer,
        userKommune: userLocation?.kommune,
        userFylke: userLocation?.fylke,
      })

      if (organizations.length === 0) {
        organizations = await searchOrganizations({
          location,
          limit: 5,
          userPostnummer: userLocation?.postnummer,
          userKommune: userLocation?.kommune,
          userFylke: userLocation?.fylke,
        })
      }

      foundOrganizations = organizations
      console.log("[v0] Found organizations:", foundOrganizations.length)
      console.log("[v0] Valid Orgnr:", Array.from(validOrgnr).join(", "))

      if (organizations.length > 0) {
        organizationsContext = "\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        organizationsContext += "🎯 ORGANISASJONAR FRÅ DATABASEN:\n"
        organizationsContext += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"

        organizations.forEach((org, index) => {
          if (org.organisasjonsnummer) {
            validOrgnr.add(org.organisasjonsnummer)
            organizationsContext += `${index + 1}. **${org.navn}**\n`
            organizationsContext += `   Organisasjonsnummer: ${org.organisasjonsnummer}\n`
            if (org.aktivitet) {
              organizationsContext += `   Aktivitet: ${org.aktivitet.substring(0, 150)}...\n`
            }
            if (org.forretningsadresse_poststed) {
              organizationsContext += `   Stad: ${org.forretningsadresse_poststed}\n`
            }
            organizationsContext += `\n`
          }
        })

        organizationsContext += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        organizationsContext += `🚨 GYLDIGE ORGANISASJONSNUMMER (KOPIER DESSE EKSAKT):\n`
        organizationsContext += Array.from(validOrgnr).map(orgnr => `- ${orgnr}`).join('\n')
        organizationsContext += "\n\n"
        organizationsContext += `🚨 Du kan BERRE nemne organisasjonar frå lista over.\n`
        organizationsContext += `🚨 Bruk EKSAKT organisasjonsnummer frå lista når du lagar lenker.\n`
        organizationsContext += `🚨 Format: **[Namn frå lista](https://frivillig-db.iverfinne.no/organisasjon/{organisasjonsnummer})**\n`
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

🚨🚨🚨 ABSOLUTT KRITISKE REGLAR 🚨🚨🚨

1. Du kan BERRE nemne organisasjonar som står i "ORGANISASJONAR FRÅ DATABASEN" over.
2. ALDRI finn på organisasjonar. ALDRI nemn organisasjonar som ikkje er i lista.
3. Når du nemner ein organisasjon, KOPIER organisasjonsnummeret EKSAKT frå lista.
4. Bruk ALLTID dette formatet: **[Namn](https://frivillig-db.iverfinne.no/organisasjon/{EKSAKT_ORGANISASJONSNUMMER})**

RIKTIG eksempel (KOPIERT frå lista):
- Lista seier: "Bergen Idrettslag, Organisasjonsnummer: 971277882"
- Du skriv: **[Bergen Idrettslag](https://frivillig-db.iverfinne.no/organisasjon/971277882)**

GALT (ALDRI gjør dette):
❌ Nemne organisasjon som ikkje er i lista
❌ Finne på organisasjonsnummer
❌ Skrive organisasjon utan lenke
❌ Vise organisasjonsnummer direkte til brukar

Viss lista er tom eller brukar spør om noko som ikkje er i lista, sei: "Eg fann ingen organisasjonar som passar. Prøv eit anna søk."

Svar kort (2-3 setningar per organisasjon).`

  const result = streamText({
    model: openai("gpt-4.1"),
    messages: coreMessages,
    abortSignal: req.signal,
    system: systemPrompt,
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
