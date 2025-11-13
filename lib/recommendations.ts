import { getFavorites } from "./favorites"
import { getBookmarks } from "./bookmarks"
import type { VolunteerType } from "./quiz-data"
import { getSearchKeywordsForType } from "./quiz-data"

export interface UserProfile {
  quizResult?: {
    type: VolunteerType
    completedAt: number
  }
  interests: string[]
  preferredLocations: string[]
  preferredCategories: string[]
}

// Extract user profile from quiz results, favorites, and bookmarks
export function buildUserProfile(): UserProfile {
  const profile: UserProfile = {
    interests: [],
    preferredLocations: [],
    preferredCategories: [],
  }

  // Get quiz result
  try {
    const quizData = localStorage.getItem("quizResult")
    if (quizData) {
      profile.quizResult = JSON.parse(quizData)
      // Add quiz keywords as interests
      if (profile.quizResult) {
        const keywords = getSearchKeywordsForType(profile.quizResult.type)
        profile.interests.push(...keywords)
      }
    }
  } catch (e) {
    console.error("[v0] Error loading quiz result:", e)
  }

  // Extract preferences from favorites and bookmarks
  const favorites = getFavorites()
  const bookmarks = getBookmarks()
  const allSaved = [...favorites, ...bookmarks]

  allSaved.forEach((org) => {
    // Extract location preferences
    if (org.poststed) profile.preferredLocations.push(org.poststed)
    if (org.kommune) profile.preferredLocations.push(org.kommune)

    // Extract activity keywords from organization names and activities
    if (org.aktivitet) {
      const words = org.aktivitet
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
      profile.interests.push(...words)
    }

    // Extract keywords from organization name
    if (org.navn) {
      const nameWords = org.navn
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 4 && !["forening", "klubb", "norsk", "norge"].includes(w))
      profile.interests.push(...nameWords.slice(0, 3))
    }
  })

  // Deduplicate and normalize
  profile.interests = [...new Set(profile.interests.map((i) => i.toLowerCase()))]
  profile.preferredLocations = [...new Set(profile.preferredLocations)]

  return profile
}

// Generate search parameters based on user profile
export function generateRecommendationParams(profile: UserProfile): {
  keywords: string[]
  location?: string
} {
  // Prioritize quiz result keywords, then learned interests
  let keywords: string[] = []

  if (profile.quizResult) {
    keywords = getSearchKeywordsForType(profile.quizResult.type)
  }

  // Add learned interests (limit to top 10)
  const learnedInterests = profile.interests.filter((i) => !keywords.includes(i)).slice(0, 10)
  keywords.push(...learnedInterests)

  let topLocation: string | undefined

  // Try to get fylke from stored location first
  if (typeof window !== "undefined") {
    try {
      const storedLocation = localStorage.getItem("userLocation")
      if (storedLocation) {
        const location = JSON.parse(storedLocation)
        // Only use fylke, not kommune
        if (location.fylke) {
          topLocation = location.fylke
        }
      }
    } catch (e) {
      console.error("[v0] Error parsing stored location:", e)
    }
  }

  // If no fylke from location, try to extract fylke from preferred locations
  if (!topLocation && profile.preferredLocations.length > 0) {
    const locationCounts = profile.preferredLocations.reduce(
      (acc, loc) => {
        acc[loc] = (acc[loc] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
    topLocation = Object.entries(locationCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
  }

  return {
    keywords: keywords.slice(0, 15), // Limit to top 15 keywords
    location: topLocation,
  }
}

// Store quiz result
export function saveQuizResult(type: VolunteerType) {
  if (typeof window === "undefined") return

  const quizResult = {
    type,
    completedAt: Date.now(),
  }

  localStorage.setItem("quizResult", JSON.stringify(quizResult))
}

// Get quiz result
export function getQuizResult(): { type: VolunteerType; completedAt: number } | null {
  if (typeof window === "undefined") return null

  try {
    const stored = localStorage.getItem("quizResult")
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}
