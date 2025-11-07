import { createClient } from "@supabase/supabase-js"

// Denne brukar ikkje cookies og er berre for lesing av offentleg data
export function createStaticClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}
