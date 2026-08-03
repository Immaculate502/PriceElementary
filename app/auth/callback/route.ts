import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

// Exchanges the Supabase OAuth ?code= for a session cookie, then sends the
// member into the app. Used by Google sign-in (and any email-link flow).
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

  const supabase = await getSupabaseServerClient()

  if (supabase && code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }

  if (supabase && tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "recovery" | "email" | "magiclink" | "invite",
      token_hash: tokenHash,
    })
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }

  // Expired or already-used link. Say so plainly rather than a bare error code.
  const reason = type === "recovery" || next === "/reset-password" ? "recovery" : "oauth"
  return NextResponse.redirect(`${origin}/login?error=${reason}`)
}
