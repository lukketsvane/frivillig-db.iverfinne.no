// Authentication utility functions
import { createClient as createServerClient } from "@/lib/supabase/server"
import { redirect } from 'next/navigation'

/**
 * Gets the current authenticated user
 * Returns null if not authenticated
 */
export async function getUser() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }
  
  return user
}

/**
 * Requires authentication, redirects to login if not authenticated
 */
export async function requireAuth() {
  const user = await getUser()
  
  if (!user) {
    redirect("/auth/login")
  }
  
  return user
}

/**
 * Gets the user's profile from the profiles table
 */
export async function getUserProfile(userId: string) {
  const supabase = await createServerClient()
  
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single()
  
  if (error) {
    console.error("[v0] Error fetching user profile:", error)
    return null
  }
  
  return profile
}
