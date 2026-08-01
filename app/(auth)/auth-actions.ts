"use server"

import { redirect } from "next/navigation"
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

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await getSupabaseServerClient()
    await supabase?.auth.signOut()
  }
  redirect("/login")
}
