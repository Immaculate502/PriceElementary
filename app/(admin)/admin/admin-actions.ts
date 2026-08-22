"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { isAdminUnlocked } from "@/lib/admin-auth"
import { getTenantContext } from "@/lib/tenant"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { MAX_OPTIONS, MIN_OPTIONS } from "@/lib/lesson-grading"
import type { QuestionKind } from "@/lib/types"

export type AdminActionResult = { ok: boolean; message: string }

export async function unlockAdmin(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!email || !password) {
    return { ok: false, message: "Enter your leader email and password." }
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Connect Supabase to sign in to the console." }
  }

  const supabase = await getSupabaseServerClient()
  if (!supabase) return { ok: false, message: "Auth unavailable." }

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { ok: false, message: "Incorrect email or password." }

  // Only church leaders and platform super-admins may enter the console.
  const ctx = await getTenantContext()
  if (!ctx || (!ctx.isSuperAdmin && ctx.role !== "admin")) {
    await supabase.auth.signOut()
    return {
      ok: false,
      message: "That account is not a leader for any church.",
    }
  }

  // Platform super-admins manage every church; church leaders get their console.
  if (ctx.isSuperAdmin) {
    revalidatePath("/platform")
    redirect("/platform")
  }

  revalidatePath("/admin")
  redirect("/admin")
}

const PILLARS = ["faith", "action", "ministry", "evangelism"] as const
const FREQUENCIES = ["daily", "weekly", "monthly"] as const

type ActivityFormValues = {
  title: string
  description: string
  pillar: string
  frequency: string
  points: number
}

/**
 * Shared validation + auth for every activity write.
 * The explicit union keeps `"error" in parsed` narrowing to a defined string.
 */
