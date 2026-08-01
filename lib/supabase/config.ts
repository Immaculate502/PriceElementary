// Central place to detect whether the Supabase integration is connected.
// When the env vars are absent, the app runs in demo mode with sample data
// so the preview still works. Connect Supabase to activate real persistence.

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  ''

// Server-only. Bypasses RLS, so this must never be imported into a Client
// Component or prefixed with NEXT_PUBLIC_.
export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? ''

export function isSupabaseConfigured() {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0
}

export function hasServiceRoleKey() {
  return SUPABASE_URL.length > 0 && SUPABASE_SERVICE_ROLE_KEY.length > 0
}
