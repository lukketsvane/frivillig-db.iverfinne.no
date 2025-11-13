import { generateText } from "ai"
import { searchOrganizations, createOrganizationCards } from "@/lib/organization-search"

export const maxDuration = 60

export async function POST(req: Request) {
  const formData = await req.FormData()
  const files = formData.getAll("files") as File[]
  const message = formData.get("message") as string
  const locationStr = formData.get("location") as string
  const userLocation = locationStr ? JSON.parse(locationStr) : null

  console.log("[v0] Analyzing profile with", files.length, "files")

  // Extract text from files
  const fileContents: string[] = []
  for (const file of files) {
    try {
      if (file.type.startsWith("text/") || file.name.endsWith(".txt")) {
        const text = await file.text()
        fileContents.push(`--- ${file.name} ---\n${text}\n`)
      } else if (file.type.startsWith("image/")) {
        fileContents.push(`[Bilde: ${file.name}]`)
      } else if (file.type === "application/pdf") {
        fileContents.push(`[PDF: ${file.name}]`)
      }
    } catch (error) {
      console.error("[v0] Error reading file:", error)
    }
  }

  // Step 1: Analyze profile with AI
  const analysisPrompt = `Du er ein ekspert på å analysere brukarinformasjon og lage frivilligprofilar.

Basert på desse vedlegga og meldinga frå brukaren, analyser personligheten, interessene, ferdigheitene og livssituasjonen deira:

Melding: ${message || "Ingen melding"}

Vedlegg:
${fileContents.join("\n\n")}

Lag ein detaljert brukarprofil som inkluderer:
1. **Alder/Livsfase**: Estimert aldersgruppe basert på innhald
2. **Interesser**: Kva er brukaren interessert i?
3. **Ferdigheiter**: Kva kompetanse eller erfaring har dei?
4. **Motivasjon**: Kvifor vil dei vere frivillig?
5. **Preferred områder**: Kva type frivilligarbeid passar dei best for?

Skriv profilen på nynorsk, ver spesifikk og konkret.`

  const { text: profileAnalysis } = await generateText({
    model: "anthropic/claude-sonnet-4.5",
    prompt: analysisPrompt,
    apiKey: "vck_5GJE6iWRKwefpMlSNR8ObURjaSdP3iYB88aJZXNu5V4EN5jpqL4aVT1f",
  })

  console.log("[v0] Profile analysis:", profileAnalysis)

  // Step 2: Extract search keywords from profile
  const keywordPrompt = `Basert på denne brukarprofilen, gi meg ein kommaseparert liste med nøkkelord for å søke etter relevante frivilligorganisasjonar.

Profil:
${profileAnalysis}

Returner BERRE nøkkelord (maksimum 10), separert med komma. Ingen forklaringar.`

  const { text: keywordsText } = await generateText({
    model: "anthropic/claude-sonnet-4.5",
    prompt: keywordPrompt,
    apiKey: "vck_5GJE6iWRKwefpMlSNR8ObURjaSdP3iYB88aJZXNu5V4EN5jpqL4aVT1f",
  })

  const interests = keywordsText.split(",").map((k) => k.trim())
  console.log("[v0] Extracted interests:", interests)

  // Step 3: Search for organizations
  const organizations = await searchOrganizations({
    interests,
    limit: 8,
    userPostnummer: userLocation?.postnummer,
    userKommune: userLocation?.kommune,
    userFylke: userLocation?.fylke,
    userLatitude: userLocation?.latitude,
    userLongitude: userLocation?.longitude,
  })

  console.log("[v0] Found", organizations.length, "organizations")

  // Step 4: Generate personalized recommendations
  const recommendationPrompt = `Du er ein hjelpsam assistent som gir personaliserte frivilliganbefalingar.

Brukarprofil:
${profileAnalysis}

Desse organisasjonane er relevante:
${organizations.map((org, i) => `${i + 1}. ${org.navn} (ID: ${org.id})\n   - ${org.aktivitet || "Ingen beskriving"}\n   - ${org.forretningsadresse_poststed || "Ukjend stad"}`).join("\n\n")}

Skriv ein kort, personleg anbefaling (3-4 setningar) som:
1. Oppsummerer kva brukaren ser ut til å søke
2. Forklarer kvifor desse organisasjonane passar dei
3. Oppmodar dei til å utforske meir

Skriv på nynorsk og ver entusiastisk men profesjonell. IKKJE nemn spesifikke organisasjonsnamn i teksten, berre generelle kategoriar.`

  const { text: recommendation } = await generateText({
    model: "anthropic/claude-sonnet-4.5",
    prompt: recommendationPrompt,
    apiKey: "vck_5GJE6iWRKwefpMlSNR8ObURjaSdP3iYB88aJZXNu5V4EN5jpqL4aVT1f",
  })

  return Response.json({
    profile: profileAnalysis,
    recommendation,
    organizations: createOrganizationCards(organizations),
  })
}
