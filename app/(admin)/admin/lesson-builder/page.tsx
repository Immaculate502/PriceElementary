import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { requireChurchAdmin } from "@/lib/admin-auth"
import { LessonBuilder } from "@/components/lesson-builder"
import "./studio.css"

export const metadata: Metadata = {
  title: "Lesson Builder | ROOTED Leadership",
  description: "Create KJV biblical lessons and AI teaching videos for your church.",
  robots: { index: false, follow: false },
}

export default async function LessonBuilderPage() {
  const ctx = await requireChurchAdmin()
  if (!ctx) redirect("/admin/login")

  return <LessonBuilder churchId={ctx.churchId} />
}
