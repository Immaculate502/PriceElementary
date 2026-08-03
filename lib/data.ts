import { isSupabaseConfigured } from "./supabase/config"
import { getSupabaseServerClient } from "./supabase/server"
import {
  DEMO_ACTIVITIES,
  DEMO_MEMBER,
  DEMO_MEMBERS,
  DEMO_SUBMISSIONS,
} from "./demo-data"
import {
  PILLAR_META,
  type Activity,
  type FamePillar,
  type Lesson,
  type LessonResponse,
  type Member,
  type Submission,
} from "./types"

const PILLAR_KEYS = Object.keys(PILLAR_META) as FamePillar[]

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
  const progress = Object.fromEntries(PILLAR_KEYS.map((p) => [p, 0])) as PillarProgress
  for (const s of submissions) {
    if (s.status === "approved") progress[s.pillar] += 1
  }
  return progress
}

/**
 * Members only ever see active activities. Leadership passes
 * `includeInactive` so retired ones can still be reviewed and restored.
 */
export async function getActivities(
  options?: { includeInactive?: boolean },
): Promise<Activity[]> {
  const includeInactive = options?.includeInactive ?? false

  if (!isSupabaseConfigured()) {
    return includeInactive ? DEMO_ACTIVITIES : DEMO_ACTIVITIES.filter((a) => a.active)
  }

  const supabase = await getSupabaseServerClient()
  if (!supabase) return DEMO_ACTIVITIES

  let query = supabase
    .from("activities")
    .select("*")
    .order("pillar", { ascending: true })
    .order("title", { ascending: true })

  if (!includeInactive) query = query.eq("active", true)

  const { data } = await query

  // An empty table is a real state once a leader retires everything, so only
  // fall back to demo data when the query itself failed.
  if (!data) return DEMO_ACTIVITIES

  return data.map((d) => ({
    id: d.id,
    pillar: d.pillar,
    title: d.title,
    description: d.description ?? "",
    points: d.points ?? 0,
    frequency: d.frequency ?? "weekly",
    active: d.active ?? true,
  }))
}

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

/**
 * List lessons with their questions. Members receive only active lessons;
 * leadership passes `includeInactive` to also see retired ones for management.
 * A signed video URL (1 hour) is attached when a teaching video exists.
 */
export async function getLessons(
  options?: { includeInactive?: boolean },
): Promise<Lesson[]> {
  const includeInactive = options?.includeInactive ?? false

  // No demo fallback: lessons are a real, leader-authored feature. Before
  // Supabase is configured there simply are none.
  if (!isSupabaseConfigured()) return []

  const supabase = await getSupabaseServerClient()
  if (!supabase) return []

  let query = supabase
    .from("lessons")
    .select("*, lesson_questions(*)")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })

  if (!includeInactive) query = query.eq("active", true)

  const { data } = await query
  if (!data) return []

  return Promise.all(
    data.map(async (d) => {
      let videoUrl: string | null = null
      if (d.video_path) {
        const { data: signed } = await supabase.storage
          .from("lesson-videos")
          .createSignedUrl(d.video_path, 60 * 60)
        videoUrl = signed?.signedUrl ?? null
      }
      const questions = (d.lesson_questions ?? [])
        .map((q: { id: string; prompt: string; position: number }) => ({
          id: q.id,
          prompt: q.prompt,
          position: q.position ?? 0,
        }))
        .sort((a, b) => a.position - b.position)

      return {
        id: d.id,
        title: d.title,
        summary: d.summary ?? "",
        scripture: d.scripture ?? "",
        instructions: d.instructions ?? "",
        videoUrl,
        videoPath: d.video_path ?? null,
        position: d.position ?? 0,
        active: d.active ?? true,
        questions,
      }
    }),
  )
}

/** A single lesson by id (includes retired ones for leadership editing). */
export async function getLessonById(id: string): Promise<Lesson | null> {
  const lessons = await getLessons({ includeInactive: true })
  return lessons.find((l) => l.id === id) ?? null
}

/**
 * All responses for a lesson (leadership review). Includes each member's typed
 * answers. Ordered newest first.
 */
export async function getLessonResponses(filter?: {
  lessonId?: string
  memberId?: string
  status?: Submission["status"]
}): Promise<LessonResponse[]> {
  if (!isSupabaseConfigured()) return []

  const supabase = await getSupabaseServerClient()
  if (!supabase) return []

  let query = supabase
    .from("lesson_responses")
    .select("*, lesson_answers(*)")
    .order("updated_at", { ascending: false })

  if (filter?.lessonId) query = query.eq("lesson_id", filter.lessonId)
  if (filter?.memberId) query = query.eq("member_id", filter.memberId)
  if (filter?.status) query = query.eq("status", filter.status)

  const { data } = await query
  if (!data) return []

  return data.map((d) => ({
    id: d.id,
    lessonId: d.lesson_id,
    memberId: d.member_id,
    memberName: d.member_name ?? "Member",
    status: d.status,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
    answers: (d.lesson_answers ?? []).map(
      (a: { question_id: string; answer: string }) => ({
        questionId: a.question_id,
        answer: a.answer ?? "",
      }),
    ),
  }))
}

/** The current member's own response to a specific lesson, if any. */
export async function getMyLessonResponse(
  lessonId: string,
): Promise<LessonResponse | null> {
  const member = await getCurrentMember()
  const responses = await getLessonResponses({ lessonId, memberId: member.id })
  return responses[0] ?? null
}
