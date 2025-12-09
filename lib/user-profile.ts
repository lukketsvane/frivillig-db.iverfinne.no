import { createClient } from "@/lib/supabase/server"
import { createClient as createBrowserClient } from "@/lib/supabase/client"

export interface UserProfile {
  id: string
  user_id: string
  age_range: string | null
  inferred_age: number | null
  location_poststed: string | null
  location_kommune: string | null
  location_fylke: string | null
  location_lat: number | null
  location_lng: number | null
  interests: string[]
  skills: string[]
  preferred_categories: string[]
  life_stage: string | null
  life_stage_guidance: string | null
  conversation_count: number
  last_topics: string[]
  created_at: string
  updated_at: string
}

export type AgeRange = "18-25" | "26-35" | "36-45" | "46-55" | "56-65" | "65+"

// Age inference from text
export function inferAgeFromText(text: string): { age: number | null; range: AgeRange | null } {
  const lowerText = text.toLowerCase()

  // Direct age mentions
  const ageMatch = text.match(/(\d{1,2})\s*år/i)
  if (ageMatch) {
    const age = parseInt(ageMatch[1])
    if (age >= 18 && age <= 100) {
      return { age, range: getAgeRange(age) }
    }
  }

  // Keywords that indicate age ranges
  if (lowerText.includes("pensjonist") || lowerText.includes("pensjonert")) {
    return { age: 67, range: "65+" }
  }
  if (lowerText.includes("student") || lowerText.includes("studerer")) {
    return { age: 22, range: "18-25" }
  }
  if (lowerText.includes("ung voksen") || lowerText.includes("nyutdanna")) {
    return { age: 26, range: "26-35" }
  }
  if (lowerText.includes("midtlivs") || lowerText.includes("etablert")) {
    return { age: 45, range: "36-45" }
  }
  if (lowerText.includes("erfaren") || lowerText.includes("senior")) {
    return { age: 55, range: "56-65" }
  }

  return { age: null, range: null }
}

export function getAgeRange(age: number): AgeRange {
  if (age < 26) return "18-25"
  if (age < 36) return "26-35"
  if (age < 46) return "36-45"
  if (age < 56) return "46-55"
  if (age < 66) return "56-65"
  return "65+"
}

// Extract interests from text
export function extractInterests(text: string): string[] {
  const lowerText = text.toLowerCase()
  const interests: string[] = []

  const interestMap: Record<string, string[]> = {
    "teknologi": ["it", "teknologi", "programmering", "data", "digital"],
    "helse": ["helse", "medisin", "omsorg", "pleie", "sykepleie"],
    "miljø": ["miljø", "natur", "klima", "bærekraft", "gjenvinning"],
    "kultur": ["kultur", "kunst", "museum", "teater", "dans"],
    "musikk": ["musikk", "instrument", "kor", "band", "konsert"],
    "idrett": ["idrett", "sport", "trening", "fotball", "ski"],
    "barn": ["barn", "ungdom", "skole", "leksehjelp", "mentor"],
    "eldre": ["eldre", "besøksvenn", "eldresenter", "alderdom"],
    "dyr": ["dyr", "dyrevern", "hund", "katt", "veterinær"],
    "mat": ["mat", "matsvinn", "matbank", "servering", "kokk"],
    "friluft": ["friluft", "tur", "fjell", "vandring", "natur"],
    "sosial": ["sosial", "ensomhet", "integrering", "inkludering"],
    "utdanning": ["utdanning", "undervisning", "kurs", "lærer"],
    "økonomi": ["økonomi", "regnskap", "budsjett", "finans"],
    "juss": ["juss", "juridisk", "rettigheter", "advokat"],
    "kommunikasjon": ["kommunikasjon", "pr", "markedsføring", "media"],
  }

  for (const [interest, keywords] of Object.entries(interestMap)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      interests.push(interest)
    }
  }

  return [...new Set(interests)]
}

// Extract skills from text
export function extractSkills(text: string): string[] {
  const lowerText = text.toLowerCase()
  const skills: string[] = []

  const skillPatterns = [
    { pattern: /erfaring\s+(?:med|i|innan|frå)\s+(\w+)/gi, extract: 1 },
    { pattern: /kompetanse\s+(?:i|innan)\s+(\w+)/gi, extract: 1 },
    { pattern: /bakgrunn\s+(?:i|frå)\s+(\w+)/gi, extract: 1 },
    { pattern: /jobba\s+(?:med|som)\s+(\w+)/gi, extract: 1 },
  ]

  for (const { pattern } of skillPatterns) {
    const matches = lowerText.matchAll(pattern)
    for (const match of matches) {
      if (match[1] && match[1].length > 2) {
        skills.push(match[1])
      }
    }
  }

  // Common skill keywords
  const skillKeywords = [
    "leiing", "administrasjon", "prosjektleiing", "rådgiving",
    "undervisning", "rettleiing", "coaching", "mentoring",
    "skriving", "kommunikasjon", "presentasjon",
    "organisering", "planlegging", "koordinering",
  ]

  for (const skill of skillKeywords) {
    if (lowerText.includes(skill)) {
      skills.push(skill)
    }
  }

  return [...new Set(skills)]
}

