"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { rsvpEvent, type EventActionResult } from "@/app/events-actions"
import { cn } from "@/lib/utils"
import type { RsvpStatus } from "@/lib/event-types"
import { ActionMessage } from "./form-bits"

const OPTIONS: { value: Exclude<RsvpStatus, "waitlist">; label: string }[] = [
  { value: "going", label: "Going" },
  { value: "maybe", label: "Maybe" },
  { value: "not_going", label: "Can't make it" },
]

function Options({ current }: { current: RsvpStatus | null }) {
  const { pending } = useFormStatus()
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Your RSVP">
      {OPTIONS.map((o) => {
        const active = current === o.value || (o.value === "going" && current === "waitlist")
        return (
          <button
            key={o.value}
            type="submit"
            name="status"
            value={o.value}
            disabled={pending}
            aria-pressed={active}
            className={cn(
              "rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:bg-secondary",
            )}
          >
            {o.value === "going" && current === "waitlist" ? "Waitlisted" : o.label}
          </button>
        )
      })}
    </div>
  )
}

export function RsvpButtons({ eventId, current }: { eventId: string; current: RsvpStatus | null }) {
  const [state, action] = useActionState<EventActionResult | null, FormData>(rsvpEvent, null)
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="eventId" value={eventId} />
      <Options current={current} />
      <ActionMessage state={state} />
    </form>
  )
}
