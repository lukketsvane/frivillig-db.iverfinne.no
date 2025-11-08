# OpenAI Agents Integration

Dette dokumentet forklarer korleis OpenAI Agents er integrert i Frivillig-DB-applikasjonen.

## Oversikt

OpenAI Agents SDK gir ein kraftig måte å bygge AI-agenter som kan bruke verktøy (tools) for å utføre oppgåver. I denne applikasjonen bruker vi Agents til å:

1. Søke i databasen med frivillige organisasjonar
2. Forstå brukarens behov og preferansar
3. Foreslå relevante organisasjonar basert på interesser, alder og plassering

## Arkitektur

### Komponentar

```
lib/agents/
├── index.ts          # Agent-definisjon med verktøy og schema
└── workflow.ts       # Workflow-funksjon for standalone bruk

app/api/chat-agents/
└── route.ts          # API-endepunkt for agent-chat

lib/hooks/
└── use-agents-chat.ts # React hook for frontend

app/chat-agents/
└── page.tsx          # Eksempelside som bruker agents
```

### Dataflyt

```
Brukar → Frontend (use-agents-chat) → API (/api/chat-agents) → Agent → Tools → Database → Response
```

## Hovudkomponentar

### 1. Agent Definition (`lib/agents/index.ts`)

Definerer agenten med:

- **Tools**: `searchOrganizationsTool` som søker i databasen
- **System Instructions**: Nynorsk instruksjonar for korleis agenten skal oppføre seg
- **Output Schema**: Zod-schema for strukturert output
- **Model Settings**: GPT-5 med reasoning

```typescript
export const volunteerOrgAgent = new Agent({
  name: "Frivillig organisasjons-assistent",
  instructions: "...",
  model: "gpt-5",
  tools: [searchOrganizationsTool],
  outputType: AgentOutputSchema,
  modelSettings: {
    reasoning: { effort: "medium" },
  },
})
```

### 2. API Route (`app/api/chat-agents/route.ts`)

Handterer HTTP-requests og kjører agenten:

- Mottar meldingar og brukar-lokasjon
- Konverterer til agent-format
- Kjører agenten med tracing
- Returnerer strukturert JSON-respons

```typescript
POST /api/chat-agents
Body: {
  messages: Message[],
  userLocation?: { postnummer, kommune, fylke }
}
Response: {
  success: boolean,
  message: string,
  organizations: OrganizationCardData[]
}
```

### 3. React Hook (`lib/hooks/use-agents-chat.ts`)

Gjer det enkelt å bruke agents i React-komponenter:

```typescript
const { messages, isLoading, organizations, sendMessage } = useAgentsChat({
  onResponse: (response) => console.log(response),
})

// Send melding
await sendMessage("Finn idrettslag i Oslo", {
  kommune: "Oslo",
  fylke: "Oslo",
})
```

### 4. Workflow (`lib/agents/workflow.ts`)

Standalone-funksjon for å kjøre agenten utanfor HTTP-kontekst:

```typescript
const result = await runWorkflow({
  input_as_text: "Finn musikk-organisasjonar i Bergen",
  userLocation: {
    kommune: "Bergen",
    fylke: "Vestland",
  },
})

console.log(result.output_text) // Agent sin tekstrespons
console.log(result.output_parsed) // Strukturert output
```

## Tools

### searchOrganizationsTool

Verktøyet som agenten bruker for å søke i databasen:

**Parameters:**

- `query` (required): Søketekst frå brukaren
- `userPostnummer` (optional): Brukar sitt postnummer
- `userKommune` (optional): Brukar sin kommune
- `userFylke` (optional): Brukar sitt fylke
- `limit` (optional): Maksimalt antal resultat (default: 5)

**Funksjonalitet:**

1. Prøver først vector search (semantisk søk med OpenAI embeddings)
2. Fallback til vanleg SQL-søk om vector search ikkje gir resultat
3. Prioriterer organisasjonar nær brukaren sin lokasjon
4. Returnerer strukturert data med organisasjonsinfo

## Bruk

### I Frontend (React)

```typescript
import { useAgentsChat } from "@/lib/hooks/use-agents-chat"

function ChatComponent() {
  const { messages, sendMessage, organizations } = useAgentsChat()

  const handleSend = async () => {
    await sendMessage("Finn turlag i Oslo")
  }

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.id}>{msg.content}</div>
      ))}
      {organizations.map((org) => (
        <OrganizationCard key={org.id} organization={org} />
      ))}
    </div>
  )
}
```

### I Server-side/API

```typescript
import { runWorkflow } from "@/lib/agents/workflow"

export async function GET() {
  const result = await runWorkflow({
    input_as_text: "Finn organisasjonar for eldre",
    userLocation: { fylke: "Oslo" },
  })

  return Response.json({
    message: result.output_text,
    organizations: result.output_parsed.organizations,
  })
}
```

### Direkte Agent-kjøring

```typescript
import { volunteerOrgAgent } from "@/lib/agents"
import { Runner } from "@openai/agents"

const runner = new Runner()
const result = await runner.run(volunteerOrgAgent, [
  {
    role: "user",
    content: [{ type: "input_text", text: "Finn idrettslag" }],
  },
])
```

## Konfigurasjon

### Environment Variables

Påkravd:

```env
OPENAI_API_KEY=sk-...
```

### Model Settings

Agenten bruker:

- **Model**: `gpt-5` (eller den nyaste tilgjengelege modellen)
- **Reasoning**: Medium effort med auto summary
- **Store**: `true` (lagrer samtaler for tracing)
- **Parallel Tool Calls**: `false` (sekvensielle søk for betre resultat)

## Testing

### Test API Endpoint

```bash
curl -X POST http://localhost:3000/api/chat-agents \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Finn turlag i Bergen"
      }
    ],
    "userLocation": {
      "kommune": "Bergen",
      "fylke": "Vestland"
    }
  }'
```

### Test Workflow

```typescript
import { runWorkflow } from "@/lib/agents/workflow"

const result = await runWorkflow({
  input_as_text: "Test søk",
})

console.log(result)
```

## Fordeler med Agents vs. Standard Chat

### OpenAI Agents (Agents SDK)

✅ Strukturert tool-bruk
✅ Built-in reasoning og tracing
✅ Streng output-validering med Zod
✅ Betre handtering av komplekse workflows
✅ Auto-tool-selection

### Standard Chat (Vercel AI SDK)

✅ Enklare implementasjon
✅ Streaming support out-of-box
✅ Mindre overhead
✅ Betre for enkel chat utan tools

## Feilsøking

### Agent returnerer ingen organisasjonar

- Sjekk at OPENAI_API_KEY er sett
- Verifiser at databasen har data i `organizations_with_fylke`
- Sjå i logs etter `[Agents]` prefix

### Tool fails to execute

- Sjekk Supabase-tilkopling
- Verifiser at vector store ID er korrekt
- Sjå etter errors i `/lib/organization-search.ts`

### Frontend får ingen respons

- Sjekk nettverkstabs for API-kall
- Verifiser at `/api/chat-agents` route fungerer
- Test med curl først

## Vidare Utvikling

Potensielle forbetringar:

1. **Fleire Tools**: Legg til tools for favoritter, påmelding, etc.
2. **Streaming**: Implementer streaming av agent-responsar
3. **Multi-turn conversations**: Lagre samtalehistorikk i database
4. **A/B testing**: Samanlikn agents vs. standard chat
5. **Custom reasoning**: Tune reasoning effort basert på query-kompleksitet

## Ressursar

- [OpenAI Agents SDK Docs](https://platform.openai.com/docs/agents)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Zod Documentation](https://zod.dev)
