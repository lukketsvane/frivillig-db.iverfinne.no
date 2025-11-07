import { createOpenAI } from "@ai-sdk/openai"
import { embed } from "ai"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const VECTOR_STORE_ID =
  process.env.OPENAI_VECTOR_STORE_ID || "vs_690e3c0be2cc8191a08b1f1c24a03069"

export interface VectorSearchResult {
  id: string
  score: number
  metadata?: any
}

/**
 * Søker i vector database med semantisk søk via OpenAI vector store
 */
export async function searchVectorStore(
  query: string,
  limit = 10,
): Promise<VectorSearchResult[]> {
  try {
    if (!query || query.trim().length < 2) {
      console.log("[v0] Query too short for vector search:", query)
      return []
    }

    if (!OPENAI_API_KEY) {
      console.warn("[v0] OPENAI_API_KEY manglar, hoppar over vector search")
      return []
    }

    const openai = createOpenAI({ apiKey: OPENAI_API_KEY })

    console.log("[v0] Generating embedding for query:", query.substring(0, 100))

    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-large"),
      value: query.trim(),
    })

    console.log("[v0] Embedding generated, querying vector store...")

    const vectorStoreId = VECTOR_STORE_ID

    const response = await fetch(
      `https://api.openai.com/v1/vector_stores/${vectorStoreId}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          embedding,
          limit,
          top_k: limit,
          return_metadata: true,
        }),
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(
        "[v0] Vector search failed:",
        response.status,
        errorText.substring(0, 200),
      )
      return []
    }

    const data = await response.json()
    const matches = data?.matches || data?.results || data?.data || []

    console.log("[v0] Vector search returned:", matches.length || 0, "matches")

    return matches.reduce((acc: VectorSearchResult[], match: any) => {
      const metadata = match.metadata || {}
      const identifier =
        metadata.organisasjonsnummer ?? metadata.id ?? match.id

      if (!identifier) {
        return acc
      }

      acc.push({
        id: String(identifier),
        score: match.score || match.similarity || 0,
        metadata,
      })

      return acc
    }, [])
  } catch (error: any) {
    console.error("[v0] Error searching vector store:", error.message || error)
    return []
  }
}

/**
 * Ekstraherer organisasjons-IDer frå vector search resultat
 */
export function extractOrganizationIds(results: VectorSearchResult[]): string[] {
  return results
    .map((r) => r.metadata?.organisasjonsnummer || r.metadata?.id || r.id)
    .filter((id) => id && typeof id === "string")
}
