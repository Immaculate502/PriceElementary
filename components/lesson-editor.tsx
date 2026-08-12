"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { useFormStatus } from "react-dom"
import {
  AlertCircle,
  CheckCircle2,
  EyeOff,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Video,
  X,
} from "lucide-react"
import {
  createLesson,
  setLessonActive,
  updateLesson,
  type AdminActionResult,
} from "@/app/(admin)/admin/admin-actions"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui-kit"
import type { Lesson } from "@/lib/types"

const MAX_VIDEO_BYTES = 200 * 1024 * 1024 // 200 MB (matches the bucket limit)
const VIDEO_BUCKET = "lesson-videos"

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-gold focus-visible:ring-2 focus-visible:ring-ring"

function ActionMessage({ state }: { state: AdminActionResult | null }) {
  if (!state) return null
  return (
    <p
      className={`flex items-start gap-1.5 text-xs ${
        state.ok ? "text-muted-foreground" : "text-destructive"
      }`}
      role="status"
    >
      {state.ok ? (
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
      <span className="text-pretty">{state.message}</span>
    </p>
  )
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  )
}

/** Uploads the teaching video to the private bucket and stores its path. */
function VideoField({ lesson }: { lesson?: Lesson }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [videoPath, setVideoPath] = useState(lesson?.videoPath ?? "")
  const [videoName, setVideoName] = useState(lesson?.videoPath ? "Current video" : "")
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  const supabaseReady = getSupabaseBrowserClient() !== null

  function reset() {
    setVideoPath("")
    setVideoName("")
    setError("")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setError("")
    if (!file) return
    if (!file.type.startsWith("video/")) {
      setError("Please choose a video file.")
      reset()
      return
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError("Video must be 200 MB or smaller.")
      reset()
      return
    }
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      setError("Video upload needs Supabase connected.")
      return
    }
    setUploading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const ext = file.name.split(".").pop() || "mp4"
    const path = `${user?.id ?? "admin"}/${crypto.randomUUID()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from(VIDEO_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })
    setUploading(false)
    if (upErr) {
      setError(upErr.message)
      reset()
      return
    }
    setVideoPath(path)
    setVideoName(file.name)
  }

  return (
    <div className="grid gap-2">
      <input type="hidden" name="videoPath" value={videoPath} />
      <span className="text-sm font-medium text-foreground">
        Teaching video <span className="font-normal text-muted-foreground">(optional)</span>
      </span>

      {videoPath ? (
        <div className="flex items-center gap-2 rounded-lg border border-input bg-muted/40 px-3 py-2 text-sm">
          <Video className="h-4 w-4 shrink-0 text-pillar-ministry" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-foreground">{videoName}</span>
          <button
            type="button"
            onClick={reset}
            className="rounded p-1 text-muted-foreground hover:text-destructive"
            aria-label="Remove video"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label
          className={`flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-input bg-background px-3 py-3 text-sm text-muted-foreground hover:border-ring ${
            uploading || !supabaseReady ? "opacity-60" : ""
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Uploading…
            </>
          ) : (
            <>
              <Video className="h-4 w-4" aria-hidden="true" />
              {supabaseReady
                ? "Upload a teaching video (max 200 MB)"
                : "Video upload activates once Supabase is connected"}
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="sr-only"
            disabled={uploading || !supabaseReady}
            onChange={handleSelect}
          />
        </label>
      )}

      {error && (
        <p className="flex items-center gap-1.5 text-sm text-destructive" role="status">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  )
}

/** Editable list of question prompts submitted as repeated `question` fields. */
function QuestionsField({ lesson }: { lesson?: Lesson }) {
  const [prompts, setPrompts] = useState<string[]>(
    lesson?.questions.length ? lesson.questions.map((q) => q.prompt) : [""],
  )

  function update(i: number, value: string) {
    setPrompts((p) => p.map((v, idx) => (idx === i ? value : v)))
  }
  function add() {
    setPrompts((p) => [...p, ""])
  }
  function remove(i: number) {
    setPrompts((p) => (p.length === 1 ? [""] : p.filter((_, idx) => idx !== i)))
  }

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium text-foreground">
        Questions for the member to answer
      </span>
      <p className="text-xs text-muted-foreground">
        Add the questions a member must respond to after watching and reading. Empty rows are
        ignored.
      </p>
      <div className="flex flex-col gap-2">
        {prompts.map((prompt, i) => (
          <div key={i} className="flex items-start gap-2">
            <span
              className="mt-2.5 text-muted-foreground"
              aria-hidden="true"
            >
              <GripVertical className="h-4 w-4" />
            </span>
            <textarea
              name="question"
              value={prompt}
              onChange={(e) => update(i, e.target.value)}
              rows={2}
              maxLength={500}
              placeholder={`Question ${i + 1}`}
              className={`${inputClass} resize-y leading-relaxed`}
              aria-label={`Question ${i + 1}`}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="mt-1.5 rounded p-1.5 text-muted-foreground hover:text-destructive"
              aria-label={`Remove question ${i + 1}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="w-fit gap-1.5 bg-background"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add question
      </Button>
    </div>
  )
}

/** Shared title/summary/scripture/instructions/video/questions fields. */
function LessonFields({ lesson }: { lesson?: Lesson }) {
  const uid = lesson?.id ?? "new"
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2">
        <label htmlFor={`title-${uid}`} className="text-sm font-medium text-foreground">
          Lesson title
        </label>
        <input
          id={`title-${uid}`}
          name="title"
          required
          maxLength={160}
          defaultValue={lesson?.title}
          placeholder="e.g. Who Jesus Is — The Gospel of John"
          className={inputClass}
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor={`summary-${uid}`} className="text-sm font-medium text-foreground">
          Summary <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id={`summary-${uid}`}
          name="summary"
          rows={2}
          maxLength={500}
          defaultValue={lesson?.summary}
          placeholder="A one or two sentence overview shown in the lesson list."
          className={`${inputClass} resize-y leading-relaxed`}
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor={`scripture-${uid}`} className="text-sm font-medium text-foreground">
          Scripture references{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <input
          id={`scripture-${uid}`}
          name="scripture"
          maxLength={300}
          defaultValue={lesson?.scripture}
          placeholder="e.g. John 1:1–18; John 3:16"
          className={inputClass}
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor={`instructions-${uid}`} className="text-sm font-medium text-foreground">
          Reading instructions
        </label>
        <textarea
          id={`instructions-${uid}`}
          name="instructions"
          rows={5}
          maxLength={4000}
          defaultValue={lesson?.instructions}
          placeholder="What should the member read, and how should they study it?"
          className={`${inputClass} resize-y leading-relaxed`}
        />
      </div>

      <VideoField lesson={lesson} />
      <QuestionsField lesson={lesson} />
    </div>
  )
}

function AddLessonForm() {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState<AdminActionResult | null, FormData>(
    createLesson,
    null,
  )

  useEffect(() => {
    if (state?.ok) setOpen(false)
  }, [state])

  if (!open) {
    return (
      <div className="flex flex-col gap-2">
        <Button onClick={() => setOpen(true)} className="w-fit gap-1.5">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add lesson
        </Button>
        <ActionMessage state={state} />
      </div>
    )
  }

  return (
    <Card className="flex flex-col gap-4 border-gold/40">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold text-foreground">New lesson</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
          aria-label="Cancel adding lesson"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <form action={formAction} className="flex flex-col gap-4">
        <LessonFields />
        <div className="flex items-center gap-2">
          <SubmitButton label="Create lesson" pendingLabel="Creating…" />
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
        <ActionMessage state={state} />
      </form>
    </Card>
  )
}

function EditLessonForm({ lesson, onDone }: { lesson: Lesson; onDone: () => void }) {
  const [state, formAction] = useActionState<AdminActionResult | null, FormData>(
    updateLesson,
    null,
  )

  useEffect(() => {
    if (state?.ok) onDone()
  }, [state, onDone])

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="lessonId" value={lesson.id} />
      <LessonFields lesson={lesson} />
      <div className="flex items-center gap-2">
        <SubmitButton label="Save changes" pendingLabel="Saving…" />
        <Button type="button" variant="outline" size="sm" onClick={onDone}>
          Cancel
        </Button>
      </div>
      <ActionMessage state={state} />
    </form>
  )
}

function RetireButton({ lesson }: { lesson: Lesson }) {
  const [state, formAction] = useActionState<AdminActionResult | null, FormData>(
    setLessonActive,
    null,
  )
  const { active } = lesson
  return (
    <form action={formAction} className="flex flex-col items-end gap-1.5">
      <input type="hidden" name="lessonId" value={lesson.id} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <RetireSubmit active={active} title={lesson.title} />
      <ActionMessage state={state} />
    </form>
  )
}

function RetireSubmit({ active, title }: { active: boolean; title: string }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      size="sm"
      variant="outline"
      disabled={pending}
      className="gap-1.5 bg-background"
      aria-label={active ? `Retire ${title}` : `Restore ${title}`}
    >
      {active ? (
        <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {pending ? "Saving…" : active ? "Retire" : "Restore"}
    </Button>
  )
}

function LessonRow({ lesson }: { lesson: Lesson }) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <Card className="border-gold/40">
        <EditLessonForm lesson={lesson} onDone={() => setEditing(false)} />
      </Card>
    )
  }

  return (
    <Card className={`flex flex-col gap-3 ${lesson.active ? "" : "opacity-70"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-foreground">{lesson.title}</p>
            {lesson.videoPath && (
              <span className="flex items-center gap-1 rounded-full bg-pillar-ministry/15 px-2 py-0.5 text-xs font-medium text-pillar-ministry">
                <Video className="h-3 w-3" aria-hidden="true" />
                Video
              </span>
            )}
            {!lesson.active && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                Retired
              </span>
            )}
          </div>
          {lesson.summary && (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
              {lesson.summary}
            </p>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">
            {lesson.scripture ? `${lesson.scripture} · ` : ""}
            {lesson.questions.length}{" "}
            {lesson.questions.length === 1 ? "question" : "questions"}
          </p>
        </div>
        <div className="flex shrink-0 items-start gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
            className="gap-1.5 bg-background"
            aria-label={`Edit ${lesson.title}`}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Edit
          </Button>
          <RetireButton lesson={lesson} />
        </div>
      </div>
    </Card>
  )
}

export function LessonEditor({ lessons }: { lessons: Lesson[] }) {
  const active = lessons.filter((l) => l.active)
  const retired = lessons.filter((l) => !l.active)

  return (
    <div className="flex flex-col gap-6">
      <AddLessonForm />

      {lessons.length === 0 && (
        <Card className="flex flex-col gap-2 text-center">
          <p className="font-medium text-foreground">No lessons yet</p>
          <p className="text-sm text-muted-foreground text-pretty">
            Create your first lesson and it will appear on the Lessons page for members to work
            through.
          </p>
        </Card>
      )}

      {active.length > 0 && (
        <section className="flex flex-col gap-3">
          {retired.length > 0 && (
            <h3 className="font-display text-lg font-semibold text-foreground">Active</h3>
          )}
          <div className="flex flex-col gap-3">
            {active.map((l) => (
              <LessonRow key={l.id} lesson={l} />
            ))}
          </div>
        </section>
      )}

      {retired.length > 0 && (
        <section className="flex flex-col gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">Retired</h3>
            <p className="text-sm text-muted-foreground text-pretty">
              Hidden from members. Member responses are unchanged.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {retired.map((l) => (
              <LessonRow key={l.id} lesson={l} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
