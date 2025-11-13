export interface BookmarkedOrganization {
  id: string
  navn: string
  aktivitet?: string
  poststed?: string
  kommune?: string
  addedAt: number
}

export function getBookmarks(): BookmarkedOrganization[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem("bookmarks")
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function isBookmarked(orgId: string): boolean {
  const bookmarks = getBookmarks()
  return bookmarks.some((bookmark) => bookmark.id === orgId)
}

export function toggleBookmark(org: BookmarkedOrganization): boolean {
  const bookmarks = getBookmarks()
  const index = bookmarks.findIndex((bookmark) => bookmark.id === org.id)

  if (index >= 0) {
    // Remove from bookmarks
    bookmarks.splice(index, 1)
    localStorage.setItem("bookmarks", JSON.stringify(bookmarks))
    return false
  } else {
    // Add to bookmarks
    bookmarks.unshift({ ...org, addedAt: Date.now() })
    localStorage.setItem("bookmarks", JSON.stringify(bookmarks))
    return true
  }
}
