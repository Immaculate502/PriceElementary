import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { PageHeader } from "@/components/ui-kit"
import { LessonEditor } from "@/components/lesson-editor"
import { getLessons } from "@/lib/data"

export const metadata = {
  title: "Lessons · Leadership",
  description: "Create lessons with a teaching video, scriptures, and questions for members.",
}

export default async function AdminLessonsPage() {
  // Leadership sees retired lessons too, so they can be reviewed or restored.
  const lessons = await getLessons({ includeInactive: true })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Link
          href="/admin"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to admin
        </Link>
        <PageHeader
          eyebrow="Leadership"
          title="Lessons"
          description="Build a lesson with a teaching video, scripture to read, study instructions, and questions. Members work through it and submit answers for your review."
        />
      </div>

      <LessonEditor lessons={lessons} />

      <p className="text-sm text-muted-foreground">
        Looking for member responses to review?{" "}
        <Link href="/admin/lessons/responses" className="font-medium text-gold hover:underline">
          Review lesson responses
        </Link>
        .
      </p>
    </div>
  )
}
