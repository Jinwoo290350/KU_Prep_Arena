import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""

/** Browser-safe client (uses anon key, subject to RLS) */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/** Server-only admin client (uses service role key, bypasses RLS) */
export function createAdminClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
