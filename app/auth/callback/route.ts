import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/config"

// Exchanges the Supabase OAuth ?code= (or recovery token_hash) for a session
// cookie, then sends the member into the app. Used by Google sign-in, the
// password-recovery link, and any email-link flow.
//
// The session cookies MUST be written onto the exact response we return. A
// route handler that returns a fresh NextResponse.redirect() does not inherit
// cookies set via next/headers cookies(), so we bind them to `response` here —
// otherwise a successful verify still lands the member on /login because the
// session never reached the browser.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  // Only allow same-site paths. A value like "//evil.com" is protocol-relative
  // and would otherwise turn this into an open redirect.
  const requested = searchParams.get("next") ?? "/"
  const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/"

  // Password-recovery and magic-link emails arrive as token_hash + type
  // instead of a PKCE code, so both shapes have to be handled here.
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type")

  const reason = type === "recovery" || next === "/reset-password" ? "recovery" : "oauth"

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(`${origin}/login?error=${reason}`)
  }

  // Response we will return on success. The Supabase client writes the refreshed
  // session cookies straight onto it via setAll below.
  const response = NextResponse.redirect(`${origin}${next}`)

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.headers
          .get("cookie")
          ?.split(";")
          .map((c) => {
            const [name, ...rest] = c.trim().split("=")
            return { name, value: rest.join("=") }
          })
          .filter((c) => c.name) ?? []
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        )
      },
    },
  })

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return response
    console.log("[v0] exchangeCodeForSession failed:", error.message)
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "recovery" | "email" | "magiclink" | "invite",
      token_hash: tokenHash,
    })
    if (!error) return response
    console.log("[v0] verifyOtp failed:", error.message)
  }

  // Expired or already-used link. Say so plainly rather than a bare error code.
  return NextResponse.redirect(`${origin}/login?error=${reason}`)
}
