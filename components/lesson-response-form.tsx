"use client"

import { useActionState, useState } from "react"
import { useFormStatus } from "react-dom"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { submitLessonResponse, type ActionResult } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { isAnswered } from "@/lib/lesson-grading"
import type { Lesson, LessonResponse } from "@/lib/types"

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-gold focus-visible:ring-2 focus-visible:ring-ring"

type Draft = { answer: string; selectedOption: number | null }

function SubmitButton({
  hasResponse,
  disabled,
}: {
  hasResponse: boolean
  disabled: boolean
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending || disabled} className="w-fit">
      {pending ? "Submitting…" : hasResponse ? "Update my answers" : "Submit for review"}
    </Button>
  )
}

/** One multiple-choice question rendered as a radio group. */
function ChoiceQuestion({
  questionId,
  options,
  selected,
  onSelect,
}: {
  questionId: string
  options: string[]
  selected: number | null
  onSelect: (index: number) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((option, i) => {
        const checked = selected === i
        return (
          <label
            key={i}
            className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm leading-relaxed transition-colors ${
              checked
                ? "border-gold bg-gold/10 text-foreground"
                : "border-border bg-background text-foreground hover:border-ring"
            }`}
          >
            <input
              type="radio"
              name={`choice_${questionId}`}
              value={i}
              checked={checked}
              onChange={() => onSelect(i)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-pillar-ministry"
            />
            <span className="text-pretty">{option}</span>
          </label>
        )
      })}
    </div>
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

  // Prefill with any prior answers so members can edit and re-submit.
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => {
    const prior = new Map((response?.answers ?? []).map((a) => [a.questionId, a]))
    const initial: Record<string, Draft> = {}
    for (const q of lesson.questions) {
      const existing = prior.get(q.id)
      initial[q.id] = {
        answer: existing?.answer ?? "",
        selectedOption: existing?.selectedOption ?? null,
      }
    }
    return initial
  })

  function update(questionId: string, next: Partial<Draft>) {
    setDrafts((d) => ({ ...d, [questionId]: { ...d[questionId], ...next } }))
  }

  if (lesson.questions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        There are no questions on this lesson yet. Check back once your leaders add them.
      </p>
    )
  }

  const unanswered = lesson.questions.filter((q) => !isAnswered(q, drafts[q.id]))
  const complete = unanswered.length === 0

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="lessonId" value={lesson.id} />

      {lesson.questions.map((q, i) => (
        <div key={q.id} className="grid gap-2">
          {q.kind === "choice" ? (
            <>
              <p className="text-sm font-medium text-foreground text-pretty">
                <span className="mr-1.5 text-muted-foreground">{i + 1}.</span>
                {q.prompt}
              </p>
              {/* Submitted as a hidden field so the value survives even when the
                  member never touches an option. */}
              <input
                type="hidden"
                name={`answer_${q.id}`}
                value={drafts[q.id]?.selectedOption ?? ""}
              />
              <ChoiceQuestion
                questionId={q.id}
                options={q.options}
                selected={drafts[q.id]?.selectedOption ?? null}
                onSelect={(index) => update(q.id, { selectedOption: index })}
              />
            </>
          ) : (
            <>
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
                value={drafts[q.id]?.answer ?? ""}
                onChange={(e) => update(q.id, { answer: e.target.value })}
                placeholder="Write your answer…"
                className={`${inputClass} resize-y`}
              />
            </>
          )}
        </div>
      ))}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton hasResponse={response !== null} disabled={!complete} />
          {!complete && (
            <p className="text-sm text-muted-foreground">
              {unanswered.length} of {lesson.questions.length}{" "}
              {unanswered.length === 1 ? "question" : "questions"} still to answer.
            </p>
          )}
          {complete && response && !state && (
            <p className="text-sm text-muted-foreground">
              You submitted this lesson. Editing and re-submitting sends it back for review.
            </p>
          )}
        </div>

        {state && (
          <p
            className={`flex items-center gap-1.5 text-sm ${
              state.ok ? "text-success" : "text-destructive"
            }`}
            role="status"
          >
            {state.ok ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            {state.message}
          </p>
        )}
      </div>
    </form>
  )
}
