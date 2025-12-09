import { createClient } from "@/lib/supabase/client"

export interface BookmarkedOrganization {
  id: string
  navn: string
  aktivitet?: string
  poststed?: string
  kommune?: string
  addedAt: number
}

// Get bookmarks from localStorage (client-side only)
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
    // Also remove from Supabase if logged in
    removeBookmarkFromSupabase(org.id)
    return false
  } else {
    // Add to bookmarks
    bookmarks.unshift({ ...org, addedAt: Date.now() })
    localStorage.setItem("bookmarks", JSON.stringify(bookmarks))
    // Also add to Supabase if logged in
    addBookmarkToSupabase(org)
    return true
  }
}

// Supabase sync functions
async function addBookmarkToSupabase(org: BookmarkedOrganization) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return
    
    await supabase.from("bookmarks").upsert({
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
    console.error("[v0] Error syncing bookmark to Supabase:", error)
  }
}

async function removeBookmarkFromSupabase(orgId: string) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return
    
    await supabase.from("bookmarks")
      .delete()
      .eq("user_id", user.id)
      .eq("organization_id", orgId)
  } catch (error) {
    console.error("[v0] Error removing bookmark from Supabase:", error)
  }
}

// Sync bookmarks from Supabase to localStorage
export async function syncBookmarksFromSupabase(): Promise<void> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return
    
    const { data: cloudBookmarks, error } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", user.id)
    
    if (error) throw error
    
    if (cloudBookmarks && cloudBookmarks.length > 0) {
      const localBookmarks = getBookmarks()
      const mergedMap = new Map<string, BookmarkedOrganization>()
      
      // Add local bookmarks first
      localBookmarks.forEach(b => mergedMap.set(b.id, b))
      
      // Override/add cloud bookmarks
      cloudBookmarks.forEach(b => {
        mergedMap.set(b.organization_id, {
          id: b.organization_id,
          navn: b.organization_navn || "",
          aktivitet: b.organization_aktivitet,
          poststed: b.organization_poststed,
          kommune: b.organization_kommune,
          addedAt: new Date(b.created_at).getTime(),
        })
      })
      
      const merged = Array.from(mergedMap.values())
        .sort((a, b) => b.addedAt - a.addedAt)
      
      localStorage.setItem("bookmarks", JSON.stringify(merged))
      
      // Sync local-only bookmarks to cloud
      for (const local of localBookmarks) {
        if (!cloudBookmarks.find(c => c.organization_id === local.id)) {
          await addBookmarkToSupabase(local)
        }
      }
    }
  } catch (error) {
    console.error("[v0] Error syncing bookmarks from Supabase:", error)
  }
}
