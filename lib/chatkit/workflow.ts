import { tool, fileSearchTool, Agent, AgentInputItem, Runner, withTrace } from "@openai/agents"
import { z } from "zod"

// Tool definitions
const reportExternalOrgDatabase = tool({
  name: "reportExternalOrgDatabase",
  description: "Reports an external organization database containing 72,000 organizations to the administrators.",
  parameters: z.object({
    reporter_id: z.string(),
    database_provider: z.string(),
    organization_count: z.number().int(),
    details: z.string(),
  }),
  execute: async (input: {
    reporter_id: string
    database_provider: string
    organization_count: number
    details: string
  }) => {
    // TODO: Implement reporting functionality
    console.log("[reportExternalOrgDatabase] Received report:", input)
    return {
      success: true,
      message: "Report received successfully",
    }
  },
})

const fileSearch = fileSearchTool(["vs_690e060d898c8191bf544a5ee5ba4959"])

const MyAgentSchema = z.object({
  attachments: z.array(
    z.object({
      id: z.string(),
      message_id: z.string(),
      file_name: z.string(),
      file_type: z.string(),
      file_size: z.number(),
      file_url: z.string(),
      created_at: z.string(),
    })
  ),
  conversations: z.array(
    z.object({
      id: z.string(),
      user_id: z.string(),
      title: z.string(),
      created_at: z.string(),
      updated_at: z.string(),
    })
  ),
  messages: z.array(
    z.object({
      id: z.string(),
      conversation_id: z.string(),
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
      created_at: z.string(),
    })
  ),
  organizations: z.array(
    z.object({
      id: z.string(),
      organisasjonsnummer: z.string(),
      navn: z.string(),
      organisasjonsform_kode: z.string(),
      organisasjonsform_beskrivelse: z.string(),
      forretningsadresse_land: z.string(),
      forretningsadresse_landkode: z.string(),
      forretningsadresse_postnummer: z.string(),
      forretningsadresse_poststed: z.string(),
      forretningsadresse_adresse: z.array(z.string()),
      forretningsadresse_kommune: z.string(),
      forretningsadresse_kommunenummer: z.string(),
      postadresse_land: z.string(),
      postadresse_landkode: z.string(),
      postadresse_postnummer: z.string(),
      postadresse_poststed: z.string(),
      postadresse_adresse: z.array(z.string()),
      postadresse_kommune: z.string(),
      postadresse_kommunenummer: z.string(),
      telefon: z.string(),
      mobiltelefon: z.string(),
      epost: z.string(),
      hjemmeside: z.string(),
      naeringskode1_kode: z.string(),
      naeringskode1_beskrivelse: z.string(),
      naeringskode2_kode: z.string(),
      naeringskode2_beskrivelse: z.string(),
      naeringskode3_kode: z.string(),
      naeringskode3_beskrivelse: z.string(),
      vedtektsfestet_formaal: z.string(),
      aktivitet: z.string(),
      registreringsdato_enhetsregisteret: z.string(),
      stiftelsesdato: z.string(),
      registrert_i_mvaregisteret: z.boolean(),
      registrert_i_foretaksregisteret: z.boolean(),
      registrert_i_stiftelsesregisteret: z.boolean(),
      registrert_i_frivillighetsregisteret: z.boolean(),
      registreringsdato_frivillighetsregisteret: z.string(),
      antall_ansatte: z.string(),
      har_registrert_antall_ansatte: z.boolean(),
      siste_innsendte_aarsregnskap: z.string(),
      overordnet_enhet: z.string(),
      institusjonell_sektorkode_kode: z.string(),
      institusjonell_sektorkode_beskrivelse: z.string(),
      konkurs: z.boolean(),
      konkursdato: z.string(),
      under_avvikling: z.boolean(),
      under_avvikling_dato: z.string(),
      under_tvangsavvikling_eller_tvangsopplosning: z.boolean(),
      tvangsavviklet_pga_manglende_sletting_dato: z.string(),
      icnpo_kategorier: z.string(),
      kontonummer: z.string(),
      maalform: z.string(),
      registrert_i_partiregisteret: z.boolean(),
      paategninger: z.array(z.string()),
      er_i_konsern: z.boolean(),
      created_at: z.string(),
      updated_at: z.string(),
      synced_at: z.string(),
    })
  ),
})

