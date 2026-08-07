import "server-only"
import { cookies } from "next/headers"
import { createHmac, scryptSync, timingSafeEqual } from "node:crypto"
import { getSupabaseServerClient } from "./supabase/server"
import { isSupabaseConfigured, SUPABASE_ANON_KEY } from "./supabase/config"

/**
 * Admin password gate.
 *
 * The admin area is protected by a password that leadership can change at any
 * time from the admin Security panel. There is deliberately NO hardcoded
 * default — the password must come from a real secret.
 *
 * Storage of the (hashed) password:
 *   1. Supabase `app_settings` table when the integration is connected — shared
 *      across all leadership devices.
 *   2. Otherwise an httpOnly cookie so a changed password persists for that
 *      browser in demo mode.
 *   3. Falls back to the `ADMIN_PASSWORD` env var.
 *
 * If none of the three is available the gate stays locked rather than falling
 * back to a guessable value.
 *
 * "Unlock" sets an httpOnly cookie whose value is an HMAC of the current
 * password hash, so changing the password automatically invalidates old
 * unlock sessions.
 */

const ENV_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD?.trim() || ""
const SECRET =
  process.env.ADMIN_SESSION_SECRET || SUPABASE_ANON_KEY || "fame-dev-secret-change-me"

export const UNLOCK_COOKIE = "fame_admin"
export const PW_OVERRIDE_COOKIE = "fame_admin_pw"
export const SESSION_MAX_AGE = 60 * 60 * 8 // 8 hours

/** Deterministic hash so the same password always compares equal across requests. */
export function hashPassword(pw: string): string {
  const salt = createHmac("sha256", SECRET).update("fame-admin-pw-salt").digest()
  return scryptSync(pw, salt, 32).toString("hex")
}

export function unlockToken(passwordHash: string): string {
  return createHmac("sha256", SECRET).update(`unlock:${passwordHash}`).digest("hex")
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

/**
 * Resolve the current password hash from the highest-priority available source.
 * Returns null when no password has been configured at all, so callers can
 * refuse access instead of comparing against a default.
 */
export async function getCurrentPasswordHash(): Promise<string | null> {
  if (isSupabaseConfigured()) {
    const supabase = await getSupabaseServerClient()
    if (supabase) {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "admin_password_hash")
        .maybeSingle()
      if (data?.value) return data.value as string
    }
  }

  const store = await cookies()
  const override = store.get(PW_OVERRIDE_COOKIE)?.value
  if (override) return override

  if (ENV_ADMIN_PASSWORD) return hashPassword(ENV_ADMIN_PASSWORD)

  return null
}

/** True when leadership still needs to configure an admin password. */
export async function isAdminPasswordConfigured(): Promise<boolean> {
  return (await getCurrentPasswordHash()) !== null
}

export async function verifyAdminPassword(input: string): Promise<boolean> {
  if (!input) return false
  const current = await getCurrentPasswordHash()
  if (!current) return false
  return safeEqual(hashPassword(input), current)
}

export async function isAdminUnlocked(): Promise<boolean> {
  const store = await cookies()
  const token = store.get(UNLOCK_COOKIE)?.value
  if (!token) return false
  const current = await getCurrentPasswordHash()
  if (!current) return false
  return safeEqual(token, unlockToken(current))
}
