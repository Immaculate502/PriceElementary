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
  })

  if (error) {
    return { ok: false, message: `Could not save: ${error.message}` }
  }

  revalidatePath("/")
  revalidatePath("/admin")
  return { ok: true, message: "Submitted for review. Thank you!" }
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
