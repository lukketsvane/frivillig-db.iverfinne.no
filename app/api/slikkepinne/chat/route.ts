import { GoogleGenAI, type GenerateContentConfig, ThinkingLevel } from "@google/genai"
import { getUser } from "@/lib/auth"
import {
  getOrCreateUserProfile,
  updateUserProfileFromMessage,
  inferAgeFromText,
  extractInterests,
} from "@/lib/user-profile"

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
    const { messages, userLocation } = body

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

    // Get authenticated user and their profile
    let userProfile = null
    let userId: string | null = null
    const latestUserMessage = messages.filter((m) => m.role === "user").pop()
    const userMessageText = latestUserMessage?.content || ""

    try {
      const user = await getUser()
      if (user) {
        userId = user.id
        userProfile = await getOrCreateUserProfile(user.id)

        // Update profile with new knowledge from this message
        await updateUserProfileFromMessage(user.id, userMessageText, userLocation)
      }
    } catch (error) {
      console.log("[Slikkepinne] No authenticated user or profile error:", error)
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

      if (profileParts.length > 0) {
        profileContext = `\n\n📊 BRUKARPROFIL:\n${profileParts.join("\n")}\n`
      }
    }

    // Infer age and location from message if not in profile
    const { age, range } = inferAgeFromText(userMessageText)
    const interests = extractInterests(userMessageText)

    let contextualInfo = ""
    if (age && !userProfile?.inferred_age) {
      contextualInfo += `\nBrukaren har nemnt dei er ${age} år.`
    }
    if (interests.length > 0) {
      contextualInfo += `\nBrukaren viser interesse for: ${interests.join(", ")}`
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured")
    }

    const ai = new GoogleGenAI({ apiKey })

    const tools = [
      {
        googleSearch: {},
      },
    ]

    const config: GenerateContentConfig = {
      thinkingConfig: {
        includeThoughts: true,
        thinkingLevel: ThinkingLevel.HIGH,
      },
      tools,
    }

    const model = "gemini-3-pro-preview"

    // Convert messages to Gemini format
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }))

    // Build system instruction
    const systemInstruction = `Du er ein hjelpsam assistent for frivilligjungel, ein app som hjelper folk med å finne frivillige organisasjonar i Noreg.

${profileContext}${contextualInfo}

VIKTIGE OPPGÅVER:
1. Hjelp brukaren med å finne frivilligarbeid som passar deira interesser og kompetanse
2. Spør om alder og stad om du ikkje har denne informasjonen (for å gi betre anbefalingar)
3. Gje personleg tilpassa råd basert på brukarprofilen
4. Ver vennleg, oppmuntrande og informativ på nynorsk

Når brukare spør om spesifikke organisasjonar eller ynskjer å søkje:
- Forklar at dei kan bruke søkefeltet på hovudsida for å finne organisasjonar
- Dei kan søkje basert på namn, stad, fylke eller formål
- Kvar organisasjon har ei detaljert side med kontaktinfo, adresse, og meir

Hugs å bruke informasjonen i brukarprofilen for å gi relevante og personlege svar.`

    // Add system instruction as first message
    const messagesWithSystem = [
      {
        role: "user",
        parts: [{ text: systemInstruction }],
      },
      {
        role: "model",
        parts: [{ text: "Eg forstår. Eg vil hjelpe brukarane med å finne frivilligarbeid tilpassa deira interesser og kompetanse, og byggje opp kunnskap om dei over tid." }],
      },
      ...contents,
    ]

    const response = await ai.models.generateContentStream({
      model,
      config,
      contents: messagesWithSystem,
    })

    // Create a custom stream that handles both thinking and text
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            // Check for thought parts in candidates
            if (chunk.candidates && chunk.candidates.length > 0) {
              const candidate = chunk.candidates[0]
              if (candidate.content && candidate.content.parts) {
                for (const part of candidate.content.parts) {
                  // Check if this part is a thought
                  if (part.thought && part.text) {
                    const thinkingData = {
                      type: "thinking",
                      content: part.text,
                    }
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(thinkingData)}\n\n`))
                  }
                  // Regular text content (non-thought)
                  else if (part.text && !part.thought) {
                    controller.enqueue(encoder.encode(part.text))
                  }
                }
              }
            }
          }
          controller.close()
        } catch (error) {
          console.error("[Slikkepinne] Stream error:", error)
          controller.error(error)
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("[Slikkepinne] Chat API error:", error)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
