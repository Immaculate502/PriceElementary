import { isSupabaseConfigured } from "./supabase/config"
import { getSupabaseServerClient } from "./supabase/server"
import {
  DEMO_ACTIVITIES,
  DEMO_MEMBER,
  DEMO_MEMBERS,
  DEMO_SUBMISSIONS,
} from "./demo-data"
import { PILLARS, type FamePillar, type Member, type Submission } from "./types"

/**
 * Data-access layer.
 *
 * When Supabase is connected (env vars present) these functions read/write the
 * real database. Until then they transparently serve the in-memory demo data so
 * the app previews end-to-end. No UI changes are needed when Supabase is added.
 */

export async function getCurrentMember(): Promise<Member> {
  if (!isSupabaseConfigured()) return DEMO_MEMBER

  const supabase = await getSupabaseServerClient()
  if (!supabase) return DEMO_MEMBER
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return DEMO_MEMBER

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!data) return DEMO_MEMBER

  return {
    id: data.id,
    name: data.full_name ?? user.email ?? "Member",
    email: user.email ?? "",
    role: data.role ?? "member",
    joinedAt: data.created_at ?? new Date().toISOString(),
    avatarColor: data.avatar_color ?? "var(--pillar-faith)",
    streak: data.streak ?? 0,
  }
}

export async function getMembers(): Promise<Member[]> {
  if (!isSupabaseConfigured()) return DEMO_MEMBERS

  const supabase = await getSupabaseServerClient()
  if (!supabase) return DEMO_MEMBERS
  const { data } = await supabase.from("profiles").select("*")
  if (!data?.length) return DEMO_MEMBERS

  return data.map((d) => ({
    id: d.id,
    name: d.full_name ?? "Member",
    email: d.email ?? "",
    role: d.role ?? "member",
    joinedAt: d.created_at ?? "",
    avatarColor: d.avatar_color ?? "var(--pillar-faith)",
    streak: d.streak ?? 0,
  }))
}

export async function getSubmissions(filter?: {
  status?: Submission["status"]
  memberId?: string
}): Promise<Submission[]> {
  if (!isSupabaseConfigured()) {
    let rows = DEMO_SUBMISSIONS
    if (filter?.status) rows = rows.filter((r) => r.status === filter.status)
    if (filter?.memberId) rows = rows.filter((r) => r.memberId === filter.memberId)
    return rows
  }

  const supabase = await getSupabaseServerClient()
  if (!supabase) return DEMO_SUBMISSIONS
  let query = supabase
    .from("submissions")
    .select("*")
    .order("created_at", { ascending: false })

  if (filter?.status) query = query.eq("status", filter.status)
  if (filter?.memberId) query = query.eq("member_id", filter.memberId)

  const { data } = await query
  if (!data) return []

  return Promise.all(
    data.map(async (d) => {
      let videoUrl: string | null = null
      if (d.video_path) {
        const { data: signed } = await supabase.storage
          .from("prayer-videos")
          .createSignedUrl(d.video_path, 60 * 60) // 1 hour
        videoUrl = signed?.signedUrl ?? null
      }
      return {
        id: d.id,
        memberId: d.member_id,
        memberName: d.member_name ?? "Member",
        type: d.type,
        pillar: d.pillar,
        title: d.title,
        body: d.body,
        status: d.status,
        createdAt: d.created_at,
        isPrivate: d.is_private ?? false,
        videoUrl,
      }
    }),
  )
}

export async function getMemberById(id: string): Promise<Member | null> {
  const members = await getMembers()
  return members.find((m) => m.id === id) ?? null
}

export type PillarProgress = Record<FamePillar, number>

/**
 * Count a member's APPROVED submissions per F.A.M.E. pillar. This is the
 * measure of "progress in each area" shown on the admin roster and detail page.
 */
export function pillarProgress(submissions: Submission[]): PillarProgress {
  const progress = Object.fromEntries(PILLARS.map((p) => [p, 0])) as PillarProgress
  for (const s of submissions) {
    if (s.status === "approved") progress[s.pillar] += 1
  }
  return progress
}

export async function getActivities() {
  if (!isSupabaseConfigured()) return DEMO_ACTIVITIES

  const supabase = await getSupabaseServerClient()
  if (!supabase) return DEMO_ACTIVITIES
  const { data } = await supabase.from("activities").select("*")
  if (!data?.length) return DEMO_ACTIVITIES

  return data.map((d) => ({
    id: d.id,
    pillar: d.pillar,
    title: d.title,
    description: d.description,
    points: d.points ?? 0,
    frequency: d.frequency ?? "weekly",
  }))
}
