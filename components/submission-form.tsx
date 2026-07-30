"use client"

import { useActionState, useEffect, useRef } from "react"
import { useFormStatus } from "react-dom"
import { CheckCircle2, AlertCircle } from "lucide-react"
import { createSubmission, type ActionResult } from "@/app/actions"
import { PILLAR_META, type FamePillar, type SubmissionType } from "@/lib/types"
import { Button } from "@/components/ui/button"

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="bg-navy text-navy-foreground hover:bg-navy/90">
      {pending ? "Submitting…" : label}
    </Button>
  )
}

export function SubmissionForm({
  type,
  defaultPillar = "faith",
  submitLabel = "Submit",
  showPrivate = false,
  titlePlaceholder = "Give it a title",
  bodyPlaceholder = "Write here…",
  bodyLabel = "Details",
}: {
  type: SubmissionType
  defaultPillar?: FamePillar
  submitLabel?: string
  showPrivate?: boolean
  titlePlaceholder?: string
  bodyPlaceholder?: string
  bodyLabel?: string
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    createSubmission,
    null,
  )
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.ok) formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="type" value={type} />

      <div className="grid gap-2">
        <label htmlFor="title" className="text-sm font-medium text-foreground">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          placeholder={titlePlaceholder}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/40 focus:ring-2"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="pillar" className="text-sm font-medium text-foreground">
          F.A.M.E. Pillar
        </label>
        <select
          id="pillar"
          name="pillar"
          defaultValue={defaultPillar}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/40 focus:ring-2"
        >
          {(Object.keys(PILLAR_META) as FamePillar[]).map((p) => (
            <option key={p} value={p}>
              {PILLAR_META[p].label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <label htmlFor="body" className="text-sm font-medium text-foreground">
          {bodyLabel}
        </label>
        <textarea
          id="body"
          name="body"
          required
          rows={6}
          placeholder={bodyPlaceholder}
          className="resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none ring-ring/40 focus:ring-2"
        />
      </div>

      {showPrivate && (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" name="isPrivate" className="h-4 w-4 rounded border-input" />
          Keep this private (visible only to leadership)
        </label>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
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
