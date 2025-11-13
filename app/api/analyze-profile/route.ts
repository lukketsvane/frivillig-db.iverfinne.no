import { generateText } from "ai"
import { searchOrganizations, createOrganizationCards } from "@/lib/organization-search"

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const files = formData.getAll("files") as File[]
    const message = formData.get("message") as string
    const locationStr = formData.get("location") as string
    const userLocation = locationStr ? JSON.parse(locationStr) : null

    console.log("[v0] Analyzing profile with", files.length, "files")

    const fileContents: string[] = []
    for (const file of files) {
      try {
        const fileName = file.name
        const fileType = file.type

        if (fileType.startsWith("text/") || fileName.endsWith(".txt")) {
          const text = await file.text()
          fileContents.push(`--- ${fileName} ---\n${text}\n`)
        } else if (fileType.startsWith("image/")) {
          // For images, include metadata
          fileContents.push(`[Bilde: ${fileName}, storleik: ${(file.size / 1024).toFixed(1)} KB]`)
        } else if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
          // For PDF, include metadata and note that content cannot be extracted
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

    // Step 1: Analyze profile with AI
    const analysisPrompt = `Du er ein ekspert på å analysere brukarinformasjon og lage frivilligprofilar.

Basert på desse vedlegga og meldinga frå brukaren, analyser personligheten, interessene, ferdigheitene og livssituasjonen deira:

Melding: ${message || "Ingen melding"}

Vedlegg:
${fileContents.join("\n\n")}

${fileContents.some((f) => f.includes("PDF-dokument")) ? "\nMerk: Brukaren har sendt inn PDF-dokument (sannsynlegvis CV). Sjølv om du ikkje kan lese innhaldet direkte, kan du anta at dette er ein profesjonell person som søkjer frivilligarbeid der dei kan bruke sin kompetanse. Analyser basert på dette og eventuell melding frå brukaren." : ""}

Lag ein detaljert brukarprofil som inkluderer:
1. **Alder/Livsfase**: Estimert aldersgruppe basert på innhald (eller typisk for nokon som sender CV)
2. **Interesser**: Kva er brukaren interessert i? (Om du ikkje veit, foreslå generelle kategoriar)
3. **Ferdigheiter**: Kva kompetanse eller erfaring har dei? (Om CV er sendt, anta profesjonell bakgrunn)
4. **Motivasjon**: Kvifor vil dei vere frivillig?
5. **Preferred områder**: Kva type frivilligarbeid passar dei best for?

Skriv profilen på nynorsk, ver spesifikk og konkret. Ver positiv og konstruktiv sjølv om du manglar detaljar.`

    const analysisResponse = await generateText({
      model: "openai/gpt-4o",
      prompt: analysisPrompt,
    })

    const profileAnalysis = analysisResponse.text

    console.log("[v0] Profile analysis:", profileAnalysis)

    // Step 2: Extract search keywords from profile
    const keywordPrompt = `Basert på denne brukarprofilen, gi meg ein kommaseparert liste med nøkkelord for å søke etter relevante frivilligorganisasjonar.

Profil:
${profileAnalysis}

Returner BERRE nøkkelord (maksimum 10), separert med komma. Ingen forklaringar. Eksempel: "helse, barn, miljø, kultur"`

    const keywordResponse = await generateText({
      model: "openai/gpt-4o",
      prompt: keywordPrompt,
    })

    const keywordsText = keywordResponse.text
    const interests = keywordsText
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0)
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

    const recommendationResponse = await generateText({
      model: "openai/gpt-4o",
      prompt: recommendationPrompt,
    })

    const recommendation = recommendationResponse.text

    return Response.json({
      profile: profileAnalysis,
      recommendation,
      organizations: createOrganizationCards(organizations),
    })
  } catch (error) {
    console.error("[v0] Error in analyze-profile:", error)
    return Response.json({ error: "Failed to analyze profile" }, { status: 500 })
  }
}
