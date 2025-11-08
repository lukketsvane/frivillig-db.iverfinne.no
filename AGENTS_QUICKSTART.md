# OpenAI Agents Integration - Quick Start

OpenAI Agents har no blitt integrert i Frivillig-DB! 🎉

## Kva er nytt?

Applikasjonen har no to chat-implementasjonar:

1. **Standard Chat** (`/`) - Vercel AI SDK med GPT-4
2. **Agents Chat** (`/chat-agents`) - OpenAI Agents SDK med GPT-5 og tools

## Kom i gang

### 1. Start utviklingsserveren

```bash
pnpm dev
```

### 2. Gå til Agents-chat

Opne nettlesaren og gå til:

```
http://localhost:3000/chat-agents
```

### 3. Test agenten

Prøv desse eksempla:

- "Finn turlag i Bergen"
- "Eg er pensjonist i Oslo og vil møte andre"
- "Musikk-organisasjonar for ungdom i Trondheim"

## Filar som blei lagt til

### Core Agent Implementation

- **`lib/agents/index.ts`** - Agent-definisjon med tools og schema
- **`lib/agents/workflow.ts`** - Standalone workflow-funksjon

### API

- **`app/api/chat-agents/route.ts`** - HTTP-endepunkt for agent-chat

### Frontend

- **`lib/hooks/use-agents-chat.ts`** - React hook for agents
- **`app/chat-agents/page.tsx`** - Demo-side for agents chat

### Dokumentasjon

- **`docs/OPENAI_AGENTS.md`** - Fullstendig dokumentasjon
- **`AGENTS_QUICKSTART.md`** - Denne fila

## Bruk i din eigen kode

### I React Components

```tsx
import { useAgentsChat } from "@/lib/hooks/use-agents-chat"

function MyComponent() {
  const { messages, sendMessage, organizations, isLoading } = useAgentsChat()

  return (
    <div>
      <button onClick={() => sendMessage("Finn organisasjonar")}>Send</button>
      {organizations.map((org) => (
        <div key={org.id}>{org.navn}</div>
      ))}
    </div>
  )
}
```

### I API Routes

```ts
import { runWorkflow } from "@/lib/agents/workflow"

export async function POST(req: Request) {
  const result = await runWorkflow({
    input_as_text: "Finn idrettslag i Oslo",
    userLocation: { kommune: "Oslo" },
  })

  return Response.json({
    message: result.output_text,
    organizations: result.output_parsed.organizations,
  })
}
```

### Direkte API-kall

```bash
curl -X POST http://localhost:3000/api/chat-agents \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Finn musikk-organisasjonar"}
    ],
    "userLocation": {
      "kommune": "Bergen",
      "fylke": "Vestland"
    }
  }'
```

## Samanlikning: Agents vs. Standard Chat

| Feature                      | Standard Chat | Agents Chat |
| ---------------------------- | ------------- | ----------- |
| Model                        | GPT-4.1       | GPT-5       |
| Streaming                    | ✅            | ❌          |
| Tool calling                 | Manual        | Automatic   |
| Reasoning                    | ❌            | ✅          |
| Structured output validation | ❌            | ✅          |
| Tracing                      | ❌            | ✅          |
| Kompleksitet                 | Låg           | Medium      |

## Korleis det fungerer

1. **Brukar sender melding** → Frontend (useAgentsChat)
2. **API mottek request** → `/api/chat-agents/route.ts`
3. **Agent aktiveres** → OpenAI Agents SDK
4. **Tool blir kalla** → `searchOrganizationsTool`
5. **Database-søk** → Vector search eller SQL
6. **Agent resonnerer** → GPT-5 med reasoning
7. **Strukturert output** → Validert med Zod
8. **Response returneres** → JSON til frontend

## Neste steg

- Les fullstendig dokumentasjon i `docs/OPENAI_AGENTS.md`
- Sjekk koden i `lib/agents/index.ts`
- Test API-et med curl eller Postman
- Utvid med fleire tools!

## Feilsøking

### Agent svarar ikkje

1. Sjekk at `OPENAI_API_KEY` er sett i `.env.local`
2. Sjå i terminal for `[Agents]` logs
3. Verifiser at Supabase-tilkoblinga fungerer

### Ingen organisasjonar i resultatet

1. Sjekk at `organizations_with_fylke` view har data
2. Verifiser vector store ID i `.env.local`
3. Prøv med enklare søk (t.d. "organisasjonar i Oslo")

### TypeScript errors

Køyr: `pnpm exec tsc --noEmit` for å sjekke errors.

---

**Happy coding! 🚀**

For meir hjelp, sjå `docs/OPENAI_AGENTS.md` eller kontakt teamet.