async function readActivityForm(
  formData: FormData,
): Promise<{ error: string } | { values: ActivityFormValues }> {
  if (!(await isAdminUnlocked())) {
    return { error: "Sign in to the Leadership Console first." as const }
  }
  if (!isSupabaseConfigured()) {
    return { error: "Connect Supabase to manage activities." as const }
  }

  const title = String(formData.get("title") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const pillar = String(formData.get("pillar") ?? "")
  const frequency = String(formData.get("frequency") ?? "")
  const pointsRaw = String(formData.get("points") ?? "").trim()

  if (!title) return { error: "Give the activity a name." as const }
  if (title.length > 120) return { error: "Keep the name under 120 characters." as const }
  if (description.length > 500) {
    return { error: "Keep the description under 500 characters." as const }
  }
  if (!PILLARS.includes(pillar as (typeof PILLARS)[number])) {
    return { error: "Choose which growth area this belongs to." as const }
  }
  if (!FREQUENCIES.includes(frequency as (typeof FREQUENCIES)[number])) {
    return { error: "Choose how often this happens." as const }
  }

  // Reject decimals and junk rather than letting Number() coerce silently.
  const points = Number(pointsRaw)
  if (!Number.isInteger(points) || points < 0 || points > 1000) {
    return { error: "Points must be a whole number between 0 and 1000." as const }
  }

  return { values: { title, description, pillar, frequency, points } }
}

export async function createActivity(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  const parsed = await readActivityForm(formData)
  if ("error" in parsed) return { ok: false, message: parsed.error }

  const supabase = await getSupabaseServerClient()
  if (!supabase) return { ok: false, message: "Supabase client unavailable." }

  const { error } = await supabase.from("activities").insert(parsed.values)
  if (error) return { ok: false, message: error.message }

  revalidatePath("/admin/activities")
  revalidatePath("/activities")
  return { ok: true, message: `"${parsed.values.title}" added.` }
}

export async function updateActivity(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  const id = String(formData.get("activityId") ?? "")
  if (!id) return { ok: false, message: "Missing activity." }

  const parsed = await readActivityForm(formData)
  if ("error" in parsed) return { ok: false, message: parsed.error }

  const supabase = await getSupabaseServerClient()
  if (!supabase) return { ok: false, message: "Supabase client unavailable." }

  const { error } = await supabase.from("activities").update(parsed.values).eq("id", id)
  if (error) return { ok: false, message: error.message }

  revalidatePath("/admin/activities")
  revalidatePath("/activities")
  return { ok: true, message: `"${parsed.values.title}" saved.` }
}

/**
 * Retire or restore an activity. Deliberately never deletes: submissions,
 * points and streaks that reference it must stay intact.
 */
export async function setActivityActive(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  if (!(await isAdminUnlocked())) {
    return { ok: false, message: "Sign in to the Leadership Console first." }
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Connect Supabase to manage activities." }
  }

  const id = String(formData.get("activityId") ?? "")
  const active = String(formData.get("active") ?? "") === "true"
  if (!id) return { ok: false, message: "Missing activity." }

  const supabase = await getSupabaseServerClient()
  if (!supabase) return { ok: false, message: "Supabase client unavailable." }

  const { error } = await supabase.from("activities").update({ active }).eq("id", id)
  if (error) return { ok: false, message: error.message }

  revalidatePath("/admin/activities")
  revalidatePath("/activities")
  return {
    ok: true,
    message: active
      ? "Activity restored — members can log it again."
      : "Activity retired. Past entries are unchanged.",
  }
}

// ---------------------------------------------------------------------------
// Lessons authoring
// ---------------------------------------------------------------------------

type LessonFormValues = {
  title: string
  summary: string
  scripture: string
  instructions: string
  video_path: string | null
}

/** One validated question on its way into the database. */
type QuestionDraft = {
  id: string | null
  prompt: string
  kind: QuestionKind
  options: string[]
  correctOption: number | null
}

/**
 * Shared validation + auth for lesson create/update.
 * The explicit union keeps `"error" in parsed` narrowing to a defined string.
 */
async function readLessonForm(
  formData: FormData,
): Promise<{ error: string } | { values: LessonFormValues; questions: QuestionDraft[] }> {
  if (!(await isAdminUnlocked())) {
    return { error: "Sign in to the Leadership Console first." as const }
  }
  if (!isSupabaseConfigured()) {
    return { error: "Connect Supabase to manage lessons." as const }
  }

  const title = String(formData.get("title") ?? "").trim()
  const summary = String(formData.get("summary") ?? "").trim()
  const scripture = String(formData.get("scripture") ?? "").trim()
  const instructions = String(formData.get("instructions") ?? "").trim()
  const videoPath = String(formData.get("videoPath") ?? "").trim()

  if (!title) return { error: "Give the lesson a title." as const }
  if (title.length > 160) return { error: "Keep the title under 160 characters." as const }
  if (summary.length > 500) return { error: "Keep the summary under 500 characters." as const }
  if (scripture.length > 300) return { error: "Keep scripture references under 300 characters." as const }
  if (instructions.length > 4000) {
    return { error: "Keep instructions under 4000 characters." as const }
  }

  const questions = parseQuestions(formData.get("questions"))
  if ("error" in questions) return { error: questions.error }

  return {
    values: {
      title,
      summary,
      scripture,
      instructions,
      video_path: videoPath || null,
    },
    questions: questions.drafts,
  }
}

/**
 * Validates the questions JSON sent by the editor. Blank rows are ignored, but a
 * half-filled choice question is an error rather than a silent drop.
 */
function parseQuestions(
  raw: FormDataEntryValue | null,
): { error: string } | { drafts: QuestionDraft[] } {
  let parsed: unknown
  try {
    parsed = JSON.parse(String(raw ?? "[]"))
  } catch {
    return { error: "Could not read the questions. Please try again." }
  }
  if (!Array.isArray(parsed)) return { error: "Could not read the questions." }
  if (parsed.length > 20) return { error: "A lesson can have at most 20 questions." }

  const drafts: QuestionDraft[] = []

  for (const entry of parsed) {
    const row = (entry ?? {}) as Record<string, unknown>
    const prompt = String(row.prompt ?? "").trim()
    const kind = row.kind === "choice" ? "choice" : "open"
    const rawOptions = Array.isArray(row.options) ? row.options.map((o) => String(o).trim()) : []
    const hasContent = prompt.length > 0 || rawOptions.some(Boolean)

    // A completely untouched row is simply ignored.
    if (!hasContent) continue

    const label = `Question ${drafts.length + 1}`
    if (!prompt) return { error: `${label} needs a prompt before it can be saved.` }
    if (prompt.length > 500) return { error: `${label}: keep the prompt under 500 characters.` }

    const id = typeof row.id === "string" && row.id ? row.id : null

    if (kind === "open") {
      drafts.push({ id, prompt, kind, options: [], correctOption: null })
      continue
    }

    // Drop blank option rows, then re-point the correct answer at its new index.
    const correctIndex = Number(row.correctOption)
    const correctText = rawOptions[correctIndex]
    const options = rawOptions.filter(Boolean)

    if (options.length < MIN_OPTIONS) {
      return { error: `${label}: add at least ${MIN_OPTIONS} answer options.` }
    }
    if (options.length > MAX_OPTIONS) {
      return { error: `${label}: use at most ${MAX_OPTIONS} answer options.` }
    }
    if (options.some((o) => o.length > 300)) {
      return { error: `${label}: keep each option under 300 characters.` }
    }
    if (!correctText) {
      return { error: `${label}: mark which option is the correct answer.` }
    }

    const correctOption = rawOptions.slice(0, correctIndex).filter(Boolean).length
    drafts.push({ id, prompt, kind, options, correctOption })
  }

  return { drafts }
}

/**
 * Syncs a lesson's questions in place.
 *
 * Member answers reference `lesson_questions.id` with `on delete cascade`, so a
 * delete-and-reinsert would erase every existing answer on each save. Instead we
 * update the questions that survived, insert new ones, and only delete the ones
 * the leader actually removed.
 */
async function syncQuestions(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>,
  lessonId: string,
  drafts: QuestionDraft[],
): Promise<{ error?: string }> {
  const { data: existingRows } = await supabase
    .from("lesson_questions")
    .select("id")
    .eq("lesson_id", lessonId)
  const existingIds = new Set((existingRows ?? []).map((r) => r.id as string))

  const keptIds: string[] = []

  for (const [position, draft] of drafts.entries()) {
    const row = {
      prompt: draft.prompt,
      position,
      kind: draft.kind,
      options: draft.options,
      correct_option: draft.correctOption,
    }

    // Only trust an id that really belongs to this lesson.
    if (draft.id && existingIds.has(draft.id)) {
      const { error } = await supabase
        .from("lesson_questions")
        .update(row)
        .eq("id", draft.id)
      if (error) return { error: error.message }
      keptIds.push(draft.id)
    } else {
      const { data: inserted, error } = await supabase
        .from("lesson_questions")
        .insert({ ...row, lesson_id: lessonId })
        .select("id")
        .single()
      if (error || !inserted?.id) {
        return { error: error?.message ?? "Could not save a question." }
      }
      keptIds.push(inserted.id as string)
    }
  }

  // Only reached once every question saved, so a failure above can never
  // delete the questions (and their answers) we were trying to keep.
  const removed = [...existingIds].filter((id) => !keptIds.includes(id))
  if (removed.length > 0) {
    const { error } = await supabase.from("lesson_questions").delete().in("id", removed)
    if (error) return { error: error.message }
  }

  return {}
}

export async function createLesson(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  const parsed = await readLessonForm(formData)
  if ("error" in parsed) return { ok: false, message: parsed.error }

  const supabase = await getSupabaseServerClient()
  if (!supabase) return { ok: false, message: "Supabase client unavailable." }

  // Place new lessons at the end of the current ordering.
  const { data: last } = await supabase
    .from("lessons")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle()
  const position = (last?.position ?? -1) + 1

  const { data: created, error } = await supabase
    .from("lessons")
    .insert({ ...parsed.values, position })
    .select("id")
    .single()
  if (error || !created) {
    return { ok: false, message: error?.message ?? "Could not create the lesson." }
  }

  const synced = await syncQuestions(supabase, created.id, parsed.questions)
  if (synced.error) return { ok: false, message: synced.error }

  revalidatePath("/admin/lessons")
  revalidatePath("/reading-plan")
  return { ok: true, message: `"${parsed.values.title}" created.` }
}

export async function updateLesson(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  const id = String(formData.get("lessonId") ?? "")
  if (!id) return { ok: false, message: "Missing lesson." }

  const parsed = await readLessonForm(formData)
  if ("error" in parsed) return { ok: false, message: parsed.error }

  const supabase = await getSupabaseServerClient()
  if (!supabase) return { ok: false, message: "Supabase client unavailable." }

  const { error } = await supabase.from("lessons").update(parsed.values).eq("id", id)
  if (error) return { ok: false, message: error.message }

  const synced = await syncQuestions(supabase, id, parsed.questions)
  if (synced.error) return { ok: false, message: synced.error }

  revalidatePath("/admin/lessons")
  revalidatePath(`/admin/lessons/${id}`)
  revalidatePath("/reading-plan")
  revalidatePath(`/reading-plan/${id}`)
  return { ok: true, message: `"${parsed.values.title}" saved.` }
}

/**
 * Retire or restore a lesson. Never deletes: member responses that reference
 * it must stay intact for review.
 */
export async function setLessonActive(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  if (!(await isAdminUnlocked())) {
    return { ok: false, message: "Sign in to the Leadership Console first." }
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Connect Supabase to manage lessons." }
  }

  const id = String(formData.get("lessonId") ?? "")
  const active = String(formData.get("active") ?? "") === "true"
  if (!id) return { ok: false, message: "Missing lesson." }

  const supabase = await getSupabaseServerClient()
  if (!supabase) return { ok: false, message: "Supabase client unavailable." }

  const { error } = await supabase.from("lessons").update({ active }).eq("id", id)
  if (error) return { ok: false, message: error.message }

  revalidatePath("/admin/lessons")
  revalidatePath("/reading-plan")
  return {
    ok: true,
    message: active
      ? "Lesson restored — members can work through it again."
      : "Lesson retired. Member responses are unchanged.",
  }
}

/** Approve or reject a member's lesson response (leadership review). */
export async function moderateLessonResponse(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  if (!(await isAdminUnlocked())) {
    return { ok: false, message: "Sign in to the Leadership Console first." }
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Connect Supabase to review responses." }
  }

  const id = String(formData.get("responseId") ?? "")
  const status = String(formData.get("status") ?? "")
  if (!id) return { ok: false, message: "Missing response." }
  if (status !== "approved" && status !== "rejected") {
    return { ok: false, message: "Invalid status." }
  }

  const supabase = await getSupabaseServerClient()
  if (!supabase) return { ok: false, message: "Supabase client unavailable." }

  const memberId = String(formData.get("memberId") ?? "")
  const { error } = await supabase
    .from("lesson_responses")
    .update({ status })
    .eq("id", id)
  if (error) return { ok: false, message: error.message }

  revalidatePath("/admin/lessons")
  if (memberId) revalidatePath(`/admin/members/${memberId}`)
  return { ok: true, message: `Response ${status}.` }
}

export async function lockAdmin(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await getSupabaseServerClient()
    await supabase?.auth.signOut()
  }
  revalidatePath("/admin")
  redirect("/admin/login")
}

