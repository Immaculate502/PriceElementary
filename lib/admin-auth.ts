import "server-only"
import { cookies } from "next/headers"
import { createHmac, scryptSync, timingSafeEqual } from "node:crypto"
import { getSupabaseServerClient } from "./supabase/server"
import { getSupabaseAdminClient } from "./supabase/admin"
import { isSupabaseConfigured, SUPABASE_ANON_KEY } from "./supabase/config"

/**
 * Admin password gate.
 *
 * The admin area is protected by a password (default `$FordTempo@1535`, or the
 * `ADMIN_PASSWORD` env var) that leadership can change at any time from the
 * admin Security panel.
 *
 * Storage of the (hashed) password:
 *   1. Supabase `app_settings` table when the integration is connected — shared
 *      across all leadership devices. This is the authoritative source.
 *   2. Otherwise an httpOnly cookie so a changed password persists for that
 *      browser in demo mode.
 *   3. Falls back to the `ADMIN_PASSWORD` env var / built-in default.
 *
 * Note on `ADMIN_PASSWORD`: because the password begins with `$`, an unquoted
 * value in a shell context gets expanded (`$FordTempo` -> empty), silently
 * truncating it. Always single-quote it, and prefer changing the password from
 * the Security panel so the hash in `app_settings` stays authoritative.
 *
 * "Unlock" sets an httpOnly cookie whose value is an HMAC of the current
 * password hash, so changing the password automatically invalidates old
 * unlock sessions.
 */

const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "$FordTempo@1535"
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

/** Resolve the current password hash from the highest-priority available source. */
export async function getCurrentPasswordHash(): Promise<string> {
  if (isSupabaseConfigured()) {
    // `app_settings` is RLS-restricted to admins, but this gate runs for users
    // who are not admins yet — that is the whole point of the password. Read
    // with the service-role client so the stored hash is always authoritative;
    // using the caller's client would return no row for a non-admin and
    // silently fall back to the built-in default, letting the old password
    // keep working after leadership changed it.
    const privileged = getSupabaseAdminClient()
    const supabase = privileged ?? (await getSupabaseServerClient())
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

  return hashPassword(DEFAULT_ADMIN_PASSWORD)
}

export async function verifyAdminPassword(input: string): Promise<boolean> {
  if (!input) return false
  const current = await getCurrentPasswordHash()
  return safeEqual(hashPassword(input), current)
}

export async function isAdminUnlocked(): Promise<boolean> {
  const store = await cookies()
  const token = store.get(UNLOCK_COOKIE)?.value
  if (!token) return false
  const expected = unlockToken(await getCurrentPasswordHash())
  return safeEqual(token, expected)
}
