import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/config"

export async function proxy(request: NextRequest) {
  // In demo mode there is no session to refresh — pass everything through.
  if (!isSupabaseConfigured()) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  // Signed-out pages. /reset-password is deliberately NOT here: the recovery
  // link creates a session first, so treating it as an auth route would bounce
  // the member straight to the dashboard before they could set a password.
  const isAuthRoute =
    path === "/login" ||
    path === "/signup" ||
    path === "/forgot-password" ||
    // New members open a church invite link while signed out.
    path.startsWith("/join/")
  // The OAuth callback runs BEFORE a session exists, so it must stay reachable
  // while unauthenticated or Google sign-in would loop back to /login. Stripe
  // webhooks hit /api/ with no session, so those must pass through too. The
  // leadership sign-in (/admin/login) manages its own role-based redirects, so
  // it must stay reachable whether or not a session exists.
  const isPublicRoute =
    path.startsWith("/auth/") || path.startsWith("/api/") || path === "/admin/login"

  if (isPublicRoute) {
    return response
  }

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  // Skip auth for Next internals and static asset files (images + downloadable
  // docs like the testing manual PDF), so they don't get bounced to /login.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf|ico)$).*)",
  ],
}
