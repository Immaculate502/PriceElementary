"use client"

import { useActionState, useState } from "react"
import { deleteEvent, setEventStatus, type EventActionResult } from "@/app/events-actions"
import { Button } from "@/components/ui/button"
import type { EventStatus } from "@/lib/event-types"
import { ActionMessage, SubmitButton } from "./form-bits"

export function StatusControls({
  eventId,
  status,
  base,
}: {
  eventId: string
  status: EventStatus
  base: "admin" | "leader"
}) {
  const [state, action] = useActionState<EventActionResult | null, FormData>(setEventStatus, null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {status !== "published" && (
          <form action={action}>
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="status" value="published" />
            <SubmitButton label={status === "cancelled" ? "Restore & publish" : "Publish"} pendingLabel="Publishing..." />
          </form>
        )}
        {status === "published" && (
          <form action={action}>
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="status" value="draft" />
            <SubmitButton label="Unpublish" pendingLabel="Saving..." variant="outline" />
          </form>
        )}
        {status !== "cancelled" && !confirmCancel && (
          <Button size="sm" variant="outline" onClick={() => setConfirmCancel(true)}>
            Cancel event
          </Button>
        )}
        {!confirmDelete ? (
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        ) : (
          <form action={deleteEvent} className="flex items-center gap-2">
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="base" value={base} />
            <span className="text-sm text-muted-foreground">Delete permanently?</span>
            <SubmitButton label="Yes, delete" pendingLabel="Deleting..." variant="destructive" />
            <Button size="sm" variant="ghost" type="button" onClick={() => setConfirmDelete(false)}>
              Keep
            </Button>
          </form>
        )}
      </div>

      {confirmCancel && status !== "cancelled" && (
        <form action={action} className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="status" value="cancelled" />
          <p className="text-sm font-medium text-foreground">Cancel this event?</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="notify" defaultChecked className="h-4 w-4" />
            Notify everyone who registered (in-app + email)
          </label>
          <div className="flex gap-2">
            <SubmitButton label="Cancel event" pendingLabel="Cancelling..." variant="destructive" />
            <Button size="sm" variant="ghost" type="button" onClick={() => setConfirmCancel(false)}>
              Never mind
            </Button>
          </div>
        </form>
      )}
      <ActionMessage state={state} />
    </div>
  )
}
