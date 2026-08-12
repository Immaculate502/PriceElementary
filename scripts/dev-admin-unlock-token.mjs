/**
 * Local QA helper: prints the admin unlock cookie value so a test browser can
 * open the Leadership Console without typing the password.
 *
 * Mirrors lib/admin-auth.ts. Prints only the derived HMAC session token, never
 * the password itself. Not imported by the app.
 */
import { createHmac, scryptSync } from "node:crypto"
import pg from "pg"

const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "$FordTempo#1535"
const SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "fame-dev-secret-change-me"

function hashPassword(pw) {
  const salt = createHmac("sha256", SECRET).update("fame-admin-pw-salt").digest()
  return scryptSync(pw, salt, 32).toString("hex")
}

async function currentHash() {
  const raw = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL
  if (raw) {
    const url = new URL(raw)
    url.searchParams.delete("sslmode")
    const client = new pg.Client({
      connectionString: url.toString(),
      ssl: { rejectUnauthorized: false },
    })
    try {
      await client.connect()
      const { rows } = await client.query(
        "select value from public.app_settings where key = 'admin_password_hash' limit 1",
      )
      if (rows[0]?.value) return rows[0].value
    } catch {
      // Fall through to the env/default password.
    } finally {
      await client.end().catch(() => {})
    }
  }
  return hashPassword(DEFAULT_ADMIN_PASSWORD)
}

const token = createHmac("sha256", SECRET)
  .update(`unlock:${await currentHash()}`)
  .digest("hex")

console.log(token)
