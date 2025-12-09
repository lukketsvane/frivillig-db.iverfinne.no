import { createClient } from "@/lib/supabase/client"

export interface FavoriteOrganization {
  id: string
  navn: string
  aktivitet?: string
  poststed?: string
  kommune?: string
  addedAt: number
}

// Get favorites from localStorage (client-side only)
export function getFavorites(): FavoriteOrganization[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem("favorites")
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function isFavorite(orgId: string): boolean {
  const favorites = getFavorites()
  return favorites.some((fav) => fav.id === orgId)
}

export function toggleFavorite(org: FavoriteOrganization): boolean {
  const favorites = getFavorites()
  const index = favorites.findIndex((fav) => fav.id === org.id)

  if (index >= 0) {
    // Remove from favorites
    favorites.splice(index, 1)
    localStorage.setItem("favorites", JSON.stringify(favorites))
    // Also remove from Supabase if logged in
    removeFavoriteFromSupabase(org.id)
    return false
  } else {
    // Add to favorites
    favorites.unshift({ ...org, addedAt: Date.now() })
    localStorage.setItem("favorites", JSON.stringify(favorites))
    // Also add to Supabase if logged in
    addFavoriteToSupabase(org)
    return true
  }
}

// Supabase sync functions
async function addFavoriteToSupabase(org: FavoriteOrganization) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return
    
    await supabase.from("favorites").upsert({
      user_id: user.id,
      organization_id: org.id,
      organization_navn: org.navn,
      organization_aktivitet: org.aktivitet,
      organization_poststed: org.poststed,
      organization_kommune: org.kommune,
    }, {
      onConflict: "user_id,organization_id"
    })
  } catch (error) {
    console.error("[v0] Error syncing favorite to Supabase:", error)
  }
}

async function removeFavoriteFromSupabase(orgId: string) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return
    
    await supabase.from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("organization_id", orgId)
  } catch (error) {
    console.error("[v0] Error removing favorite from Supabase:", error)
  }
}

// Sync favorites from Supabase to localStorage
export async function syncFavoritesFromSupabase(): Promise<void> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return
    
    const { data: cloudFavorites, error } = await supabase
      .from("favorites")
      .select("*")
      .eq("user_id", user.id)
    
    if (error) throw error
    
    if (cloudFavorites && cloudFavorites.length > 0) {
      const localFavorites = getFavorites()
      const mergedMap = new Map<string, FavoriteOrganization>()
      
      // Add local favorites first
      localFavorites.forEach(f => mergedMap.set(f.id, f))
      
      // Override/add cloud favorites
      cloudFavorites.forEach(f => {
        mergedMap.set(f.organization_id, {
          id: f.organization_id,
          navn: f.organization_navn || "",
          aktivitet: f.organization_aktivitet,
          poststed: f.organization_poststed,
          kommune: f.organization_kommune,
          addedAt: new Date(f.created_at).getTime(),
        })
      })
      
      const merged = Array.from(mergedMap.values())
        .sort((a, b) => b.addedAt - a.addedAt)
      
      localStorage.setItem("favorites", JSON.stringify(merged))
      
      // Sync local-only favorites to cloud
      for (const local of localFavorites) {
        if (!cloudFavorites.find(c => c.organization_id === local.id)) {
          await addFavoriteToSupabase(local)
        }
      }
    }
  } catch (error) {
    console.error("[v0] Error syncing favorites from Supabase:", error)
  }
}
