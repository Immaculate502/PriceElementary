import "server-only"
import { getTenantContext, isChurchAdmin } from "./tenant"

/**
 * Leadership authorization.
 *
 * The console is no longer protected by a shared password. Access is granted to
 * real authenticated users whose profile role is `admin` (a church leader) or
 * who are platform super-admins. Because leaders are genuine `role = 'admin'`
 * rows, their normal session client satisfies the church-scoped row-level
 * security policies — so admin reads and writes are automatically limited to
 * the leader's own church with no service-role bypass required.
 *
 * `isAdminUnlocked()` keeps its historical name so the many call sites in the
 * admin actions continue to read naturally, but it now means "is a church
 * leader (or super-admin)".
 */
export async function isAdminUnlocked(): Promise<boolean> {
  return isChurchAdmin()
}

/** Full tenancy context for the current leader, or null when not a leader. */
export async function requireChurchAdmin() {
  const ctx = await getTenantContext()
  if (!ctx || (!ctx.isSuperAdmin && ctx.role !== "admin")) return null
  return ctx
}
