import { embed } from "ai"
import { openai } from "@ai-sdk/openai"

const VECTOR_STORE_ID = "vs_690e060d898c8191bf544a5ee5ba4959"
const OPENAI_API_KEY = "vck_5GJE6iWRKwefpMlSNR8ObURjaSdP3iYB88aJZXNu5V4EN5jpqL4aVT1f"

export interface VectorSearchResult {
  id: string
  score: number
  content: string
}

/**
 * Søker i vector store basert på semantisk likskapt
 */
export async function searchVectorStore(query: string, limit = 5): Promise<VectorSearchResult[]> {
  try {
    if (!query || query.trim().length === 0) {
      console.log("[v0] Empty query, skipping vector search")
      return []
    }

    console.log("[v0] Vector search query:", query.substring(0, 100))

    // Generer embedding for søkjequery
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: query.trim(),
      apiKey: OPENAI_API_KEY,
    })

    console.log("[v0] Generated embedding, length:", embedding.length)

    // Søk i vector store
    const response = await fetch(`https://api.openai.com/v1/vector_stores/${VECTOR_STORE_ID}/file_search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query_embedding: embedding,
        limit: limit,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Vector store search failed:", response.status, errorText)
      return []
    }

    const data = await response.json()
    console.log("[v0] Vector store results:", data.results?.length || 0)

    return (
      data.results?.map((result: any) => ({
        id: result.id,
        score: result.score,
        content: result.content || result.text,
      })) || []
    )
  } catch (error: any) {
    console.error("[v0] Error searching vector store:", error.message || error)
    return []
  }
}

/**
 * Ekstraherer organisasjons-IDer frå vector store resultat
 */
export function extractOrganizationIds(results: VectorSearchResult[]): string[] {
  const ids: string[] = []

  for (const result of results) {
    // Prøv å finne UUID-mønster i innhaldet
    const uuidMatch = result.content.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
    if (uuidMatch) {
      ids.push(uuidMatch[0])
    }
  }

  return ids
}
