import Link from "next/link"
import { ArrowLeft, Check, X } from "lucide-react"
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui-kit"
import { LessonModerationControls } from "@/components/lesson-moderation-controls"
import { gradeResponse, isCorrect } from "@/lib/lesson-grading"
import { getLessons, getLessonResponses } from "@/lib/data"
import type { Lesson, LessonResponse } from "@/lib/types"

export const metadata = {
  title: "Lesson responses · Leadership",
  description: "Review and approve the answers members submit for each lesson.",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function ResponseCard({
  lesson,
  response,
}: {
  lesson: Lesson
  response: LessonResponse
}) {
  // Look up each answer by question so we can show them in the lesson's order.
  const answerByQuestion = new Map(response.answers.map((a) => [a.questionId, a]))
  const score = gradeResponse(lesson.questions, response.answers)

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{response.memberName}</p>
          <p className="text-xs text-muted-foreground">
            Updated {formatDate(response.updatedAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {score.total > 0 && (
            <span
              className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground"
              aria-label={`Scored ${score.correct} out of ${score.total} on multiple choice`}
            >
              {score.correct}/{score.total} correct
            </span>
          )}
          <StatusBadge status={response.status} />
          <LessonModerationControls
            responseId={response.id}
            memberId={response.memberId}
          />
        </div>
      </div>

      <ol className="flex flex-col gap-3">
        {lesson.questions.map((q, i) => {
          const answer = answerByQuestion.get(q.id)
          const correct = isCorrect(q, answer)

          return (
            <li
              key={q.id}
              className={`border-l-2 pl-3 ${
                correct === true
                  ? "border-success"
                  : correct === false
                    ? "border-destructive"
                    : "border-border"
              }`}
            >
              <p className="text-sm font-medium text-foreground text-pretty">
                <span className="mr-1.5 text-muted-foreground">{i + 1}.</span>
                {q.prompt}
              </p>

              {q.kind === "choice" ? (
                <div className="mt-1 flex flex-col gap-1">
                  <p className="flex items-start gap-1.5 text-sm leading-relaxed text-pretty">
                    {correct === true ? (
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-success"
                        aria-hidden="true"
                      />
                    ) : correct === false ? (
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                    ) : null}
                    <span className="text-muted-foreground">
                      {typeof answer?.selectedOption === "number" ? (
                        q.options[answer.selectedOption]
                      ) : (
                        <span className="italic">No answer provided.</span>
                      )}
                    </span>
                  </p>
                  {correct === false && q.correctOption !== null && (
                    <p className="text-xs text-muted-foreground text-pretty">
                      Correct answer: {q.options[q.correctOption]}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground text-pretty">
                  {answer?.answer?.trim() || <span className="italic">No answer provided.</span>}
                </p>
              )}
            </li>
          )
        })}
      </ol>
    </Card>
  )
}

export default async function LessonResponsesPage() {
  const [lessons, responses] = await Promise.all([
    getLessons({ includeInactive: true }),
    getLessonResponses(),
  ])

  const lessonById = new Map(lessons.map((l) => [l.id, l]))
  const pending = responses.filter((r) => r.status === "pending")
  const reviewed = responses.filter((r) => r.status !== "pending")

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Link
          href="/admin/lessons"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to lessons
        </Link>
        <PageHeader
          eyebrow="Leadership"
          title="Lesson responses"
          description="Read what members submitted for each lesson, then approve or send it back."
        />
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Awaiting review
        </h2>
        {pending.length ? (
          <div className="flex flex-col gap-6">
            {pending.map((response) => {
              const lesson = lessonById.get(response.lessonId)
              if (!lesson) return null
              return (
                <div key={response.id} className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-foreground">{lesson.title}</p>
                  <ResponseCard lesson={lesson} response={response} />
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState
            title="All caught up"
            description="No lesson responses are awaiting review."
          />
        )}
      </section>

      {reviewed.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-semibold text-foreground">Reviewed</h2>
          <div className="flex flex-col gap-6">
            {reviewed.map((response) => {
              const lesson = lessonById.get(response.lessonId)
              if (!lesson) return null
              return (
                <div key={response.id} className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-foreground">{lesson.title}</p>
                  <ResponseCard lesson={lesson} response={response} />
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
