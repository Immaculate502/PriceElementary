"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { submitLessonResponse, type ActionResult } from "@/app/actions"
import { Button } from "@/components/ui/button"
import type { Lesson, LessonResponse } from "@/lib/types"

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-gold focus-visible:ring-2 focus-visible:ring-ring"

function SubmitButton({ hasResponse }: { hasResponse: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-fit">
      {pending
        ? "Submitting…"
        : hasResponse
          ? "Update my answers"
          : "Submit for review"}
    </Button>
  )
}

export function LessonResponseForm({
  lesson,
  response,
}: {
  lesson: Lesson
  /** The member's existing response, if they've submitted before. */
  response: LessonResponse | null
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    submitLessonResponse,
    null,
  )

  // Prefill with any previously typed answers so members can edit and re-submit.
  const priorAnswers = new Map(
    (response?.answers ?? []).map((a) => [a.questionId, a.answer]),
  )

  if (lesson.questions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        There are no questions on this lesson yet. Check back once your leaders add them.
      </p>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="lessonId" value={lesson.id} />

      {lesson.questions.map((q, i) => (
        <div key={q.id} className="grid gap-2">
          <label
            htmlFor={`answer_${q.id}`}
            className="text-sm font-medium text-foreground text-pretty"
          >
            <span className="mr-1.5 text-muted-foreground">{i + 1}.</span>
            {q.prompt}
          </label>
          <textarea
            id={`answer_${q.id}`}
            name={`answer_${q.id}`}
            rows={4}
            maxLength={5000}
            defaultValue={priorAnswers.get(q.id) ?? ""}
            placeholder="Write your answer…"
            className={`${inputClass} resize-y`}
          />
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton hasResponse={response !== null} />
        {response && !state && (
          <p className="text-sm text-muted-foreground">
            You submitted this lesson. Editing and re-submitting sends it back for review.
          </p>
        )}
        {state && (
          <p
            className={`flex items-center gap-1.5 text-sm ${
              state.ok ? "text-success" : "text-destructive"
            }`}
            role="status"
          >
            {state.ok ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {state.message}
          </p>
        )}
      </div>
    </form>
  )
}