// Server-side: Get or create user profile
export async function getOrCreateUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = await createClient()

  // Try to get existing profile
  const { data: existing, error: fetchError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .single()

  if (existing) {
    return existing as UserProfile
  }

  // Create new profile if doesn't exist
  if (fetchError?.code === "PGRST116") {
    const { data: newProfile, error: insertError } = await supabase
      .from("user_profiles")
      .insert({ user_id: userId })
      .select()
      .single()

    if (insertError) {
      console.error("Error creating user profile:", insertError)
      return null
    }

    return newProfile as UserProfile
  }

  console.error("Error fetching user profile:", fetchError)
  return null
}

// Server-side: Update user profile with learned information
export async function updateUserProfileFromMessage(
  userId: string,
  message: string,
  location?: { poststed?: string; kommune?: string; fylke?: string; lat?: number; lng?: number }
): Promise<void> {
  const supabase = await createClient()

  // Get current profile
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .single()

  if (!profile) {
    // Create profile first
    await supabase.from("user_profiles").insert({ user_id: userId })
  }

  // Extract new information
  const { age, range } = inferAgeFromText(message)
  const newInterests = extractInterests(message)
  const newSkills = extractSkills(message)

  // Build update object
  const updates: Partial<UserProfile> = {
    conversation_count: (profile?.conversation_count || 0) + 1,
    updated_at: new Date().toISOString(),
  }

  // Update age if inferred
  if (age && !profile?.inferred_age) {
    updates.inferred_age = age
    updates.age_range = range
  }

  // Update location if provided
  if (location) {
    if (location.poststed) updates.location_poststed = location.poststed
    if (location.kommune) updates.location_kommune = location.kommune
    if (location.fylke) updates.location_fylke = location.fylke
    if (location.lat) updates.location_lat = location.lat
    if (location.lng) updates.location_lng = location.lng
  }

  // Merge interests
  if (newInterests.length > 0) {
    const existingInterests = profile?.interests || []
    updates.interests = [...new Set([...existingInterests, ...newInterests])].slice(0, 20)
  }

  // Merge skills
  if (newSkills.length > 0) {
    const existingSkills = profile?.skills || []
    updates.skills = [...new Set([...existingSkills, ...newSkills])].slice(0, 20)
  }

  // Update last topics (keep last 5)
  const topics = extractInterests(message)
  if (topics.length > 0) {
    const existingTopics = profile?.last_topics || []
    updates.last_topics = [...topics, ...existingTopics].slice(0, 5)
  }

  // Perform update
  await supabase
    .from("user_profiles")
    .update(updates)
    .eq("user_id", userId)
}

// Generate personalized example prompts based on user profile
export function generatePersonalizedPrompts(profile: UserProfile | null): string[] {
  if (!profile || profile.conversation_count < 2) {
    // Return default prompts for new users
    return []
  }

  const prompts: string[] = []
  const { interests, skills, age_range, location_kommune, location_fylke } = profile

  // Location-based prompts
  const location = location_kommune || location_fylke || ""
  if (location) {
    if (interests.includes("miljø")) {
      prompts.push(`Miljøorganisasjonar i ${location} eg kan bidra i?`)
    }
    if (interests.includes("barn")) {
      prompts.push(`Korleis kan eg hjelpe barn og unge i ${location}?`)
    }
    if (interests.includes("eldre")) {
      prompts.push(`Besøksvenntilbod for eldre i ${location}?`)
    }
    prompts.push(`Kva frivilligarbeid trengst i ${location} no?`)
  }

  // Interest-based prompts
  if (interests.includes("idrett")) {
    prompts.push("Korleis kan eg trene ungdomslag i nærområdet?")
  }
  if (interests.includes("teknologi")) {
    prompts.push("Organisasjonar der eg kan dele IT-kompetanse?")
  }
  if (interests.includes("kultur")) {
    prompts.push("Kulturorganisasjonar som treng frivillige?")
  }

  // Skill-based prompts
  if (skills.includes("leiing")) {
    prompts.push("Styreverv i frivillige organisasjonar?")
  }
  if (skills.includes("undervisning") || skills.includes("rettleiing")) {
    prompts.push("Mentorordningar for unge i arbeidslivet?")
  }

  // Age-based prompts
  if (age_range === "65+") {
    prompts.push("Frivilligarbeid som passar for pensjonistar?")
  }
  if (age_range === "18-25") {
    prompts.push("Korleis byggje nettverk gjennom frivilligarbeid?")
  }

  // Deduplicate and limit
  return [...new Set(prompts)].slice(0, 4)
}

// Client-side: Get user profile
export async function getClientUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .single()

  if (error) {
    console.error("Error fetching user profile:", error)
    return null
  }

  return data as UserProfile
}
