"use client"

import { useState } from "react"
import { CircleDot, ListChecks, Plus, TextCursorInput, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MAX_OPTIONS, MIN_OPTIONS } from "@/lib/lesson-grading"
import type { Lesson, QuestionKind } from "@/lib/types"

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-gold focus-visible:ring-2 focus-visible:ring-ring"

/**
 * A question while it is being edited. `id` is carried through for existing
 * questions so the server can update them in place and keep member answers.
 */
type Draft = {
  id: string | null
  prompt: string
  kind: QuestionKind
  options: string[]
  correctOption: number
}

function emptyDraft(kind: QuestionKind = "open"): Draft {
  return {
    id: null,
    prompt: "",
    kind,
    options: kind === "choice" ? ["", ""] : [],
    correctOption: 0,
  }
}

function toDrafts(lesson?: Lesson): Draft[] {
  if (!lesson?.questions.length) return [emptyDraft()]
  return lesson.questions.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    kind: q.kind,
    options: q.kind === "choice" ? [...q.options] : [],
    correctOption: q.correctOption ?? 0,
  }))
}

function KindToggle({
  value,
  onChange,
  questionNumber,
}: {
  value: QuestionKind
  onChange: (kind: QuestionKind) => void
  questionNumber: number
}) {
  const options: { kind: QuestionKind; label: string; Icon: typeof TextCursorInput }[] = [
    { kind: "open", label: "Written answer", Icon: TextCursorInput },
    { kind: "choice", label: "Multiple choice", Icon: ListChecks },
  ]

  return (
    <div
      role="radiogroup"
      aria-label={`Answer format for question ${questionNumber}`}
      className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1"
    >
      {options.map(({ kind, label, Icon }) => {
        const selected = value === kind
        return (
          <button
            key={kind}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(kind)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              selected
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
          </button>
        )
      })}
    </div>
  )
}

/** The answer choices for one multiple-choice question. */
function OptionsEditor({
  draft,
  questionNumber,
  onChange,
}: {
  draft: Draft
  questionNumber: number
  onChange: (next: Partial<Draft>) => void
}) {
  function setOption(index: number, value: string) {
    onChange({ options: draft.options.map((o, i) => (i === index ? value : o)) })
  }

  function addOption() {
    if (draft.options.length >= MAX_OPTIONS) return
    onChange({ options: [...draft.options, ""] })
  }

  function removeOption(index: number) {
    if (draft.options.length <= MIN_OPTIONS) return
    const options = draft.options.filter((_, i) => i !== index)
    // Keep the correct answer pointing at the same option after the shift.
    let correctOption = draft.correctOption
    if (index === correctOption) correctOption = 0
    else if (index < correctOption) correctOption -= 1
    onChange({ options, correctOption })
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        Select the radio button beside the correct answer.
      </p>

      {draft.options.map((option, i) => {
        const isCorrect = draft.correctOption === i
        return (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              checked={isCorrect}
              onChange={() => onChange({ correctOption: i })}
              name={`correct-${questionNumber}`}
              className="h-4 w-4 shrink-0 accent-pillar-ministry"
              aria-label={`Mark option ${i + 1} as the correct answer`}
            />
            <input
              type="text"
              value={option}
              onChange={(e) => setOption(i, e.target.value)}
              maxLength={300}
              placeholder={`Option ${i + 1}`}
              aria-label={`Question ${questionNumber} option ${i + 1}`}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => removeOption(i)}
              disabled={draft.options.length <= MIN_OPTIONS}
              className="rounded p-1.5 text-muted-foreground transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={`Remove option ${i + 1}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}

      {draft.options.length < MAX_OPTIONS && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addOption}
          className="w-fit gap-1.5 text-xs"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add option
        </Button>
      )}
    </div>
  )
}

/**
 * Builds the lesson's questions. The whole set is submitted as one JSON field
 * because each choice question carries a variable number of options.
 */
export function LessonQuestionsField({ lesson }: { lesson?: Lesson }) {
  const [drafts, setDrafts] = useState<Draft[]>(() => toDrafts(lesson))

  function update(index: number, next: Partial<Draft>) {
    setDrafts((d) => d.map((draft, i) => (i === index ? { ...draft, ...next } : draft)))
  }

  function setKind(index: number, kind: QuestionKind) {
    const current = drafts[index]
    if (current.kind === kind) return
    update(index, {
      kind,
      // Give a fresh choice question two blank options to fill in.
      options: kind === "choice" ? (current.options.length ? current.options : ["", ""]) : [],
      correctOption: 0,
    })
  }

  function addQuestion(kind: QuestionKind) {
    setDrafts((d) => [...d, emptyDraft(kind)])
  }

  function removeQuestion(index: number) {
    setDrafts((d) => (d.length === 1 ? [emptyDraft()] : d.filter((_, i) => i !== index)))
  }

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="questions" value={JSON.stringify(drafts)} />

      <div>
        <span className="text-sm font-medium text-foreground">
          Questions for the member to answer
        </span>
        <p className="mt-0.5 text-xs text-muted-foreground text-pretty">
          Members must answer every question before they can submit. Multiple-choice questions are
          graded automatically; written answers you review yourself. Questions left blank are
          ignored.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {drafts.map((draft, i) => (
          <div
            key={draft.id ?? `new-${i}`}
            className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                {draft.kind === "choice" ? (
                  <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <CircleDot className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                Question {i + 1}
              </span>
              <div className="flex items-center gap-2">
                <KindToggle
                  value={draft.kind}
                  onChange={(kind) => setKind(i, kind)}
                  questionNumber={i + 1}
                />
                <button
                  type="button"
                  onClick={() => removeQuestion(i)}
                  className="rounded p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                  aria-label={`Remove question ${i + 1}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <textarea
              value={draft.prompt}
              onChange={(e) => update(i, { prompt: e.target.value })}
              rows={2}
              maxLength={500}
              placeholder={`What do you want to ask? (question ${i + 1})`}
              aria-label={`Question ${i + 1} prompt`}
              className={`${inputClass} resize-y leading-relaxed`}
            />

            {draft.kind === "choice" && (
              <OptionsEditor
                draft={draft}
                questionNumber={i + 1}
                onChange={(next) => update(i, next)}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addQuestion("open")}
          className="w-fit gap-1.5 bg-background"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add written question
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addQuestion("choice")}
          className="w-fit gap-1.5 bg-background"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add multiple choice
        </Button>
      </div>
    </div>
  )
}
