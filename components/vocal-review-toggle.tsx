"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { AlertCircle, CheckCircle2, Undo2 } from "lucide-react"
import { setVocalReviewed, type AdminActionResult } from "@/app/(admin)/admin/admin-actions"
import { Button } from "@/components/ui/button"

function ToggleButton({ reviewed }: { reviewed: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      size="sm"
      variant="outline"
      disabled={pending}
      className="gap-1.5 bg-background"
    >
      {reviewed ? (
        <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {pending ? "Saving…" : reviewed ? "Move back to queue" : "Mark reviewed"}
    </Button>
  )
}

export function VocalReviewToggle({
  vocalId,
  title,
  reviewed,
}: {
  vocalId: string
  title: string
  reviewed: boolean
}) {
  const [state, formAction] = useActionState<AdminActionResult | null, FormData>(
    setVocalReviewed,
    null,
  )

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <input type="hidden" name="vocalId" value={vocalId} />
      {/* Send the desired next state, not the current one. */}
      <input type="hidden" name="reviewed" value={reviewed ? "false" : "true"} />
      <ToggleButton reviewed={reviewed} />
      <span className="sr-only">
        {reviewed
          ? `Move "${title}" back to the review queue`
          : `Mark "${title}" as reviewed`}
      </span>
      {state && (
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
          {state.message}
        </p>
      )}
    </form>
  )
}
