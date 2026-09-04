import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * The starter FAME activities every new church is seeded with at provisioning.
 * Mirrors the original global seed in `supabase/schema.sql`, but stamped with a
 * specific `church_id` so each tenant gets its own editable copy.
 */
export const STARTER_ACTIVITIES: {
  pillar: "faith" | "action" | "ministry" | "evangelism"
  title: string
  description: string
  points: number
  frequency: "daily" | "weekly" | "monthly"
}[] = [
  { pillar: "faith", title: "Daily Scripture reading", description: "Read the assigned passage and note one truth to carry into your day.", points: 10, frequency: "daily" },
  { pillar: "faith", title: "Morning prayer", description: "Begin the day in prayer before other commitments.", points: 10, frequency: "daily" },
  { pillar: "faith", title: "Weekly journal entry", description: "Reflect in writing on how God moved during the week.", points: 15, frequency: "weekly" },
  { pillar: "action", title: "Act of service", description: "Serve someone in practical love without expecting return.", points: 15, frequency: "weekly" },
  { pillar: "action", title: "Community fast", description: "Join the community in a scheduled season of fasting.", points: 25, frequency: "monthly" },
  { pillar: "action", title: "Volunteer outreach", description: "Give time to an outreach, food drive, or benevolence effort.", points: 20, frequency: "monthly" },
  { pillar: "ministry", title: "Serve on a team", description: "Take your place on a worship, media, hospitality, or care team.", points: 20, frequency: "weekly" },
  { pillar: "ministry", title: "Host or lead small group", description: "Open your home or lead discussion for a small group gathering.", points: 25, frequency: "weekly" },
  { pillar: "ministry", title: "Mentor a member", description: "Walk alongside a newer member and encourage their growth.", points: 30, frequency: "monthly" },
  { pillar: "evangelism", title: "Share your testimony", description: "Tell someone what God has done in your life.", points: 20, frequency: "weekly" },
  { pillar: "evangelism", title: "Invite someone to church", description: "Personally invite and welcome a guest to a gathering.", points: 15, frequency: "weekly" },
  { pillar: "evangelism", title: "Gospel conversation", description: "Have an intentional conversation about the gospel.", points: 20, frequency: "monthly" },
]

/**
 * Seed the starter activities into a church, but only when it has none yet, so
 * calling this more than once (provisioning + a manual "reseed") is safe.
 * Uses a privileged client because church_id is set explicitly here rather than
 * relying on the session's current_church_id() default.
 */
export async function seedChurchActivities(
  client: SupabaseClient,
  churchId: string,
): Promise<{ seeded: number }> {
  const { count } = await client
    .from("activities")
    .select("id", { count: "exact", head: true })
    .eq("church_id", churchId)

  if ((count ?? 0) > 0) return { seeded: 0 }

  const rows = STARTER_ACTIVITIES.map((a) => ({ ...a, church_id: churchId, active: true }))
  const { error } = await client.from("activities").insert(rows)
  if (error) throw new Error(error.message)
  return { seeded: rows.length }
}
