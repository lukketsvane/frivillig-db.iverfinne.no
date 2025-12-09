import { QdrantClient } from "@qdrant/js-client-rest"
import { GoogleGenAI } from "@google/genai"
import type { UserProfile } from "@/lib/user-profile"

// Qdrant configuration
const QDRANT_HOST = process.env.QDRANT_HOST || "localhost"
const QDRANT_PORT = parseInt(process.env.QDRANT_PORT || "6333")
const COLLECTION_NAME = "frivillig_orgs"
const EMBEDDING_MODEL = "text-embedding-004"

// Initialize clients
let qdrantClient: QdrantClient | null = null
let googleAI: GoogleGenAI | null = null

function getQdrantClient(): QdrantClient {
  if (!qdrantClient) {
    qdrantClient = new QdrantClient({
      host: QDRANT_HOST,
      port: QDRANT_PORT,
    })
  }
  return qdrantClient
}

function getGoogleAI(): GoogleGenAI {
  if (!googleAI) {
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY environment variable is not set")
    }
    googleAI = new GoogleGenAI({ apiKey })
  }
  return googleAI
}

/**
 * Generate embedding for a query using Google's text-embedding-004 model
 * Note: Uses RETRIEVAL_QUERY task type for query embeddings, while ingestion
 * uses retrieval_document task type. This is intentional per Google's best practices
 * for asymmetric semantic search.
 */
async function embedQuery(query: string): Promise<number[]> {
  const ai = getGoogleAI()
  
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: query,
    config: {
      taskType: "RETRIEVAL_QUERY",
    },
  })
  
  if (!response.embeddings || response.embeddings.length === 0) {
    throw new Error("No embedding returned from Google AI")
  }
  
  return response.embeddings[0].values || []
}

/**
 * Result from Qdrant vector search
 */
export interface QdrantSearchResult {
  id: string
  navn: string
  kommune: string
  fylke: string
  beskrivelse: string
  aktivitet: string
  vedtektsfestet_formaal: string
  poststed: string
  postnummer: string
  hjemmeside: string
  telefon: string
  epost: string
  organisasjonsform: string
  naeringskode: string
  score: number
}

/**
 * Maps a Qdrant search result to the Organization interface used by the app
 */
export function mapQdrantResultToOrganization(result: QdrantSearchResult) {
  return {
    id: result.id,
    organisasjonsnummer: "",
    navn: result.navn,
    organisasjonsform_beskrivelse: result.organisasjonsform,
    naeringskode1_beskrivelse: result.naeringskode,
    aktivitet: result.aktivitet,
    vedtektsfestet_formaal: result.vedtektsfestet_formaal,
    forretningsadresse_poststed: result.poststed,
    forretningsadresse_kommune: result.kommune,
    forretningsadresse_adresse: null,
    forretningsadresse_postnummer: result.postnummer,
    postadresse_poststed: "",
    postadresse_postnummer: "",
    postadresse_adresse: "",
    hjemmeside: result.hjemmeside,
    epost: result.epost,
    telefon: result.telefon,
  }
}

/**
 * Build a rich query string combining user message with profile interests
 */
function buildSearchQuery(userMessage: string, userProfile: UserProfile | null): string {
  const parts: string[] = [userMessage]
  
  // Add top 3 interests from user profile for better semantic matching
  if (userProfile?.interests && userProfile.interests.length > 0) {
    const topInterests = userProfile.interests.slice(0, 3)
    parts.push(...topInterests)
  }
  
  return parts.filter(Boolean).join(" ")
}

/**
 * Search for organizations in Qdrant using vector similarity with user profile context
 * 
 * @param query - User's search query (will be embedded along with profile interests)
 * @param userProfile - User profile containing interests and location for filtering
 * @param limit - Maximum number of results (default: 15)
 * @returns Array of matching organizations sorted by relevance
 */
export async function searchOrganizationsVector(
  query: string,
  userProfile: UserProfile | null,
  limit: number = 15
): Promise<QdrantSearchResult[]> {
  try {
    const client = getQdrantClient()
    
    // Build enriched query with user interests
    const enrichedQuery = buildSearchQuery(query, userProfile)
    
    // Generate embedding for the query
    console.log("[Qdrant] Generating embedding for query:", enrichedQuery.substring(0, 80) + "...")
    const queryVector = await embedQuery(enrichedQuery)
    
    // Build Qdrant filter if user has location in profile
    let filter = undefined
    if (userProfile?.location_kommune) {
      const kommune = userProfile.location_kommune.toUpperCase().trim()
      console.log("[Qdrant] Applying kommune filter:", kommune)
      filter = {
        must: [
          {
            key: "kommune",
            match: {
              value: kommune,
            },
          },
        ],
      }
    }
    
    // Search Qdrant
    console.log("[Qdrant] Searching collection with limit:", limit)
    const searchResult = await client.search(COLLECTION_NAME, {
      vector: queryVector,
      limit: limit,
      filter: filter,
      with_payload: true,
    })
    
    console.log("[Qdrant] Found", searchResult.length, "results")
    
    // Map results to our interface
    const results: QdrantSearchResult[] = searchResult.map((point) => {
      const payload = point.payload as Record<string, unknown>
      return {
        id: String(payload.id || ""),
        navn: String(payload.navn || ""),
        kommune: String(payload.kommune || ""),
        fylke: String(payload.fylke || ""),
        beskrivelse: String(payload.beskrivelse || ""),
        aktivitet: String(payload.aktivitet || ""),
        vedtektsfestet_formaal: String(payload.vedtektsfestet_formaal || ""),
        poststed: String(payload.poststed || ""),
        postnummer: String(payload.postnummer || ""),
        hjemmeside: String(payload.hjemmeside || ""),
        telefon: String(payload.telefon || ""),
        epost: String(payload.epost || ""),
        organisasjonsform: String(payload.organisasjonsform || ""),
        naeringskode: String(payload.naeringskode || ""),
        score: point.score,
      }
    })
    
    return results
  } catch (error) {
    // Log specific error details to help with debugging
    if (error instanceof Error) {
      console.error("[Qdrant] Search error:", error.message)
      if (error.message.includes("ECONNREFUSED")) {
        console.error("[Qdrant] Connection refused - is Qdrant running on", QDRANT_HOST + ":" + QDRANT_PORT, "?")
      }
    } else {
      console.error("[Qdrant] Search error:", error)
    }
    // Return empty array on error to allow fallback behavior
    return []
  }
}

/**
 * Legacy search function for backward compatibility
 * @deprecated Use searchOrganizationsVector instead
 */
export async function searchVectors(
  query: string,
  location?: string,
  limit: number = 10
): Promise<QdrantSearchResult[]> {
  // Create a minimal profile with just location if provided
  const mockProfile: UserProfile | null = location ? {
    id: "",
    user_id: "",
    age_range: null,
    inferred_age: null,
    location_poststed: null,
    location_kommune: location,
    location_fylke: null,
    location_lat: null,
    location_lng: null,
    interests: [],
    skills: [],
    preferred_categories: [],
    life_stage: null,
    life_stage_guidance: null,
    conversation_count: 0,
    last_topics: [],
    created_at: "",
    updated_at: "",
  } : null
  
  return searchOrganizationsVector(query, mockProfile, limit)
}

/**
 * Check if Qdrant is available and collection exists
 */
export async function isQdrantAvailable(): Promise<boolean> {
  try {
    const client = getQdrantClient()
    const collections = await client.getCollections()
    return collections.collections.some((c) => c.name === COLLECTION_NAME)
  } catch (error) {
    console.error("[Qdrant] Connection check failed:", error)
    return false
  }
}
