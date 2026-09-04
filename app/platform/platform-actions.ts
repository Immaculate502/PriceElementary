"use server"

import { revalidatePath } from "next/cache"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { isSuperAdmin } from "@/lib/tenant"
import { PLAN } from "@/lib/billing"

export type PlatformResult = { ok: boolean; message: string }

export type ChurchRow = {
  id: string
  name: string
  slug: string
  contactEmail: string | null
  subscriptionStatus: string | null
  suspended: boolean
  setupFeePaid: boolean
  currentPeriodEnd: string | null
  createdAt: string
  memberCount: number
}

export type PlatformStats = {
  totalChurches: number
  activeChurches: number
  suspendedChurches: number
  totalMembers: number
  /** Estimated monthly recurring revenue in cents (active churches × plan price). */
  mrrCents: number
}

/**
 * Load every church with a member count. Super-admin only; uses the
 * service-role client because this view deliberately spans all tenants.
 */
export async function listChurches(): Promise<{
  churches: ChurchRow[]
  stats: PlatformStats
}> {
  const empty = {
    churches: [],
    stats: { totalChurches: 0, activeChurches: 0, suspendedChurches: 0, totalMembers: 0, mrrCents: 0 },
  }
  if (!(await isSuperAdmin())) return empty

  const admin = getSupabaseAdminClient()
  if (!admin) return empty

  const { data: churches } = await admin
    .from("churches")
    .select("*")
    .order("created_at", { ascending: false })

  if (!churches) return empty

  // Member counts per church in one grouped pass.
  const counts = new Map<string, number>()
  const { data: profiles } = await admin.from("profiles").select("church_id")
  for (const p of profiles ?? []) {
    const cid = (p as { church_id: string | null }).church_id
    if (cid) counts.set(cid, (counts.get(cid) ?? 0) + 1)
  }

  const rows: ChurchRow[] = churches.map((c: Record<string, any>) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    contactEmail: c.contact_email ?? null,
    subscriptionStatus: c.subscription_status ?? null,
    suspended: !!c.suspended,
    setupFeePaid: !!c.setup_fee_paid,
    currentPeriodEnd: c.current_period_end ?? null,
    createdAt: c.created_at,
    memberCount: counts.get(c.id) ?? 0,
  }))

  const active = rows.filter(
    (r) => !r.suspended && ["trialing", "active", "past_due"].includes(r.subscriptionStatus ?? ""),
  ).length

  // MRR only counts churches actually paying (active/past_due), not trials.
  const paying = rows.filter(
    (r) => !r.suspended && ["active", "past_due"].includes(r.subscriptionStatus ?? ""),
  ).length

  return {
    churches: rows,
    stats: {
      totalChurches: rows.length,
      activeChurches: active,
      suspendedChurches: rows.filter((r) => r.suspended).length,
      totalMembers: rows.reduce((sum, r) => sum + r.memberCount, 0),
      mrrCents: paying * PLAN.monthlyAmount,
    },
  }
}

/** Suspend or reactivate a church. Suspension immediately blocks all its users. */
export async function setChurchSuspended(
  _prev: PlatformResult | null,
  formData: FormData,
): Promise<PlatformResult> {
  if (!(await isSuperAdmin())) {
    return { ok: false, message: "Not authorized." }
  }

  const churchId = String(formData.get("churchId") ?? "").trim()
  const suspend = String(formData.get("suspend") ?? "") === "true"
  if (!churchId) return { ok: false, message: "Missing church." }

  const admin = getSupabaseAdminClient()
  if (!admin) return { ok: false, message: "Service-role key missing." }

  const { error } = await admin
    .from("churches")
    .update({ suspended: suspend })
    .eq("id", churchId)

  if (error) return { ok: false, message: error.message }

  revalidatePath("/platform")
  return {
    ok: true,
    message: suspend ? "Church suspended." : "Church reactivated.",
  }
}
