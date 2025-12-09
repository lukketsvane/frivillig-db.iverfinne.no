import { generateText } from "ai"
import { google } from "@ai-sdk/google"
import { searchOrganizations, createOrganizationCards } from "@/lib/organization-search"

export const maxDuration = 60

// Helper to send SSE progress update - sends immediately
function sendProgress(
  controller: ReadableStreamDefaultController,
  step: string,
  progress: number,
  message: string,
  details?: string
) {
  const data = JSON.stringify({ type: "progress", step, progress, message, details, timestamp: Date.now() })
  controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`))
}

// Helper to send thinking indicator - shows AI is processing
function sendThinking(controller: ReadableStreamDefaultController, thought: string) {
  const data = JSON.stringify({ type: "thinking", thought, timestamp: Date.now() })
  controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`))
}

// Helper to send final result
function sendResult(controller: ReadableStreamDefaultController, result: any) {
  const data = JSON.stringify({ type: "result", ...result })
  controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`))
}

export async function POST(req: Request) {
  const acceptHeader = req.headers.get("accept")
  const isStreamRequest = acceptHeader?.includes("text/event-stream")

  try {
    const formData = await req.formData()
    const files = formData.getAll("files") as File[]
    const message = formData.get("message") as string
    const locationStr = formData.get("location") as string
    const userLocation = locationStr ? JSON.parse(locationStr) : null

    console.log("[v0] Analyzing profile with", files.length, "files")

    // Always use streaming for better UX
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Step 1: Instantly acknowledge and start reading
          sendProgress(controller, "start", 5, "Startar analyse...")
          sendThinking(controller, "Opnar vedlegg...")

          const fileContents: string[] = []
          for (const file of files) {
            sendThinking(controller, `Les ${file.name}...`)

            try {
              const fileName = file.name
              const fileType = file.type

              if (fileType.startsWith("text/") || fileName.endsWith(".txt")) {
                const text = await file.text()
                fileContents.push(`--- ${fileName} ---\n${text}\n`)
              } else if (fileType.startsWith("image/")) {
                fileContents.push(`[Bilde: ${fileName}, storleik: ${(file.size / 1024).toFixed(1)} KB]`)
              } else if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
                fileContents.push(
                  `[PDF-dokument: ${fileName}, storleik: ${(file.size / 1024).toFixed(1)} KB - Innhald kan ikkje lesast direkte, men brukaren har sannsynlegvis sendt CV eller liknande dokument]`,
                )
              } else {
                fileContents.push(`[Fil: ${fileName}, type: ${fileType}]`)
              }
            } catch (error) {
              console.error("[v0] Error reading file:", file.name, error)
              fileContents.push(`[Kunne ikkje lese fil: ${file.name}]`)
            }
          }

          sendProgress(controller, "reading", 15, "Vedlegg lese", `${files.length} fil(ar) lasta`)

          // Step 2: Profile analysis with Gemini
          sendProgress(controller, "analyzing", 20, "Analyserer profil...")
          sendThinking(controller, "Analyserer kompetanse og interesser...")

          const analysisPrompt = `Du er ein ekspert på å analysere brukarinformasjon og lage frivilligprofilar.

Basert på desse vedlegga og meldinga frå brukaren, analyser personligheten, interessene, ferdigheitene og livssituasjonen deira:

Melding: ${message || "Ingen melding"}

Vedlegg:
${fileContents.join("\n\n")}

${fileContents.some((f) => f.includes("PDF-dokument")) ? "\nMerk: Brukaren har sendt inn PDF-dokument (sannsynlegvis CV). Sjølv om du ikkje kan lese innhaldet direkte, kan du anta at dette er ein profesjonell person som søkjer frivilligarbeid der dei kan bruke sin kompetanse." : ""}

Lag ein kort brukarprofil som inkluderer:
1. **Alder/Livsfase**: Estimert aldersgruppe
2. **Interesser**: 3-5 hovudinteresser
3. **Ferdigheiter**: Relevante ferdigheiter
4. **Motivasjon**: Kva type frivilligarbeid passar

Skriv på nynorsk, ver kort og konkret (maks 150 ord).`

          sendThinking(controller, "Gemini analyserer...")

          const analysisResponse = await generateText({
            model: google("gemini-3.0-pro"),
            prompt: analysisPrompt,
          })

          const profileAnalysis = analysisResponse.text
          sendProgress(controller, "analyzing", 40, "Profil analysert", "Finn relevante interesser")

          // Step 3: Extract keywords
          sendProgress(controller, "extracting", 45, "Finn interesser...")
          sendThinking(controller, "Identifiserer nøkkelord...")

          const keywordPrompt = `Basert på denne brukarprofilen, gi meg ein kommaseparert liste med nøkkelord for å søke etter relevante frivilligorganisasjonar.

Profil:
${profileAnalysis}

Returner BERRE nøkkelord (maksimum 8), separert med komma. Ingen forklaringar.`

          const keywordResponse = await generateText({
            model: google("gemini-3.0-pro"),
            prompt: keywordPrompt,
          })

          const keywordsText = keywordResponse.text
          const interests = keywordsText
            .split(",")
            .map((k: string) => k.trim())
            .filter((k: string) => k.length > 0)

          sendProgress(controller, "extracting", 55, "Interesser identifisert", interests.slice(0, 4).join(", "))

          // Step 4: Search organizations
          sendProgress(controller, "searching", 60, "Søkjer organisasjonar...")
          sendThinking(controller, `Søkjer blant tusenvis av organisasjonar...`)

          const organizations = await searchOrganizations({
            interests,
            limit: 8,
            userPostnummer: userLocation?.postnummer,
            userKommune: userLocation?.kommune,
            userFylke: userLocation?.fylke,
            userLatitude: userLocation?.latitude,
            userLongitude: userLocation?.longitude,
          })

          sendProgress(
            controller,
            "searching",
            75,
            "Organisasjonar funne",
            `${organizations.length} relevante treff`
          )

          // Step 5: Generate recommendations
          sendProgress(controller, "recommending", 80, "Lagar anbefalingar...")
          sendThinking(controller, "Tilpassar anbefalingar til profilen...")

          const recommendationPrompt = `Du er ein hjelpsam assistent som gir personaliserte frivilliganbefalingar.

Brukarprofil:
${profileAnalysis}

Desse organisasjonane er relevante:
${organizations.map((org, i) => `${i + 1}. ${org.navn} - ${org.aktivitet || "Frivillig organisasjon"}`).join("\n")}

Skriv ein kort, personleg anbefaling (2-3 setningar) som:
1. Oppsummerer kva brukaren søkjer
2. Forklarer kvifor desse organisasjonane passar

Skriv på nynorsk og ver positiv men kortfatta.`

          const recommendationResponse = await generateText({
            model: google("gemini-3.0-pro"),
            prompt: recommendationPrompt,
          })

          const recommendation = recommendationResponse.text

          // Step 6: Complete
          sendProgress(controller, "complete", 100, "Ferdig!", "Anbefalingar klare")

          // Send final result
          sendResult(controller, {
            profile: profileAnalysis,
            recommendation,
            organizations: createOrganizationCards(organizations),
          })

          controller.close()
        } catch (error) {
          console.error("[v0] Stream error:", error)
          const errorData = JSON.stringify({ type: "error", error: "Analyse feila. Prøv igjen." })
          controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`))
          controller.close()
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
    console.error("[v0] Error in analyze-profile:", error)
    return Response.json({ error: "Failed to analyze profile" }, { status: 500 })
  }
}