const myAgent = new Agent({
  name: "My agent",
  instructions: `Du er ein hjelpsam assistent som hjelper brukarar med å finne frivilligorganisasjonar i Noreg via chat. Du skal alltid svare på nynorsk, kort og direkte, med maksimalt 3–4 setningar.

Du får:
- Tidlegare samtalekontekst (brukarmeldingar)
- Eventuell brukarstad (objekt med postnummer, kommune, fylke)
- Ei autoritativ liste over organisasjonar (kvar med namn og UUID). Berre desse, og ingen andre, er lov å foreslå. Dersom inga organisasjon i lista passar, skal du svare ærleg og be brukaren presisere eller endre spørsmålet.

# Oppgåve og viktige reglar

1. Analyser alltid brukarens behov (alder, interesser, stad) ut frå innmeldinga.
2. Foreslå relevante organisasjonar frå oppgitt liste, med presise markdown-lenkjer.
3. Gje konkrete anbefalingar om kva organisasjon(ar) som passar best.
4. Vær alltid støttande og oppmuntrande.
5. Svar berre ut frå oppgitt organisasjonsdata; aldri halusiner eller gjett.
6. Dersom ingen treff, svar: "Eg fann ikkje nokon god match akkurat no. Kan du presisere meir, eller prøve å stille spørsmålet på ein annan måte?"

# Strenge restriksjonar

- Du MÅ ALDRI nemne, referere til, endre eller finne på organisasjonar, UUID-ar eller URL-ar som ikkje er i lista.
- Organisasjonsnamn og UUID skal alltid kopierast nøyaktig frå lista (UUID: 36 teikn, formatert nøyaktig).
- Alle referansar MÅ bruke denne markdown-syntaksen:
  **[Organisasjonsnamn](https://frivillig-db.iverfinne.no/organisasjon/UUID)**
- Bruk alltid https://frivillig-db.iverfinne.no som domene. Aldri feil adresse eller syntaks.
- Du skal aldri endre, forkorte eller utelate noko frå namn eller UUID.
- ALDRI bruk grunngjevingar, steg eller intern resonnering i svaret – kun det validerte endelege svaret til brukaren.

# Svarlogikk (validering før du skriv svaret)

1. Gjer alltid ei intern vurdering av behova (alder, interesses, stad).
2. Sjekk om ein eller fleire organisasjonar frå oppgitt liste matchar.
3. Sjekk namn og UUID er kopiert nøyaktig som oppgitt.
4. Formater referansen strengt i oppgitt markdown-format.
5. Om ingen treff, bruk alltid refusjonssetninga og foreslå omformulering.

# OUTPUTFORMAT
- Kort svar, maks 3–4 setningar, på nynorsk.
- Bruk korrekt markdown-format for alle organisasjonar du nemner.
- INGEN kodeblokker, ekstra formatering eller forklaringar.
- Dersom ingen treff, berre bruk påkravd setning og føreslå omformulering.
- Svar ALDRI med grunngjeving eller resonnement – berre endeleg svar.

# Eksempel

## Eksempel 1 (med treff)
**Innspel:** "Student og likar naturen – har de grøne organisasjonar i Oslo?"

**Intern resonnering (IKKJE skriv dette til brukaren):**
- Oppfattar "student" (18–40 år), interesse for natur, opphaldsstad Oslo.
- I lista finst "Natur og Ungdom" (uuid: b409f77a-3e74-49f6-bd9a-9f135ecd7deb) i Oslo som passar.

**Svaret til brukaren:**
[Natur og Ungdom](https://frivillig-db.iverfinne.no/organisasjon/b409f77a-3e74-49f6-bd9a-9f135ecd7deb) er ein fin organisasjon for studentar som bryr seg om natur og miljø i Oslo.

## Eksempel 2 (ingen treff)
**Innspel:** "Eg ser etter organisasjon for eldre i Hemnes."

**Intern resonnering (IKKJE skriv dette til brukaren):**
- Oppfattar "eldre", stad Hemnes.
- Ingen relevante organisasjonar i Hemnes i lista.

**Svaret til brukaren:**
Eg fann ikkje nokon god match akkurat no. Kan du presisere meir, eller prøve å stille spørsmålet på ein annan måte?

## Eksempel 3 (fleire treff)
**Innspel:** "Eg vil gjerne bidra til barne- og familiearbeid i Bergen."

**Intern resonnering (IKKJE skriv dette til brukaren):**
- Oppfattar "barn/familie", stad Bergen.
- To relevante organisasjonar: "Familiehjelpa" (uuid: 12341234-5678-9abc-def1-234567890abc), "Barnas Tryggleik" (uuid: abcdef12-3456-7890-abcd-ef1234567890).

**Svaret til brukaren:**
I Bergen kan du til dømes engasjere deg i [Familiehjelpa](https://frivillig-db.iverfinne.no/organisasjon/12341234-5678-9abc-def1-234567890abc) eller [Barnas Tryggleik](https://frivillig-db.iverfinne.no/organisasjon/abcdef12-3456-7890-abcd-ef1234567890) som jobbar med born og familiar.

*(I praktisk bruk kan døma vere meir detaljerte der det trengst for å dekke komplekse val, men alltid: kun svar, aldri intern vurdering/grunngjeving til brukar.)*

# Påminning
- Du skal alltid gjennomføre full intern validering og grunngjeving før du svarer. Dette skal likevel aldri visast til brukaren.
- Du skal ALDRI nemne ein organisasjon, UUID eller lenke som ikkje er eksplisitt gjeven i lista.
- Svaret ditt skal ALLTID vere kort, korrekt formatert, utan forklaring eller stegvis resonnering.

Dersom du er i tvil, ver alltid på den sikre sida: aldri gje forslag som ikkje er dekka direkte av datalista di, og før berre det korte brukarrettede svaret ut til slutt.`,
  model: "gpt-5",
  tools: [reportExternalOrgDatabase, fileSearch],
  outputType: MyAgentSchema,
  modelSettings: {
    parallelToolCalls: true,
    reasoning: {
      effort: "medium",
      summary: "auto",
    },
    store: true,
  },
})

export type WorkflowInput = { input_as_text: string }

export const CHATKIT_WORKFLOW_ID = "wf_690e88d7d6188190bc9ff416f3cff7cc0f3789dee225966f"

// Main code entrypoint
export const runWorkflow = async (workflow: WorkflowInput) => {
  return await withTrace("New workflow", async () => {
    const state = {}
    const conversationHistory: AgentInputItem[] = [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: workflow.input_as_text,
          },
        ],
      },
    ]
    const runner = new Runner({
      traceMetadata: {
        __trace_source__: "agent-builder",
        workflow_id: CHATKIT_WORKFLOW_ID,
      },
    })
    const myAgentResultTemp = await runner.run(myAgent, [...conversationHistory])
    conversationHistory.push(...myAgentResultTemp.newItems.map((item) => item.rawItem))

    if (!myAgentResultTemp.finalOutput) {
      throw new Error("Agent result is undefined")
    }

    const myAgentResult = {
      output_text: JSON.stringify(myAgentResultTemp.finalOutput),
      output_parsed: myAgentResultTemp.finalOutput,
    }

    return myAgentResult
  })
}
