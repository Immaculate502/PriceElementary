import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config"

/**
 * Whether a Supabase OAuth provider is actually enabled on the project.
 *
 * Why this exists: `supabase.auth.signInWithOAuth()` does NOT pre-flight. It
 * builds the authorize URL and navigates the browser straight to it, so its
 * returned `error` is never populated for a disabled provider. The member
 * simply lands off-site on Supabase's raw JSON response:
 *
 *   {"code":400,"error_code":"validation_failed",
 *    "msg":"Unsupported provider: provider is not enabled"}
 *
 * ...with no styling and no way back. Probing server-side lets the UI hide or
 * disable the button instead of stranding people on that page.
 *
 * Runs server-side deliberately: the authorize endpoint is cross-origin, so a
 * browser fetch could not read the status reliably.
 */

type Probe = { enabled: boolean; checkedAt: number }

const CACHE_TTL_MS = 5 * 60 * 1000
const cache = new Map<string, Probe>()

export async function isOAuthProviderEnabled(provider: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  const cached = cache.get(provider)
  if (cached && Date.now() - cached.checkedAt < CACHE_TTL_MS) {
    return cached.enabled
  }

  let enabled: boolean
  try {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/authorize?provider=${encodeURIComponent(provider)}`,
      {
        // Don't follow through to Google — the status code is the whole answer.
        redirect: "manual",
        headers: { apikey: SUPABASE_ANON_KEY },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      },
    )
    // A configured provider answers with a redirect to the provider's consent
    // screen; a disabled one answers 400 validation_failed.
    enabled = res.status >= 300 && res.status < 400
  } catch {
    // Fail OPEN on a network/timeout blip. Hiding a genuinely working sign-in
    // button is worse than the rare dead-end this is protecting against, and a
    // disabled provider fails consistently rather than intermittently.
    enabled = true
  }

  cache.set(provider, { enabled, checkedAt: Date.now() })
  return enabled
}
