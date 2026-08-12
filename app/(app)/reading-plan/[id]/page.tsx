import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, BookOpen } from "lucide-react"
import { Card, PageHeader, StatusBadge } from "@/components/ui-kit"
import { LessonResponseForm } from "@/components/lesson-response-form"
import { gradeResponse } from "@/lib/lesson-grading"
import { getLessonById, getMyLessonResponse } from "@/lib/data"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const lesson = await getLessonById(id)
  return {
    title: lesson ? `${lesson.title} · Lessons` : "Lesson",
    description: lesson?.summary || "Work through this lesson and answer the questions.",
  }
}

export default async function LessonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const lesson = await getLessonById(id)

  // Retired or missing lessons are not reachable by members.
  if (!lesson || !lesson.active) notFound()

  const response = await getMyLessonResponse(lesson.id)

  // Only meaningful once they've actually submitted.
  const score = response
    ? gradeResponse(lesson.questions, response.answers)
    : { correct: 0, total: 0 }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Link
          href="/reading-plan"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All lessons
        </Link>
        <PageHeader
          eyebrow="Lesson"
          title={lesson.title}
          description={lesson.summary || undefined}
          action={response ? <StatusBadge status={response.status} /> : undefined}
        />
      </div>

      {lesson.videoUrl && (
        <div className="overflow-hidden rounded-xl border border-border bg-black">
          <video
            controls
            preload="metadata"
            className="aspect-video w-full"
            aria-label={`Teaching video for ${lesson.title}`}
          >
            <source src={lesson.videoUrl} />
            Your browser does not support embedded video.
          </video>
        </div>
      )}

      {lesson.scripture && (
        <Card className="flex flex-col gap-1.5">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-accent-foreground/70">
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            Scripture to read
          </span>
          <p className="text-lg font-medium text-foreground text-pretty">
            {lesson.scripture}
          </p>
        </Card>
      )}

      {lesson.instructions && (
        <Card className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Reading instructions
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground text-pretty">
            {lesson.instructions}
          </p>
        </Card>
      )}

      {score.total > 0 && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Multiple choice score
            </h2>
            <p className="text-sm text-muted-foreground text-pretty">
              {score.correct === score.total
                ? "Every choice question is correct."
                : "Review the lesson and update your answers if you'd like."}
            </p>
          </div>
          <p className="font-display text-2xl font-semibold text-foreground">
            {score.correct}
            <span className="text-muted-foreground">/{score.total}</span>
          </p>
        </Card>
      )}

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Your answers
          </h2>
          <p className="text-sm text-muted-foreground text-pretty">
            Respond to each question below. Your leaders will review what you submit.
          </p>
        </div>
        <Card>
          <LessonResponseForm lesson={lesson} response={response} />
        </Card>
      </section>
    </div>
  )
}
