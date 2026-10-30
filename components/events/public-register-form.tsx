"use client"

import { useActionState } from "react"
import { registerPublic, type EventActionResult } from "@/app/events-actions"
import { ActionMessage, Field, SubmitButton, inputClass } from "./form-bits"

export function PublicRegisterForm({ slug, eventId, full }: { slug: string; eventId: string; full: boolean }) {
  const [state, action] = useActionState<EventActionResult | null, FormData>(registerPublic, null)

  if (state?.ok) {
    return (
      <div className="rounded-lg bg-success/10 p-4">
        <ActionMessage state={state} />
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="eventId" value={eventId} />
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <Field id="reg-name" label="Your name">
        <input id="reg-name" name="name" required maxLength={120} autoComplete="name" className={inputClass} />
      </Field>
      <Field id="reg-email" label="Email">
        <input id="reg-email" name="email" type="email" required maxLength={254} autoComplete="email" className={inputClass} />
      </Field>
      <SubmitButton label={full ? "Join the waitlist" : "Register"} pendingLabel="Registering..." size="default" />
      <ActionMessage state={state} />
    </form>
  )
}
