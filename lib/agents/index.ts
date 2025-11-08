import { tool, Agent } from "@openai/agents"
import { z } from "zod"
import { searchOrganizationsWithVector, searchOrganizations, type Organization } from "@/lib/organization-search"

// Tool for searching organizations
const searchOrganizationsTool = tool({
  name: "searchOrganizations",
  description: "Søk etter frivillige organisasjonar i Noreg basert på brukarar sine interesser, stad og behov.",
  parameters: z.object({
    query: z.string().describe("Brukar sitt søk eller behov (t.d. 'fotball i Oslo', 'hjelpe eldre')"),
    userPostnummer: z.string().optional().describe("Brukar sitt postnummer for lokasjonsprioritet"),
    userKommune: z.string().optional().describe("Brukar sin kommune"),
    userFylke: z.string().optional().describe("Brukar sitt fylke"),
    limit: z.number().optional().default(5).describe("Maksimalt antal organisasjonar å returnere"),
  }),
  execute: async (input: {
    query: string
    userPostnummer?: string
    userKommune?: string
    userFylke?: string
    limit?: number
  }) => {
    console.log("[Agents] Searching organizations with:", input)

    try {
      // Try vector search first
      let organizations = await searchOrganizationsWithVector({
        query: input.query,
        limit: input.limit || 5,
        userPostnummer: input.userPostnummer,
        userKommune: input.userKommune,
        userFylke: input.userFylke,
      })

      // Fallback to regular search if vector search returns nothing
      if (organizations.length === 0) {
        organizations = await searchOrganizations({
          limit: input.limit || 5,
          userPostnummer: input.userPostnummer,
          userKommune: input.userKommune,
          userFylke: input.userFylke,
        })
      }

      console.log("[Agents] Found organizations:", organizations.length)

      // Format organizations for agent
      const formattedOrgs = organizations.map((org) => ({
        id: org.id,
        organisasjonsnummer: org.organisasjonsnummer,
        navn: org.navn,
        aktivitet: org.aktivitet?.substring(0, 200),
        vedtektsfestet_formaal: org.vedtektsfestet_formaal?.substring(0, 200),
        forretningsadresse_poststed: org.forretningsadresse_poststed,
        forretningsadresse_kommune: org.forretningsadresse_kommune,
        fylke: org.fylke,
        hjemmeside: org.hjemmeside,
        epost: org.epost,
        telefon: org.telefon,
      }))

      return {
        success: true,
        count: formattedOrgs.length,
        organizations: formattedOrgs,
      }
    } catch (error) {
      console.error("[Agents] Error searching organizations:", error)
      return {
        success: false,
        error: "Kunne ikkje søke i organisasjonar",
        organizations: [],
      }
    }
  },
})

// Output schema for agent response
export const AgentOutputSchema = z.object({
  organizations: z.array(
    z.object({
      id: z.string(),
      organisasjonsnummer: z.string(),
      navn: z.string(),
      aktivitet: z.string().optional(),
      vedtektsfestet_formaal: z.string().optional(),
      forretningsadresse_poststed: z.string().optional(),
      forretningsadresse_kommune: z.string().optional(),
      fylke: z.string().optional(),
      hjemmeside: z.string().optional(),
      epost: z.string().optional(),
      telefon: z.string().optional(),
    }),
  ),
})

// Create the volunteer organization agent
export const volunteerOrgAgent = new Agent({
  name: "Frivillig organisasjons-assistent",
  instructions: `Du er ein hjelpsam assistent som hjelper brukarar med å finne frivilligorganisasjonar i Noreg via chat. Du skal alltid svare på nynorsk, kort og direkte, med maksimalt 3–4 setningar.

# Viktige reglar

1. **Bruk searchOrganizations-verktøyet** for å finne relevante organisasjonar basert på brukar sitt behov.
2. **Analyser brukarar sine behov** - sjå etter alder, interesser, stad i meldinga.
3. **Foreslå BERRE organisasjonar** frå søkeresultatet - ALDRI finn på eller gjett organisasjonar.
4. **Bruk korrekt markdown-format** for lenker: **[Organisasjonsnamn](https://frivillig-db.iverfinne.no/organisasjon/ORGANISASJONSNUMMER)**
5. **Vær støttande og oppmuntrande** i svara dine.
6. **Dersom ingen treff**, sei: "Eg fann ikkje nokon god match akkurat no. Kan du presisere meir, eller prøve å stille spørsmålet på ein annan måte?"

# Arbeidsflyt

1. Les brukar si melding nøye
2. Identifiser: alder/målgruppe, interesser/aktivitetar, ønskt stad
3. Bruk searchOrganizations med relevant søketekst og lokasjon
4. Sjekk at resultata faktisk matcher det brukaren spurde om
5. Presenter 1-3 av dei mest relevante organisasjonane
6. Bruk korrekt markdown-format for alle lenker
7. Gi ein kort anbefaling om kvifor kvar organisasjon passar

# Lenkeformat

**ALLTID** bruk dette formatet for organisasjonslenkjer:
**[{org.navn}](https://frivillig-db.iverfinne.no/organisasjon/{org.organisasjonsnummer})**

Der {org.navn} og {org.organisasjonsnummer} kjem frå searchOrganizations-resultatet.

# Eksempel

Brukar: "Eg er student i Bergen og likar friluftsliv"

1. Bruk searchOrganizations med query="friluftsliv student Bergen", userKommune="Bergen"
2. Få tilbake t.d. "Bergen og Hordaland Turlag" (orgnr: 971277882)
3. Svar: "[Bergen og Hordaland Turlag](https://frivillig-db.iverfinne.no/organisasjon/971277882) er ein fin organisasjon for studentar som likar friluftsliv i Bergens-området. Dei arrangerer turar og aktivitetar året rundt."

# VIKTIG

- ALDRI nemn organisasjonar som ikkje er i søkeresultatet
- ALDRI gje ut feil organisasjonsnummer
- ALDRI finn på organisasjonar eller URL-ar
- ALLTID dobbeltsjekk at lenkeformatet er korrekt`,
  model: "gpt-5",
  tools: [searchOrganizationsTool],
  outputType: AgentOutputSchema,
  modelSettings: {
    parallelToolCalls: false, // Do searches sequentially for better results
    reasoning: {
      effort: "medium",
      summary: "auto",
    },
    store: true,
  },
})

export type AgentOutput = z.infer<typeof AgentOutputSchema>
