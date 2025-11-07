import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// Enkel Supabase-klient for statisk generering ved bygg-tid
// Brukar ikkje cookies, så fungerer i generateStaticParams()
export function createStaticClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}
