"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { sendBroadcast, type EventActionResult } from "@/app/events-actions"
import { Card } from "@/components/ui-kit"
import {
  BROADCAST_AUDIENCES,
  BROADCAST_KINDS,
  type BroadcastAudience,
  type BroadcastKind,
} from "@/lib/event-types"
import { ActionMessage, Field, SubmitButton, inputClass, useBrowserTimeZone } from "./form-bits"

const TEMPLATES: Record<BroadcastKind, (title: string) => { subject: string; message: string }> = {
  announcement: (t) => ({ subject: `You're invited: ${t}`, message: `We'd love for you to join us for ${t}. Tap below for details and to RSVP.` }),
  reminder: (t) => ({ subject: `Reminder: ${t} is coming up`, message: `Just a friendly reminder that ${t} is coming up soon. We can't wait to see you there!` }),
  follow_up: (t) => ({ subject: `Thank you for joining ${t}`, message: `Thank you for being part of ${t}. We hope you were blessed and encouraged.` }),
  update: (t) => ({ subject: `Update: ${t}`, message: `There's an update about ${t}:\n\n` }),
  cancellation: (t) => ({ subject: `Cancelled: ${t}`, message: `We're sorry — ${t} has been cancelled. Thank you for your understanding.` }),
}

export function BroadcastComposer({
  eventId,
  eventTitle,
  isAdmin,
  ministries,
  members,
}: {
  eventId: string
  eventTitle: string
  isAdmin: boolean
  ministries: { id: string; name: string }[]
  members: { id: string; name: string }[]
}) {
  const [state, action] = useActionState<EventActionResult | null, FormData>(sendBroadcast, null)
  const tz = useBrowserTimeZone()
  const [kind, setKind] = useState<BroadcastKind>("announcement")
  const [audience, setAudience] = useState<BroadcastAudience>(isAdmin ? "all" : "registrants")
  const [draft, setDraft] = useState(() => TEMPLATES.announcement(eventTitle))
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset()
      setDraft(TEMPLATES[kind](eventTitle))
    }
    // Reset only after a successful send.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const audiences = Object.entries(BROADCAST_AUDIENCES).filter(
    ([value]) => isAdmin || (value !== "all" && value !== "leaders"),
  )

  return (
    <Card>
      <form ref={formRef} action={action} className="flex flex-col gap-4">
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="timezone" value={tz} />
        <h2 className="font-display text-lg font-semibold">Send a message</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`kind-${eventId}`} label="Message type">
            <select
              id={`kind-${eventId}`}
              name="kind"
              value={kind}
              onChange={(e) => {
                const next = e.target.value as BroadcastKind
                setKind(next)
                setDraft(TEMPLATES[next](eventTitle))
              }}
              className={inputClass}
            >
              {Object.entries(BROADCAST_KINDS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field id={`audience-${eventId}`} label="Send to">
            <select
              id={`audience-${eventId}`}
              name="audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value as BroadcastAudience)}
              className={inputClass}
            >
              {audiences.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
        </div>

        {audience === "ministries" && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Ministries</legend>
            {ministries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No ministries yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {ministries.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm">
                    <input type="checkbox" name="ministryIds" value={m.id} className="h-4 w-4" />
                    {m.name}
                  </label>
                ))}
              </div>
            )}
          </fieldset>
        )}

        {audience === "individuals" && (
          <Field id={`recipients-${eventId}`} label="People" hint="(hold Ctrl/Cmd to select several)">
            <select id={`recipients-${eventId}`} name="recipientIds" multiple size={6} className={inputClass}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </Field>
        )}

        <Field id={`subject-${eventId}`} label="Subject">
          <input
            id={`subject-${eventId}`}
            name="subject"
            required
            maxLength={160}
            value={draft.subject}
            onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
            className={inputClass}
          />
        </Field>
        <Field id={`message-${eventId}`} label="Message">
          <textarea
            id={`message-${eventId}`}
            name="message"
            required
            rows={5}
            maxLength={4000}
            value={draft.message}
            onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
            className={`${inputClass} resize-y leading-relaxed`}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Deliver by</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="channels" value="in_app" defaultChecked className="h-4 w-4" />
              In-app notification
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="channels" value="email" defaultChecked className="h-4 w-4" />
              Email
            </label>
          </fieldset>
          <Field id={`sendAt-${eventId}`} label="Schedule for later" hint="(blank = send now)">
            <input id={`sendAt-${eventId}`} name="sendAt" type="datetime-local" className={inputClass} />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton label="Send message" pendingLabel="Sending..." />
          <ActionMessage state={state} />
        </div>
      </form>
    </Card>
  )
}
