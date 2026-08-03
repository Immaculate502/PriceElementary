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

const PILLARS = ["faith", "action", "ministry", "evangelism"] as const
const FREQUENCIES = ["daily", "weekly", "monthly"] as const

/** Shared validation + auth for every activity write. */
async function readActivityForm(formData: FormData) {
  if (!(await isAdminUnlocked())) {
    return { error: "Unlock the leadership area first." as const }
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
    return { error: "Choose which pillar this belongs to." as const }
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
    return { ok: false, message: "Unlock the leadership area first." }
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

/** Shared validation + auth for lesson create/update. */
async function readLessonForm(formData: FormData) {
  if (!(await isAdminUnlocked())) {
    return { error: "Unlock the leadership area first." as const }
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

  // Questions arrive as repeated "question" fields; blanks are dropped so an
  // empty row in the editor never becomes a real question.
  const questions = formData
    .getAll("question")
    .map((q) => String(q).trim())
    .filter(Boolean)
  if (questions.some((q) => q.length > 500)) {
    return { error: "Keep each question under 500 characters." as const }
  }
  if (questions.length > 20) {
    return { error: "A lesson can have at most 20 questions." as const }
  }

  return {
    values: {
      title,
      summary,
      scripture,
      instructions,
      video_path: videoPath || null,
    },
    questions,
  }
}

/** Replace a lesson's questions with the given prompts (in order). */
async function replaceQuestions(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>,
  lessonId: string,
  prompts: string[],
) {
  await supabase.from("lesson_questions").delete().eq("lesson_id", lessonId)
  if (prompts.length === 0) return
  await supabase.from("lesson_questions").insert(
    prompts.map((prompt, i) => ({ lesson_id: lessonId, prompt, position: i })),
  )
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

  await replaceQuestions(supabase, created.id, parsed.questions)

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

  await replaceQuestions(supabase, id, parsed.questions)

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
    return { ok: false, message: "Unlock the leadership area first." }
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
    return { ok: false, message: "Unlock the leadership area first." }
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
