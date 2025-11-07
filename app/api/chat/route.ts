import { streamText, convertToCoreMessages } from "ai"
import { searchOrganizationsWithVector, createOrganizationCards } from "@/lib/organization-search"

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages, userLocation }: { messages: any[]; userLocation?: any } = await req.json()

  const coreMessages = convertToCoreMessages(messages)

  const latestUserMessage = messages.filter((m) => m.role === "user").pop()
  const userMessageText = latestUserMessage?.content || ""

  let foundOrganizations: any[] = []

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
    console.log("[v0] Found organizations (default):", foundOrganizations.length)
    console.log("[v0] Organization UUIDs:", foundOrganizations.map((o) => `${o.navn}: ${o.id}`).join(", "))
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
      console.log("[v0] Organization UUIDs:", foundOrganizations.map((o) => `${o.navn}: ${o.id}`).join(", "))

      if (organizations.length > 0) {
        organizationsContext = "\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        organizationsContext += "🎯 ORGANISASJONAR FRÅ DATABASEN (BRUK DESSE!):\n"
        organizationsContext += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        organizationsContext += `\n⚠️ VIKTIG: Desse ${organizations.length} organisasjonane er dei EINASTE som eksisterer i databasen no.\n`
        organizationsContext += "⚠️ Du MÅ BERRE bruke UUID-ar frå denne lista. Andre UUID-ar er hallusinering.\n\n"

        organizations.forEach((org, index) => {
          organizationsContext += `╔═══════════════════════════════════════════╗\n`
          organizationsContext += `║ ORGANISASJON ${index + 1}/${organizations.length}\n`
          organizationsContext += `╠═══════════════════════════════════════════╣\n`
          organizationsContext += `║ Namn: ${org.navn}\n`
          organizationsContext += `║ ✅ UUID: ${org.id}\n`
          organizationsContext += `║ ✅ URL: https://frivillig-db.iverfinne.no/organisasjon/${org.id}\n`
          organizationsContext += `║ ✅ Markdown: **[${org.navn}](https://frivillig-db.iverfinne.no/organisasjon/${org.id})**\n`
          if (org.aktivitet) {
            organizationsContext += `║ Aktivitet: ${org.aktivitet.substring(0, 100)}...\n`
          }
          if (org.vedtektsfestet_formaal) {
            organizationsContext += `║ Formål: ${org.vedtektsfestet_formaal.substring(0, 100)}...\n`
          }
          if (org.forretningsadresse_poststed) {
            organizationsContext += `║ Stad: ${org.forretningsadresse_poststed}`
            if (org.forretningsadresse_kommune) {
              organizationsContext += `, ${org.forretningsadresse_kommune}`
            }
            organizationsContext += `\n`
          }
          organizationsContext += `╚═══════════════════════════════════════════╝\n\n`
        })

        organizationsContext += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        organizationsContext += `📋 LISTE OVER GYLDIGE UUID-AR (BERRE DESSE FINST!):\n`
        organizationsContext += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        organizations.forEach((org, index) => {
          organizationsContext += `${index + 1}. ${org.id} → ${org.navn}\n`
        })
        organizationsContext += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        organizationsContext += `\n🚨 KUN ${organizations.length} ORGANISASJONAR FINST I DATABASEN NO!\n`
        organizationsContext += "🚨 ALLE ANDRE UUID-AR ER FEIL OG MÅ ALDRI BRUKAST!\n"
        organizationsContext += "🚨 OM DU BRUKAR ANDRE UUID-AR ER DET HALLUSINERING!\n"
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

═══════════════════════════════════════════════════════
🛑 ABSOLUTT KRAV - HALLUSINERING ER STRENGT FORBODE 🛑
═══════════════════════════════════════════════════════

GRUNNREGEL:
→ Alle organisasjonar med UUID og URL står i "LISTE OVER GYLDIGE UUID-AR" over
→ Om ein UUID IKKJE står i lista, FINST HO IKKJE i databasen
→ ALDRI finn på nye UUID-ar eller endre eksisterande UUID-ar
→ ALDRI nemn organisasjonar som ikkje står i lista over

VALIDERING FØR DU SKRIV:
1. ✅ Finn organisasjonen i lista "ORGANISASJONAR FRÅ DATABASEN" over
2. ✅ Kopier UUID NØYAKTIG frå "✅ UUID:" feltet (36 teikn)
3. ✅ Sjekk at UUID stemmer med "LISTE OVER GYLDIGE UUID-AR"
4. ✅ Bruk markdown: **[Namn](https://frivillig-db.iverfinne.no/organisasjon/UUID)**

DØME PÅ KORREKT BRUK:
- Finn "Natur og Ungdom" i lista over
- Les UUID: b409f77a-3e74-49f6-bd9a-9f135ecd7deb
- Skriv: **[Natur og Ungdom](https://frivillig-db.iverfinne.no/organisasjon/b409f77a-3e74-49f6-bd9a-9f135ecd7deb)**

TEIKN PÅ HALLUSINERING (ALDRI GJØR DETTE):
❌ Bruke UUID som ikkje står i "LISTE OVER GYLDIGE UUID-AR"
❌ Endre delar av ein UUID (t.d. bytte siste del)
❌ Finne på nye UUID-ar som liknar på eksisterande
❌ Nemne organisasjonar som ikkje er i lista

OM INGEN ORGANISASJONAR PASSAR:
→ Sei ærleg: "Eg fann ikkje nokon god match akkurat no."
→ Foreslå at brukaren omformulerer eller spesifiserer meir

═══════════════════════════════════════════════════════
🚨 LENKJEFORMAT (EKSAKT MATCH PÅKRAVD) 🚨
═══════════════════════════════════════════════════════

OBLIGATORISK FORMAT:
**[Organisasjonsnamn](https://frivillig-db.iverfinne.no/organisasjon/UUID)**

STEG-FOR-STEG:
1. Start med: **[
2. Skriv organisasjonsnamnet (må stemme med namnet i lista)
3. Skriv: ](
4. Skriv: https://frivillig-db.iverfinne.no/organisasjon/
5. Kopier UUID NØYAKTIG frå lista (36 teikn: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
6. Avslutt med: )**

ALDRI:
❌ Endre domenet (må vere frivillig-db.iverfinne.no)
❌ Mangla https://
❌ Bruke kortare UUID-format
❌ Bytte ut delar av UUID-en

═══════════════════════════════════════════════════════

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
