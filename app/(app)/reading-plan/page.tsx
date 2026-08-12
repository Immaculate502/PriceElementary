import Link from "next/link"
import { ArrowRight, BookOpen, Video } from "lucide-react"
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui-kit"
import { getLessons, getLessonResponses, getCurrentMember } from "@/lib/data"

export const metadata = {
  title: "Lessons",
  description: "Watch the teaching, read the scriptures, and answer the questions.",
}

export default async function LessonsPage() {
  const member = await getCurrentMember()
  const [lessons, myResponses] = await Promise.all([
    getLessons(),
    getLessonResponses({ memberId: member.id }),
  ])

  // Map lessonId -> the member's response status, to show progress at a glance.
  const statusByLesson = new Map(myResponses.map((r) => [r.lessonId, r.status]))

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Discipleship"
        title="Lessons"
        description="Work through each lesson: watch the teaching video, read the assigned scripture, then answer the questions. Your leaders review every response."
      />

      {lessons.length === 0 ? (
        <EmptyState
          title="No lessons yet"
          description="Your leaders haven't published any lessons. Check back soon."
        />
      ) : (
        <div className="grid gap-4">
          {lessons.map((lesson) => {
            const status = statusByLesson.get(lesson.id)
            return (
              <Link
                key={lesson.id}
                href={`/reading-plan/${lesson.id}`}
                className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="flex h-full flex-col gap-3 transition-colors hover:border-gold">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-lg font-semibold text-foreground text-balance">
                        {lesson.title}
                      </h2>
                      {lesson.summary && (
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
                          {lesson.summary}
                        </p>
                      )}
                    </div>
                    {status && <StatusBadge status={status} />}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                    {lesson.videoPath && (
                      <span className="flex items-center gap-1.5">
                        <Video className="h-3.5 w-3.5" aria-hidden="true" />
                        Teaching video
                      </span>
                    )}
                    {lesson.scripture && (
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                        {lesson.scripture}
                      </span>
                    )}
                    <span>
                      {lesson.questions.length}{" "}
                      {lesson.questions.length === 1 ? "question" : "questions"}
                    </span>
                  </div>

                  <span className="mt-1 flex items-center gap-1 text-sm font-medium text-gold">
                    {status ? "Review or update your answers" : "Start this lesson"}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
