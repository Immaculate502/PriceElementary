import "server-only"
import { getSupabaseServerClient } from "./supabase/server"
import { getSupabaseAdminClient } from "./supabase/admin"
import { isSupabaseConfigured } from "./supabase/config"
import { isEntitled } from "./billing"

export type MemberRole = "admin" | "member"

export type TenantContext = {
  userId: string
  email: string
  fullName: string
  churchId: string | null
  role: MemberRole
  isSuperAdmin: boolean
}

export type Church = {
  id: string
  name: string
  slug: string
  suspended: boolean
  subscriptionStatus: string | null
  setupFeePaid: boolean
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  contactEmail: string | null
  currentPeriodEnd: string | null
  onboardingComplete: boolean
  createdAt: string
}

/** Emails that always get platform super-admin access, from env config. */
export function superAdminEmails(): string[] {
  return (process.env.PLATFORM_SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return superAdminEmails().includes(email.toLowerCase())
}

/**
 * Resolve the signed-in user's tenancy context (church, role, super-admin).
 * Returns null when there is no authenticated user.
 *
 * Super-admins listed in PLATFORM_SUPER_ADMIN_EMAILS are lazily reconciled into
 * the `platform_admins` table so the database `is_super_admin()` used by RLS
 * agrees with the application layer.
 */
export async function getTenantContext(): Promise<TenantContext | null> {
  if (!isSupabaseConfigured()) return null

  const supabase = await getSupabaseServerClient()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const email = user.email ?? ""

  const { data: profile } = await supabase
    .from("profiles")
    .select("church_id, role, full_name")
    .eq("id", user.id)
    .maybeSingle()

  const envSuper = isSuperAdminEmail(email)

  const { data: platformRow } = await supabase
    .from("platform_admins")
    .select("id")
    .eq("id", user.id)
    .maybeSingle()

  let isSuper = envSuper || !!platformRow

  // Reconcile env-configured super-admins into the table so RLS honours them.
  if (envSuper && !platformRow) {
    const admin = getSupabaseAdminClient()
    if (admin) {
      await admin
        .from("platform_admins")
        .upsert({ id: user.id, email }, { onConflict: "id" })
      isSuper = true
    }
  }

  return {
    userId: user.id,
    email,
    fullName: profile?.full_name ?? email.split("@")[0] ?? "Member",
    churchId: profile?.church_id ?? null,
    role: (profile?.role as MemberRole) ?? "member",
    isSuperAdmin: isSuper,
  }
}

function mapChurch(d: Record<string, any>): Church {
  return {
    id: d.id,
    name: d.name,
    slug: d.slug,
    suspended: !!d.suspended,
    subscriptionStatus: d.subscription_status ?? null,
    setupFeePaid: !!d.setup_fee_paid,
    stripeCustomerId: d.stripe_customer_id ?? null,
    stripeSubscriptionId: d.stripe_subscription_id ?? null,
    contactEmail: d.contact_email ?? null,
    currentPeriodEnd: d.current_period_end ?? null,
    onboardingComplete: !!d.onboarding_complete,
    createdAt: d.created_at,
  }
}

/** The signed-in user's own church, or null. */
export async function getCurrentChurch(): Promise<Church | null> {
  const ctx = await getTenantContext()
  if (!ctx?.churchId) return null

  const supabase = await getSupabaseServerClient()
  if (!supabase) return null

  const { data } = await supabase
    .from("churches")
    .select("*")
    .eq("id", ctx.churchId)
    .maybeSingle()

  return data ? mapChurch(data) : null
}

/** Look up any church by slug using the service-role client (for public join/onboarding). */
export async function getChurchBySlug(slug: string): Promise<Church | null> {
  const admin = getSupabaseAdminClient() ?? (await getSupabaseServerClient())
  if (!admin) return null
  const { data } = await admin
    .from("churches")
    .select("*")
    .eq("slug", slug.toLowerCase())
    .maybeSingle()
  return data ? mapChurch(data) : null
}

export async function getChurchById(id: string): Promise<Church | null> {
  const admin = getSupabaseAdminClient() ?? (await getSupabaseServerClient())
  if (!admin) return null
  const { data } = await admin.from("churches").select("*").eq("id", id).maybeSingle()
  return data ? mapChurch(data) : null
}

/** True when the given church may use the product (entitled + not suspended). */
export function churchIsEntitled(church: Church | null): boolean {
  if (!church) return false
  return isEntitled(church.subscriptionStatus, church.suspended)
}

export async function isChurchAdmin(): Promise<boolean> {
  const ctx = await getTenantContext()
  return !!ctx && (ctx.isSuperAdmin || ctx.role === "admin")
}

export async function isSuperAdmin(): Promise<boolean> {
  const ctx = await getTenantContext()
  return !!ctx?.isSuperAdmin
}
