import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"

export async function POST(req: Request) {
  let body: { title?: string; location?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { title, location } = body

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return Response.json({ error: "Title is required" }, { status: 400 })
  }

  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: z.object({
      title: z.string().describe("A clear, concise title for the volunteer request in Norwegian"),
      description: z
        .string()
        .describe("A friendly 2-3 sentence description in Norwegian explaining what help is needed"),
    }),
    prompt: `Du er en hjelpsom assistent for en frivilligsentral i Norge. 
    
Brukeren trenger hjelp med: "${title}"
${location ? `Sted: ${location}` : ""}

Lag en tydelig tittel og en vennlig beskrivelse på norsk for denne frivillig-forespørselen.
Beskrivelsen skal være konkret og inviterende, og forklare hva den frivillige skal gjøre.
Hold det kort og enkelt.`,
    output: "object",
  })

  return Response.json(object)
}
