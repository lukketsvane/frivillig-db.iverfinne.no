import { createClient } from "@/lib/supabase/server"
import type { User } from "@supabase/supabase-js"

export interface AuthUser {
  id: string
  email: string | undefined
  user_metadata?: {
    full_name?: string
    avatar_url?: string
  }
}

export async function getUser(): Promise<AuthUser | null> {
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }
  
  return {
    id: user.id,
    email: user.email,
    user_metadata: user.user_metadata as AuthUser["user_metadata"],
  }
}

export async function getSession() {
  const supabase = await createClient()
  
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error || !session) {
    return null
  }
  
  return session
}

export function mapSupabaseUser(user: User | null): AuthUser | null {
  if (!user) return null
  
  return {
    id: user.id,
    email: user.email,
    user_metadata: user.user_metadata as AuthUser["user_metadata"],
  }
}
