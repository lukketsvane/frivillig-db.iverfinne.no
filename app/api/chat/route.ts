import { streamText, convertToCoreMessages } from "ai"
import { google } from "@ai-sdk/google"
import { searchOrganizations, formatOrganizationForChat, createOrganizationCards } from "@/lib/organization-search"
import { identifyLifeStage, generateStageGuidance } from "@/lib/erikson-theory"
import { getUser } from "@/lib/auth"
import {
  getOrCreateUserProfile,
  updateUserProfileFromMessage,
  extractInterests,
  inferAgeFromText,
} from "@/lib/user-profile"

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages, userLocation }: { messages: any[]; userLocation?: any } = await req.json()

  const coreMessages = convertToCoreMessages(messages)

  const latestUserMessage = messages.filter((m) => m.role === "user").pop()
  const userMessageText = latestUserMessage?.content || ""

  console.log("[v0] User message:", userMessageText)
  console.log("[v0] User location:", userLocation)

  // Get authenticated user and their profile
  let userProfile = null
  let userId: string | null = null
  try {
    const user = await getUser()
    if (user) {
      userId = user.id
      userProfile = await getOrCreateUserProfile(user.id)

      // Update profile with new knowledge from this message
      await updateUserProfileFromMessage(user.id, userMessageText, userLocation)
    }
  } catch (error) {
    console.log("[v0] No authenticated user or profile error:", error)
  }

  // Build personalized context from profile
  let profileContext = ""
  if (userProfile) {
    const profileParts: string[] = []

    if (userProfile.age_range) {
      profileParts.push(`Brukaraldar: ${userProfile.age_range}`)
    }
    if (userProfile.location_kommune || userProfile.location_fylke) {
      profileParts.push(`Brukarstad: ${userProfile.location_kommune || userProfile.location_fylke}`)
    }
    if (userProfile.interests && userProfile.interests.length > 0) {
      profileParts.push(`Interesser: ${userProfile.interests.join(", ")}`)
    }
    if (userProfile.skills && userProfile.skills.length > 0) {
      profileParts.push(`Ferdigheiter: ${userProfile.skills.join(", ")}`)
    }
    if (userProfile.life_stage) {
      profileParts.push(`Livsfase: ${userProfile.life_stage}`)
    }

    if (profileParts.length > 0) {
      profileContext = `\n\n📊 BRUKARPROFIL (lært frå tidlegare samtalar):\n${profileParts.join("\n")}\n`
    }
  }

  // Identify life stage based on Erikson's theory
  const lifeStage = identifyLifeStage(userMessageText)
  const stageGuidance = lifeStage ? generateStageGuidance(lifeStage) : ""

  // Check for age in message and update if found
  const { age } = inferAgeFromText(userMessageText)

  const locationPatterns = [
    /i\s+([A-ZÆØÅ][a-zæøå]+(?:\s+og\s+[A-ZÆØÅ][a-zæøå]+)?)/i,
    /frå\s+([A-ZÆØÅ][a-zæøå]+)/i,
    /([A-ZÆØÅ][a-zæøå]+)-området/i,
  ]

  let location: string | undefined
  for (const pattern of locationPatterns) {
    const match = userMessageText.match(pattern)
    if (match) {
      location = match[1]
      break
    }
  }

  // Use profile location as fallback
  if (!location && userProfile?.location_kommune) {
    location = userProfile.location_kommune
  }

  // Extract interests from message + profile
  const messageInterests = extractInterests(userMessageText)
  const profileInterests = userProfile?.interests || []
  const allInterests = [...new Set([...messageInterests, ...profileInterests])]

  console.log("[v0] Detected location:", location)
  console.log("[v0] Detected interests:", allInterests)

  let organizationsContext = ""
  let foundOrganizations: any[] = []
  let organizationList = ""

  try {
    const organizations = await searchOrganizations({
      location,
      interests: allInterests.length > 0 ? allInterests : undefined,
      limit: 500,
      userPostnummer: userLocation?.postnummer || userProfile?.location_poststed,
      userKommune: userLocation?.kommune || userProfile?.location_kommune,
      userFylke: userLocation?.fylke || userProfile?.location_fylke,
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

${profileContext}

${stageGuidance ? `Livsfasevurdering: ${stageGuidance}` : ""}

${organizationList}

${organizationsContext ? `${organizationsContext}` : ""}

🚨 KRITISKE REGLAR - BRYT ALDRI DESSE:

1. Du KAN KUN nemne organisasjonar som er lista ovanfor i "GYLDIGE ORGANISASJONAR"
2. ALDRI finn på organisasjononsnamn eller ID-ar som ikkje er i lista
3. Når du nemner ein organisasjon, bruk markdown-lenkje med ID frå lista: [Organisasjonsnamn](https://frivillig-db.iverfinne.no/organisasjon/ID)
4. Om du ikkje finn relevante organisasjonar i lista, sei det ærleg: "Eg fann ingen perfekt match, men her er organisasjonar i området..."
5. ALDRI kopier/lim inn ID-ar feil - sjekk nøye at ID-en matcher organisasjonsnamnet

EKSEMPEL PÅ RIKTIG SVAR:
"Eg fann desse organisasjonane for deg:
- [137 Aktiv](https://frivillig-db.iverfinne.no/organisasjon/abc-123-xyz) er perfekt for turinteresserte
- [Oslo Turlag](https://frivillig-db.iverfinne.no/organisasjon/def-456-uvw) har turar kvar helg"

${userProfile ? `Hugs: Brukaren har vist interesse for ${userProfile.interests?.slice(0, 3).join(", ") || "frivilligarbeid generelt"}. Tilpass svaret ditt.` : ""}

Ver kort og direkte (maksimum 3-4 setningar).`

  // Use Gemini 2.0 Flash - the latest and fastest model
  const result = streamText({
    model: google("gemini-2.0-flash"),
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
