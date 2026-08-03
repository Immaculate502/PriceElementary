"use server"

import { revalidatePath } from "next/cache"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { getCurrentMember } from "@/lib/data"
import type { FamePillar, SubmissionType } from "@/lib/types"

export type ActionResult = { ok: boolean; message: string }

export async function createSubmission(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const title = String(formData.get("title") ?? "").trim()
  const body = String(formData.get("body") ?? "").trim()
  const type = String(formData.get("type") ?? "journal") as SubmissionType
  const pillar = String(formData.get("pillar") ?? "faith") as FamePillar
  const isPrivate = formData.get("isPrivate") === "on"
  const videoPath = String(formData.get("videoPath") ?? "").trim()

  if (!title || !body) {
    return { ok: false, message: "Please provide both a title and some content." }
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: true,
      message:
        "Saved in demo mode. Connect Supabase to persist submissions to your community.",
    }
  }

  const supabase = await getSupabaseServerClient()
  if (!supabase) {
    return { ok: false, message: "Supabase client unavailable." }
  }

  const member = await getCurrentMember()
  const { error } = await supabase.from("submissions").insert({
    member_id: member.id,
    member_name: member.name,
    type,
    pillar,
    title,
    body,
    status: "pending",
    is_private: isPrivate,
    video_path: videoPath || null,
  })

  if (error) {
    return { ok: false, message: `Could not save: ${error.message}` }
  }

  revalidatePath("/")
  revalidatePath("/admin")
  return { ok: true, message: "Submitted for review. Thank you!" }
}

/**
 * Submit or update the current member's answers to a lesson. One response per
 * member per lesson: re-submitting overwrites the answers and resets the
 * response to "pending" for re-review. Question ids are validated against the
 * lesson server-side so a tampered form can't attach answers to another lesson.
 */
export async function submitLessonResponse(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const lessonId = String(formData.get("lessonId") ?? "").trim()
  if (!lessonId) return { ok: false, message: "Missing lesson." }

  if (!isSupabaseConfigured()) {
    return {
      ok: true,
      message: "Saved in demo mode. Connect Supabase to persist lesson answers.",
    }
  }

  const supabase = await getSupabaseServerClient()
  if (!supabase) return { ok: false, message: "Supabase client unavailable." }

  const member = await getCurrentMember()

  // Load this lesson's real questions so we only accept answers to them.
  const { data: questions } = await supabase
    .from("lesson_questions")
    .select("id")
    .eq("lesson_id", lessonId)
  const validIds = new Set((questions ?? []).map((q) => q.id))

  // Collect answers submitted as answer_<questionId> fields.
  const answers: { question_id: string; answer: string }[] = []
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("answer_")) continue
    const questionId = key.slice("answer_".length)
    if (!validIds.has(questionId)) continue // ignore ids not on this lesson
    const answer = String(value).trim()
    if (answer.length > 5000) {
      return { ok: false, message: "Please keep each answer under 5000 characters." }
    }
    answers.push({ question_id: questionId, answer })
  }

  if (answers.length === 0) {
    return { ok: false, message: "Please answer at least one question before submitting." }
  }

  // Upsert the response (unique on lesson_id + member_id), resetting to pending.
  const { data: response, error: respErr } = await supabase
    .from("lesson_responses")
    .upsert(
      {
        lesson_id: lessonId,
        member_id: member.id,
        member_name: member.name,
        status: "pending",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "lesson_id,member_id" },
    )
    .select("id")
    .single()
  if (respErr || !response) {
    return { ok: false, message: `Could not save: ${respErr?.message ?? "unknown error"}` }
  }

  // Replace prior answers with the new set.
  await supabase.from("lesson_answers").delete().eq("response_id", response.id)
  const { error: ansErr } = await supabase.from("lesson_answers").insert(
    answers.map((a) => ({ response_id: response.id, ...a })),
  )
  if (ansErr) return { ok: false, message: `Could not save answers: ${ansErr.message}` }

  revalidatePath("/reading-plan")
  revalidatePath(`/reading-plan/${lessonId}`)
  revalidatePath("/admin/lessons")
  return { ok: true, message: "Your answers were submitted for review. Thank you!" }
}

export async function moderateSubmission(
  id: string,
  status: "approved" | "rejected",
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: true, message: `Marked ${status} (demo mode).` }
  }

  const supabase = await getSupabaseServerClient()
  if (!supabase) return { ok: false, message: "Supabase client unavailable." }

  const member = await getCurrentMember()
  if (member.role !== "admin") {
    return { ok: false, message: "Only leadership can moderate submissions." }
  }

  const { error } = await supabase
    .from("submissions")
    .update({ status })
    .eq("id", id)

  if (error) return { ok: false, message: error.message }

  revalidatePath("/admin")
  return { ok: true, message: `Submission ${status}.` }
}