export async function setMemberRole(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  if (!(await isAdminUnlocked())) {
    return { ok: false, message: "Sign in to the Leadership Console first." }
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
    return { ok: false, message: "Sign in to the Leadership Console first." }
  }

  const next = String(formData.get("next") ?? "")
  const confirm = String(formData.get("confirm") ?? "")

  if (next.length < 8) {
    return { ok: false, message: "New password must be at least 8 characters." }
  }
  if (next !== confirm) {
    return { ok: false, message: "New passwords do not match." }
  }

  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Connect Supabase to change your password." }
  }

  const supabase = await getSupabaseServerClient()
  if (!supabase) return { ok: false, message: "Supabase client unavailable." }

  // This updates the signed-in leader's own login credentials. Supabase manages
  // the password hash and session; there is no shared console password anymore.
  const { error } = await supabase.auth.updateUser({ password: next })
  if (error) return { ok: false, message: error.message }

  revalidatePath("/admin")
  return { ok: true, message: "Your leader password has been updated." }
}

// ---------------------------------------------------------------------------
// VOCAL review
// ---------------------------------------------------------------------------

/**
 * Mark a VOCAL video reviewed, or move it back to the queue.
 *
 * The leader is a real `role = 'admin'` profile, so their session client is
 * used directly. The church-scoped RLS `vocal_videos` update policy guarantees
 * a leader can only touch videos belonging to their own church — no
 * service-role bypass, no cross-tenant access.
 */
export async function setVocalReviewed(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  if (!(await isAdminUnlocked())) {
    return { ok: false, message: "Sign in to the Leadership Console first." }
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Connect Supabase to review VOCAL videos." }
  }

  const id = String(formData.get("vocalId") ?? "").trim()
  const reviewed = String(formData.get("reviewed") ?? "") === "true"
  if (!id) return { ok: false, message: "Missing video." }

  const supabase = await getSupabaseServerClient()
  if (!supabase) return { ok: false, message: "Supabase client unavailable." }

  const { error } = await supabase
    .from("vocal_videos")
    .update({ reviewed_at: reviewed ? new Date().toISOString() : null })
    .eq("id", id)

  if (error) return { ok: false, message: error.message }

  revalidatePath("/admin/vocal")
  revalidatePath("/admin/members")
  return {
    ok: true,
    message: reviewed ? "Marked reviewed." : "Moved back to the queue.",
  }
}
