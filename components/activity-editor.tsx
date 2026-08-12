"use client"

import { useActionState, useEffect, useState } from "react"
import { useFormStatus } from "react-dom"
import {
  AlertCircle,
  CheckCircle2,
  EyeOff,
  Pencil,
  Plus,
  RotateCcw,
  X,
} from "lucide-react"
import {
  createActivity,
  setActivityActive,
  updateActivity,
  type AdminActionResult,
} from "@/app/(admin)/admin/admin-actions"
import { Button } from "@/components/ui/button"
import { Card, PillarBadge } from "@/components/ui-kit"
import { PILLAR_META, type Activity, type Pillar } from "@/lib/types"

const FREQUENCIES = ["daily", "weekly", "monthly"] as const
const PILLARS = Object.keys(PILLAR_META) as Pillar[]

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

/** Shared name/pillar/frequency/points fields for both create and edit. */
function ActivityFields({ activity }: { activity?: Activity }) {
  const uid = activity?.id ?? "new"
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2">
        <label htmlFor={`title-${uid}`} className="text-sm font-medium text-foreground">
          Activity name
        </label>
        <input
          id={`title-${uid}`}
          name="title"
          required
          maxLength={120}
          defaultValue={activity?.title}
          placeholder="e.g. Daily Scripture reading"
          className={inputClass}
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor={`description-${uid}`} className="text-sm font-medium text-foreground">
          Description <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id={`description-${uid}`}
          name="description"
          rows={2}
          maxLength={500}
          defaultValue={activity?.description}
          placeholder="What should a member actually do?"
          className={`${inputClass} resize-y leading-relaxed`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-2">
          <label htmlFor={`pillar-${uid}`} className="text-sm font-medium text-foreground">
            Growth area
          </label>
          <select
            id={`pillar-${uid}`}
            name="pillar"
            defaultValue={activity?.pillar ?? "faith"}
            className={inputClass}
          >
            {PILLARS.map((p) => (
              <option key={p} value={p}>
                {PILLAR_META[p].letter} — {PILLAR_META[p].label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <label htmlFor={`frequency-${uid}`} className="text-sm font-medium text-foreground">
            How often
          </label>
          <select
            id={`frequency-${uid}`}
            name="frequency"
            defaultValue={activity?.frequency ?? "weekly"}
            className={inputClass}
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <label htmlFor={`points-${uid}`} className="text-sm font-medium text-foreground">
            Points
          </label>
          <input
            id={`points-${uid}`}
            name="points"
            type="number"
            inputMode="numeric"
            min={0}
            max={1000}
            step={1}
            required
            defaultValue={activity?.points ?? 10}
            className={inputClass}
          />
        </div>
      </div>
    </div>
  )
}

function AddActivityForm() {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState<AdminActionResult | null, FormData>(
    createActivity,
    null,
  )

  // Collapse the form once the activity is saved; the confirmation still shows
  // beneath the Add button, and the new row appears in its pillar below.
  useEffect(() => {
    if (state?.ok) setOpen(false)
  }, [state])

  if (!open) {
    return (
      <div className="flex flex-col gap-2">
        <Button onClick={() => setOpen(true)} className="w-fit gap-1.5">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add activity
        </Button>
        <ActionMessage state={state} />
      </div>
    )
  }

  return (
    <Card className="flex flex-col gap-4 border-gold/40">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold text-foreground">New activity</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
          className="gap-1.5"
          aria-label="Cancel adding activity"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <form action={formAction} className="flex flex-col gap-4">
        <ActivityFields />
        <div className="flex items-center gap-2">
          <SubmitButton label="Add activity" pendingLabel="Adding…" />
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
        <ActionMessage state={state} />
      </form>
    </Card>
  )
}

function EditActivityForm({
  activity,
  onDone,
}: {
  activity: Activity
  onDone: () => void
}) {
  const [state, formAction] = useActionState<AdminActionResult | null, FormData>(
    updateActivity,
    null,
  )

  // Collapse back to the row on success so the leader sees the saved values
  // rather than being left staring at an open form.
  useEffect(() => {
    if (state?.ok) onDone()
  }, [state, onDone])

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="activityId" value={activity.id} />
      <ActivityFields activity={activity} />
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

function RetireButton({ activity }: { activity: Activity }) {
  const [state, formAction] = useActionState<AdminActionResult | null, FormData>(
    setActivityActive,
    null,
  )
  const { active } = activity

  return (
    <form action={formAction} className="flex flex-col items-end gap-1.5">
      <input type="hidden" name="activityId" value={activity.id} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <RetireSubmit active={active} title={activity.title} />
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
      // aria-label rather than an extra sr-only span, which would make screen
      // readers announce the word "Retire" twice.
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

function ActivityRow({ activity }: { activity: Activity }) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <Card className="border-gold/40">
        <EditActivityForm activity={activity} onDone={() => setEditing(false)} />
      </Card>
    )
  }

  return (
    <Card className={`flex flex-col gap-3 ${activity.active ? "" : "opacity-70"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-foreground">{activity.title}</p>
            <PillarBadge pillar={activity.pillar} />
            {!activity.active && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                Retired
              </span>
            )}
          </div>
          {activity.description && (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
              {activity.description}
            </p>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">
            {activity.points} points · {activity.frequency}
          </p>
        </div>
        <div className="flex shrink-0 items-start gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
            className="gap-1.5 bg-background"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Edit
            <span className="sr-only">{activity.title}</span>
          </Button>
          <RetireButton activity={activity} />
        </div>
      </div>
    </Card>
  )
}

export function ActivityEditor({ activities }: { activities: Activity[] }) {
  const active = activities.filter((a) => a.active)
  const retired = activities.filter((a) => !a.active)

  return (
    <div className="flex flex-col gap-6">
      <AddActivityForm />

      {activities.length === 0 && (
        <Card className="flex flex-col gap-2 text-center">
          <p className="font-medium text-foreground">No activities yet</p>
          <p className="text-sm text-muted-foreground text-pretty">
            Add the activities your members are working through and they will appear on the
            Activities page.
          </p>
        </Card>
      )}

      {PILLARS.map((pillar) => {
        const rows = active.filter((a) => a.pillar === pillar)
        if (rows.length === 0) return null
        return (
          <section key={pillar} className="flex flex-col gap-3">
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: PILLAR_META[pillar].token }}
                aria-hidden="true"
              >
                {PILLAR_META[pillar].letter}
              </span>
              {PILLAR_META[pillar].label}
            </h3>
            <div className="flex flex-col gap-3">
              {rows.map((a) => (
                <ActivityRow key={a.id} activity={a} />
              ))}
            </div>
          </section>
        )
      })}

      {retired.length > 0 && (
        <section className="flex flex-col gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">Retired</h3>
            <p className="text-sm text-muted-foreground text-pretty">
              Hidden from members. Past entries, points and streaks are unchanged.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {retired.map((a) => (
              <ActivityRow key={a.id} activity={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
