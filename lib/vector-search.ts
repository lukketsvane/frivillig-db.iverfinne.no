const OPENAI_API_KEY = "vck_5GJE6iWRKwefpMlSNR8ObURjaSdP3iYB88aJZXNu5V4EN5jpqL4aVT1f"
const VECTOR_STORE_ID = "vs_690e060d898c8191bf544a5ee5ba4959"

export interface VectorSearchResult {
  id: string
  score: number
  metadata?: any
}

/**
 * Søker i vector database med semantisk søk via Vercel AI SDK
 * MIDLERTIDIG DEAKTIVERT: Vector store API returnerer ugyldig JSON
 */
export async function searchVectorStore(query: string, limit = 10): Promise<VectorSearchResult[]> {
  try {
    if (!query || query.trim().length < 2) {
      console.log("[v0] Query too short for vector search:", query)
      return []
    }

    // MIDLERTIDIG: Returner tomt array inntil vector store API er konfigurert
    console.log("[v0] Vector search midlertidig deaktivert, brukar SQL-søk")
    return []

    /* DEAKTIVERT INNTIL VIDARE
    console.log("[v0] Generating embedding for query:", query.substring(0, 100))

    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: query.trim(),
    })

    console.log("[v0] Embedding generated, querying vector store...")

    const vercelResponse = await fetch(`https://api.vercel.com/v1/vector-stores/${VECTOR_STORE_ID}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vector: embedding,
        top_k: limit,
        include_metadata: true,
      }),
    })

    if (vercelResponse.ok) {
      const data = await vercelResponse.json()
      console.log("[v0] Vector search returned:", data.results?.length || 0, "matches")

      return (
        data.results?.map((match: any) => ({
          id: match.id || match.metadata?.id,
          score: match.score || match.similarity,
          metadata: match.metadata,
        })) || []
      )
    }

    console.log("[v0] Trying alternative vector API format...")
    const altResponse = await fetch("https://api.openai.com/v1/vector_stores/query", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vector_store_id: VECTOR_STORE_ID,
        query_vector: embedding,
        top_k: limit,
      }),
    })

    if (!altResponse.ok) {
      const errorText = await altResponse.text()
      console.error("[v0] Vector search failed:", altResponse.status, errorText.substring(0, 200))
      return []
    }

    const altData = await altResponse.json()
    console.log("[v0] Vector search returned:", altData.matches?.length || altData.results?.length || 0, "matches")

    const results = altData.matches || altData.results || []
    return results.map((match: any) => ({
      id: match.id || match.metadata?.id,
      score: match.score || match.similarity || 0,
      metadata: match.metadata,
    }))
    */
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
    .filter((r) => r.metadata?.id || r.id)
    .map((r) => r.metadata?.id || r.id)
    .filter((id) => id && typeof id === "string")
}
