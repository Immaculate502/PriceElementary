"use client"

import { useActionState, useEffect, useState } from "react"
import { useFormStatus } from "react-dom"
import { AlertCircle, Check, X } from "lucide-react"
import {
  moderateLessonResponse,
  type AdminActionResult,
} from "@/app/(app)/admin/admin-actions"

function Button({
  status,
  children,
  className,
}: {
  status: "approved" | "rejected"
  children: React.ReactNode
  className: string
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      name="status"
      value={status}
      disabled={pending}
      className={className}
    >
      {children}
    </button>
  )
}

export function LessonModerationControls({
  responseId,
  memberId,
}: {
  responseId: string
  memberId: string
}) {
  const [state, formAction] = useActionState<AdminActionResult | null, FormData>(
    moderateLessonResponse,
    null,
  )
  const [done, setDone] = useState<string | null>(null)

  // Collapse to a plain label once the decision succeeds.
  useEffect(() => {
    if (state?.ok) setDone(state.message.replace(/\.$/, ""))
  }, [state])

  if (done) {
    return <span className="text-xs font-medium text-muted-foreground">{done}</span>
  }

  return (
    <form action={formAction} className="flex flex-col items-end gap-1.5">
      <input type="hidden" name="responseId" value={responseId} />
      <input type="hidden" name="memberId" value={memberId} />
      <div className="flex items-center gap-2">
        <Button
          status="approved"
          className="inline-flex items-center gap-1 rounded-lg bg-success/15 px-2.5 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/25 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
          Approve
        </Button>
        <Button
          status="rejected"
          className="inline-flex items-center gap-1 rounded-lg bg-destructive/15 px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/25 disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" />
          Reject
        </Button>
      </div>
      {state && !state.ok && (
        <p className="flex items-center gap-1 text-xs text-destructive" role="status">
          <AlertCircle className="h-3.5 w-3.5" />
          {state.message}
        </p>
      )}
    </form>
  )
}
