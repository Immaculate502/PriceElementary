"use server"

import { redirect } from "next/navigation"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { getChurchBySlug, churchIsEntitled } from "@/lib/tenant"

export type AuthResult = { ok: boolean; message: string }

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
}

/** Find a slug not yet taken, appending -2, -3, … when needed. */
async function uniqueSlug(admin: ReturnType<typeof getSupabaseAdminClient>, base: string) {
  const root = base || "church"
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`
    const { data } = await admin!.from("churches").select("id").eq("slug", candidate).maybeSingle()
    if (!data) return candidate
  }
  return `${root}-${Date.now()}`
}

/**
 * Register a brand-new church and its founding leader, then send them into
 * billing. The church starts in `incomplete` status and only becomes usable
 * once Stripe confirms the subscription (handled by the webhook).
 */
export async function createChurchAndAdmin(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const churchName = String(formData.get("churchName") ?? "").trim()
  const name = String(formData.get("name") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!churchName || !name || !email || !password) {
    return { ok: false, message: "Please fill in all fields." }
  }
  if (password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." }
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Connect Supabase to register a church." }
  }

  const admin = getSupabaseAdminClient()
  if (!admin) {
    return { ok: false, message: "Server is missing its service-role key. Add SUPABASE_SERVICE_ROLE_KEY." }
  }

  const slug = await uniqueSlug(admin, slugify(churchName))

  const { data: church, error: churchError } = await admin
    .from("churches")
    .insert({
      name: churchName,
      slug,
      contact_email: email,
      subscription_status: "incomplete",
    })
    .select("id")
    .single()

  if (churchError || !church) {
    return { ok: false, message: churchError?.message ?? "Could not create the church." }
  }

  // The signup trigger makes this user the founding admin because the church
  // has no members yet and role='admin' is requested.
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, church_id: church.id, role: "admin" },
  })

  if (createError) {
    // Roll back the empty church so the slug/name can be reused.
    await admin.from("churches").delete().eq("id", church.id)
    const exists = createError.status === 422 || /already|registered|exists/i.test(createError.message)
    return {
      ok: false,
      message: exists
        ? "That email is already registered. Sign in instead."
        : createError.message,
    }
  }

  const supabase = await getSupabaseServerClient()
  if (supabase) {
    await supabase.auth.signInWithPassword({ email, password })
  }

  redirect("/billing")
}

/** Accepts a bare slug or a full invite URL like https://site/join/grace-church. */
function parseInviteSlug(input: string): string {
  const trimmed = input.trim()
  const match = trimmed.match(/\/join\/([^/?#]+)/i)
  const raw = match ? match[1] : trimmed
  return decodeURIComponent(raw).toLowerCase().replace(/[^a-z0-9-]/g, "")
}

/**
 * Attach an already signed-in member who has no church to the church behind
 * an invite link. Only ever fills an empty church_id, never moves a member
 * between churches, and never touches their role.
 */
export async function linkToChurchByInvite(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const slug = parseInviteSlug(String(formData.get("invite") ?? ""))
  if (!slug) return { ok: false, message: "Paste the invite link your church leader shared." }
  if (!isSupabaseConfigured()) return { ok: false, message: "Connect Supabase to join a church." }

  const supabase = await getSupabaseServerClient()
  const admin = getSupabaseAdminClient()
  if (!supabase || !admin) return { ok: false, message: "Server is not fully configured." }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: "Please sign in again." }

  const church = await getChurchBySlug(slug)
  if (!church) return { ok: false, message: "That invite link doesn't match any church." }
  if (!churchIsEntitled(church)) {
    return { ok: false, message: "This church's account is not active yet. Please check with your leader." }
  }

  const { data: updated, error } = await admin
    .from("profiles")
    .update({ church_id: church.id })
    .eq("id", user.id)
    .is("church_id", null)
    .select("id")

  if (error) return { ok: false, message: "Could not join that church. Please try again." }
  if (!updated || updated.length === 0) {
    return { ok: false, message: "Your account is already linked to a church." }
  }

  redirect("/")
}

/**
 * Join an existing church as a member. Only allowed when the church has an
 * active subscription, so members can't pile into a church that hasn't paid.
 */
export async function joinChurch(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const slug = String(formData.get("slug") ?? "").trim()
  const name = String(formData.get("name") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!slug) return { ok: false, message: "Missing church invite link." }
  if (!name || !email || !password) {
    return { ok: false, message: "Please fill in all fields." }
  }
  if (password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." }
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Connect Supabase to join a church." }
  }

  const church = await getChurchBySlug(slug)
  if (!church) return { ok: false, message: "That church could not be found." }
  if (!churchIsEntitled(church)) {
    return { ok: false, message: "This church's account is not active yet. Please check with your leader." }
  }

  const admin = getSupabaseAdminClient()
  if (!admin) {
    return { ok: false, message: "Server is missing its service-role key." }
  }

  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, church_id: church.id, role: "member" },
  })

  if (createError) {
    const exists = createError.status === 422 || /already|registered|exists/i.test(createError.message)
    return {
      ok: false,
      message: exists
        ? "That email is already registered. Sign in instead."
        : createError.message,
    }
  }

  const supabase = await getSupabaseServerClient()
  if (supabase) {
    await supabase.auth.signInWithPassword({ email, password })
  }

  redirect("/")
}
