import { consumeStream, convertToModelMessages, streamText, type UIMessage, tool } from "ai"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  const supabase = await createClient()

  const prompt = convertToModelMessages(messages)

  const result = streamText({
    model: "openai/gpt-4o-mini",
    system: `Du er en hjelpsom assistent som kan finne informasjon om frivillige organisasjoner i Norge. 
    Du snakker norsk og hjelper brukere med å finne organisasjoner basert på deres interesser, lokasjon eller aktiviteter.`,
    prompt,
    abortSignal: req.signal,
    tools: {
      searchOrganizations: tool({
        description: "Søk etter frivillige organisasjoner basert på navn, aktivitet eller lokasjon",
        inputSchema: z.object({
          searchTerm: z.string().describe("Søkeord for å finne organisasjoner"),
          limit: z.number().optional().describe("Antall resultater (standard 10)"),
        }),
        execute: async ({ searchTerm, limit = 10 }) => {
          const { data, error } = await supabase
            .from("organisasjonar")
            .select("id, navn, aktivitet, forretningsadresse_poststed, forretningsadresse_kommune, hjemmeside")
            .or(
              `navn.ilike.%${searchTerm}%,aktivitet.ilike.%${searchTerm}%,forretningsadresse_poststed.ilike.%${searchTerm}%`,
            )
            .eq("registrert_i_frivillighetsregisteret", true)
            .not("navn", "is", null)
            .limit(limit)

          if (error) {
            return { error: "Kunne ikke hente organisasjoner" }
          }

          return { organizations: data || [] }
        },
      }),
      getOrganizationDetails: tool({
        description: "Hent detaljert informasjon om en spesifikk organisasjon",
        inputSchema: z.object({
          organizationId: z.number().describe("ID-en til organisasjonen"),
        }),
        execute: async ({ organizationId }) => {
          const { data, error } = await supabase.from("organisasjonar").select("*").eq("id", organizationId).single()

          if (error) {
            return { error: "Kunne ikke hente organisasjonsdetaljer" }
          }

          return { organization: data }
        },
      }),
    },
  })

  return result.toUIMessageStreamResponse({
    onFinish: async ({ isAborted }) => {
      if (isAborted) {
        console.log("Chat avbrutt")
      }
    },
    consumeSseStream: consumeStream,
  })
}
