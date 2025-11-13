export interface FavoriteOrganization {
  id: string
  navn: string
  aktivitet?: string
  poststed?: string
  kommune?: string
  addedAt: number
}

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
    return false
  } else {
    // Add to favorites
    favorites.unshift({ ...org, addedAt: Date.now() })
    localStorage.setItem("favorites", JSON.stringify(favorites))
    return true
  }
}
