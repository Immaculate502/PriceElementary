"use client"

import { useState, useTransition } from "react"
import { Check, X } from "lucide-react"
import { moderateSubmission } from "@/app/actions"

export function ModerationControls({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState<"approved" | "rejected" | null>(null)

  function act(status: "approved" | "rejected") {
    startTransition(async () => {
      await moderateSubmission(id, status)
      setDone(status)
    })
  }

  if (done) {
    return (
      <span className="text-xs font-medium capitalize text-muted-foreground">
        {done}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => act("approved")}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-lg bg-success/15 px-2.5 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/25 disabled:opacity-50"
      >
        <Check className="h-3.5 w-3.5" />
        Approve
      </button>
      <button
        type="button"
        onClick={() => act("rejected")}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-lg bg-destructive/15 px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/25 disabled:opacity-50"
      >
        <X className="h-3.5 w-3.5" />
        Reject
      </button>
    </div>
  )
}
