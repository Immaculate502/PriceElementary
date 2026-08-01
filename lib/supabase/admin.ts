import { createClient } from "@supabase/supabase-js"
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, hasServiceRoleKey } from "./config"

/**
 * Privileged Supabase client used only for administrative auth tasks that the
 * anon key cannot perform (currently: confirming a new member's email so they
 * can sign in immediately).
 *
 * SERVER ONLY. This key bypasses Row Level Security, so it must never be
 * imported from a Client Component. It does not read or write cookies, so it
 * can never be mistaken for the signed-in user's session.
 */
export function getSupabaseAdminClient() {
  if (!hasServiceRoleKey()) return null

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
