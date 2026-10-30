"use client"

import { useActionState } from "react"
import { addWalkIn, type EventActionResult } from "@/app/events-actions"
import { ActionMessage, SubmitButton, inputClass } from "./form-bits"

export function WalkInForm({ eventId }: { eventId: string }) {
  const [state, action] = useActionState<EventActionResult | null, FormData>(addWalkIn, null)
  return (
    <form action={action} className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
      <input type="hidden" name="eventId" value={eventId} />
      <p className="text-sm font-medium">Check in a walk-in attendee</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor={`walkin-name-${eventId}`}>Name</label>
        <input id={`walkin-name-${eventId}`} name="name" required placeholder="Full name" maxLength={120} className={inputClass} />
        <label className="sr-only" htmlFor={`walkin-email-${eventId}`}>Email</label>
        <input id={`walkin-email-${eventId}`} name="email" type="email" required placeholder="Email" maxLength={254} className={inputClass} />
        <SubmitButton label="Check in" pendingLabel="Saving..." />
      </div>
      <ActionMessage state={state} />
    </form>
  )
}
