"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import {
  UNLOCK_COOKIE,
  PW_OVERRIDE_COOKIE,
  SESSION_MAX_AGE,
  getCurrentPasswordHash,
  hashPassword,
  isAdminUnlocked,
  unlockToken,
  verifyAdminPassword,
} from "@/lib/admin-auth"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"

export type AdminActionResult = { ok: boolean; message: string }

const secureCookie = process.env.NODE_ENV === "production"

export async function unlockAdmin(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  const password = String(formData.get("password") ?? "")
  if (!(await verifyAdminPassword(password))) {
    return { ok: false, message: "Incorrect password. Please try again." }
  }

  const hash = await getCurrentPasswordHash()
  const store = await cookies()
  store.set(UNLOCK_COOKIE, unlockToken(hash), {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  })

  revalidatePath("/admin")
  return { ok: true, message: "Unlocked." }
}

export async function lockAdmin(): Promise<void> {
  const store = await cookies()
  store.delete(UNLOCK_COOKIE)
  revalidatePath("/admin")
}

export async function setMemberRole(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  if (!(await isAdminUnlocked())) {
    return { ok: false, message: "Unlock the leadership area first." }
  }

  const memberId = String(formData.get("memberId") ?? "")
  const role = String(formData.get("role") ?? "")

  if (!memberId) return { ok: false, message: "Missing member." }
  if (role !== "admin" && role !== "member") {
    return { ok: false, message: "Invalid role." }
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: "Connect Supabase to manage leadership roles.",
    }
  }

  const supabase = await getSupabaseServerClient()
  if (!supabase) return { ok: false, message: "Supabase client unavailable." }

  // Role changes run through a guarded database function so a member can never
  // promote themselves by writing to their own profile row.
  const { error } = await supabase.rpc("set_member_role", {
    target_id: memberId,
    new_role: role,
  })
  if (error) return { ok: false, message: error.message }

  revalidatePath("/admin/members")
  revalidatePath(`/admin/members/${memberId}`)
  return {
    ok: true,
    message: role === "admin" ? "Member promoted to leader." : "Leader access removed.",
  }
}

export async function changeAdminPassword(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  if (!(await isAdminUnlocked())) {
    return { ok: false, message: "Unlock the admin area before changing the password." }
  }

  const current = String(formData.get("current") ?? "")
  const next = String(formData.get("next") ?? "")
  const confirm = String(formData.get("confirm") ?? "")

  if (!(await verifyAdminPassword(current))) {
    return { ok: false, message: "Current password is incorrect." }
  }
  if (next.length < 8) {
    return { ok: false, message: "New password must be at least 8 characters." }
  }
  if (next !== confirm) {
    return { ok: false, message: "New passwords do not match." }
  }
  if (await verifyAdminPassword(next)) {
    return { ok: false, message: "New password must be different from the current one." }
  }

  const newHash = hashPassword(next)
  const store = await cookies()

  if (isSupabaseConfigured()) {
    const supabase = await getSupabaseServerClient()
    if (!supabase) return { ok: false, message: "Supabase client unavailable." }
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "admin_password_hash", value: newHash }, { onConflict: "key" })
    if (error) return { ok: false, message: error.message }
  } else {
    store.set(PW_OVERRIDE_COOKIE, newHash, {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookie,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    })
  }

  // Re-issue the unlock cookie against the new hash so this session stays valid.
  store.set(UNLOCK_COOKIE, unlockToken(newHash), {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  })

  revalidatePath("/admin")
  return {
    ok: true,
    message: isSupabaseConfigured()
      ? "Admin password updated."
      : "Password updated for this browser (demo mode). Connect Supabase to share it across all leadership devices.",
  }
}
