"use server"

import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"

export type AuthResult = { ok: boolean; message: string }

export async function signIn(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!email || !password) {
    return { ok: false, message: "Email and password are required." }
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: true,
      message: "Demo mode — signed in as the sample member. Connect Supabase for real accounts.",
    }
  }

  const supabase = await getSupabaseServerClient()
  if (!supabase) return { ok: false, message: "Auth unavailable." }

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { ok: false, message: error.message }

  redirect("/")
}

export async function signUp(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const name = String(formData.get("name") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!name || !email || !password) {
    return { ok: false, message: "Please fill in all fields." }
  }
  if (password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." }
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: true,
      message: "Demo mode — account creation is simulated. Connect Supabase to register members.",
    }
  }

  const supabase = await getSupabaseServerClient()
  if (!supabase) return { ok: false, message: "Auth unavailable." }

  // Create the member with the admin API rather than auth.signUp().
  //
  // signUp() always tries to send a confirmation email, and Supabase's built-in
  // mailer only delivers to addresses inside the project owner's org and allows
  // roughly two messages an hour. In a real congregation that means signups
  // fail outright with "email rate limit exceeded". createUser() with
  // email_confirm sends no mail at all, so members get in immediately.
  const admin = getSupabaseAdminClient()

  if (admin) {
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    })

    if (createError) {
      const alreadyExists =
        createError.status === 422 || /already|registered|exists/i.test(createError.message)
      return {
        ok: false,
        message: alreadyExists
          ? "That email is already registered. Please sign in instead."
          : createError.message,
      }
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) return { ok: true, message: "Account created. You can now sign in." }

    redirect("/")
  }

  // No service role key available — fall back to the standard flow.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  })
  if (error) return { ok: false, message: error.message }

  if (data.session) redirect("/")

  if (!data.user || data.user.identities?.length === 0) {
    return {
      ok: false,
      message: "That email is already registered. Please sign in instead.",
    }
  }

  return {
    ok: true,
    message: "Account created. Check your email to confirm, then sign in.",
  }
}

export async function requestPasswordReset(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim()

  if (!email) return { ok: false, message: "Enter your email address." }

  // Always answer the same way whether or not the address exists, so this page
  // can't be used to discover who is a member of the church.
  const generic =
    "If that email belongs to a member, a reset link is on its way. Check your inbox and spam folder."

  if (!isSupabaseConfigured()) {
    return { ok: true, message: "Demo mode — password resets need Supabase connected." }
  }

  const supabase = await getSupabaseServerClient()
  if (!supabase) return { ok: false, message: "Auth unavailable." }

  const requestHeaders = await headers()
  const origin =
    requestHeaders.get("origin") ??
    (requestHeaders.get("host") ? `https://${requestHeaders.get("host")}` : "")

  const base = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${origin}/auth/callback`

  // Built with the URL API so an existing query string on the configured
  // redirect URL is preserved rather than clobbered.
  let redirectTo: string | undefined
  try {
    const url = new URL(base)
    url.searchParams.set("next", "/reset-password")
    redirectTo = url.toString()
  } catch {
    redirectTo = undefined
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

  // Rate limiting is the one failure worth surfacing, otherwise a member could
  // sit waiting for an email that was never sent.
  if (error && /rate limit|too many/i.test(error.message)) {
    return {
      ok: false,
      message: "Too many reset attempts just now. Please wait a few minutes and try again.",
    }
  }

  return { ok: true, message: generic }
}

export async function updatePassword(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const password = String(formData.get("password") ?? "")
  const confirm = String(formData.get("confirmPassword") ?? "")

  if (!password || !confirm) return { ok: false, message: "Fill in both password fields." }
  if (password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." }
  }
  if (password !== confirm) return { ok: false, message: "Those passwords do not match." }

  if (!isSupabaseConfigured()) {
    return { ok: true, message: "Demo mode — password changes need Supabase connected." }
  }

  const supabase = await getSupabaseServerClient()
  if (!supabase) return { ok: false, message: "Auth unavailable." }

  // The recovery link already established a session, so this updates the
  // signed-in user. Without that session there is nothing to update.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      ok: false,
      message: "This reset link has expired. Request a new one to continue.",
    }
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { ok: false, message: error.message }

  redirect("/")
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await getSupabaseServerClient()
    await supabase?.auth.signOut()
  }
  redirect("/login")
}
