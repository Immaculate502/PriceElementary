"use client"

import { useActionState, useState } from "react"
import { ImagePlus } from "lucide-react"
import { saveEvent, type EventActionResult } from "@/app/events-actions"
import { Card } from "@/components/ui-kit"
import {
  EVENT_CATEGORIES,
  EVENT_VISIBILITY,
  utcToZonedLocal,
  type ChurchEvent,
} from "@/lib/event-types"
import { ActionMessage, Field, SubmitButton, inputClass, useBrowserTimeZone } from "./form-bits"

export function EventForm({
  event,
  ministries,
  base,
  isAdmin,
}: {
  event?: ChurchEvent
  ministries: { id: string; name: string }[]
  base: "admin" | "leader"
  isAdmin: boolean
}) {
  const [state, action] = useActionState<EventActionResult | null, FormData>(saveEvent, null)
  const tz = useBrowserTimeZone(event?.timezone)
  const [preview, setPreview] = useState<string | null>(event?.bannerUrl ?? null)
  const [removeBanner, setRemoveBanner] = useState(false)
  const uid = event?.id ?? "new"

  const startValue = event && tz ? utcToZonedLocal(event.startsAt, tz) : undefined
  const endValue = event?.endsAt && tz ? utcToZonedLocal(event.endsAt, tz) : undefined

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="base" value={base} />
      <input type="hidden" name="timezone" value={tz} />
      {event && <input type="hidden" name="eventId" value={event.id} />}
      <input type="hidden" name="removeBanner" value={removeBanner ? "true" : "false"} />

      <Card className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold">Event details</h2>
        <Field id={`title-${uid}`} label="Event title">
          <input id={`title-${uid}`} name="title" required maxLength={160} defaultValue={event?.title} placeholder="e.g. Fall Revival Night" className={inputClass} />
        </Field>
        <Field id={`description-${uid}`} label="Description">
          <textarea id={`description-${uid}`} name="description" rows={5} maxLength={5000} defaultValue={event?.description} placeholder="What should people know about this event?" className={`${inputClass} resize-y leading-relaxed`} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`category-${uid}`} label="Category">
            <select id={`category-${uid}`} name="category" defaultValue={event?.category ?? "church_service"} className={inputClass}>
              {Object.entries(EVENT_CATEGORIES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field id={`ministry-${uid}`} label="Hosting ministry" hint={isAdmin ? "(optional)" : undefined}>
            <select id={`ministry-${uid}`} name="ministryId" defaultValue={event?.ministryId ?? (isAdmin ? "" : ministries[0]?.id)} required={!isAdmin} className={inputClass}>
              {isAdmin && <option value="">Whole church</option>}
              {ministries.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field id={`speakers-${uid}`} label="Speakers / guests" hint="(optional)">
          <input id={`speakers-${uid}`} name="speakers" maxLength={500} defaultValue={event?.speakers} placeholder="Pastor Jane Doe, Worship team" className={inputClass} />
        </Field>
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">Date, time and place</h2>
          {tz && <p className="text-xs text-muted-foreground">Times are in {tz.replace(/_/g, " ")}</p>}
        </div>
        {/* Keyed on tz so default values recompute once the browser zone is known. */}
        <div key={tz} className="grid gap-4 sm:grid-cols-2">
          <Field id={`start-${uid}`} label="Starts">
            <input id={`start-${uid}`} name="start" type="datetime-local" required defaultValue={startValue} className={inputClass} />
          </Field>
          <Field id={`end-${uid}`} label="Ends" hint="(optional)">
            <input id={`end-${uid}`} name="end" type="datetime-local" defaultValue={endValue} className={inputClass} />
          </Field>
        </div>
        <Field id={`location-${uid}`} label="Location" hint="(optional)">
          <input id={`location-${uid}`} name="location" maxLength={300} defaultValue={event?.location} placeholder="Main Sanctuary, 123 Church St" className={inputClass} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`virtual-${uid}`} label="Virtual meeting link" hint="(optional)">
            <input id={`virtual-${uid}`} name="virtualLink" type="url" maxLength={500} defaultValue={event?.virtualLink ?? ""} placeholder="https://zoom.us/j/..." className={inputClass} />
          </Field>
          <Field id={`regurl-${uid}`} label="External registration link" hint="(optional)">
            <input id={`regurl-${uid}`} name="registrationUrl" type="url" maxLength={500} defaultValue={event?.registrationUrl ?? ""} placeholder="https://..." className={inputClass} />
          </Field>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold">Registration and visibility</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`visibility-${uid}`} label="Who can see it">
            <select id={`visibility-${uid}`} name="visibility" defaultValue={event?.visibility ?? "members"} className={inputClass}>
              {Object.entries(EVENT_VISIBILITY).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field id={`capacity-${uid}`} label="Capacity" hint="(blank = unlimited)">
            <input id={`capacity-${uid}`} name="capacity" type="number" min={1} max={100000} defaultValue={event?.capacity ?? ""} className={inputClass} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" name="rsvpRequired" defaultChecked={event?.rsvpRequired} className="h-4 w-4 accent-[var(--primary)]" />
          RSVP required
        </label>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold">Contact</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id={`cname-${uid}`} label="Contact person">
            <input id={`cname-${uid}`} name="contactName" maxLength={120} defaultValue={event?.contactName} className={inputClass} />
          </Field>
          <Field id={`cemail-${uid}`} label="Contact email">
            <input id={`cemail-${uid}`} name="contactEmail" type="email" maxLength={254} defaultValue={event?.contactEmail} className={inputClass} />
          </Field>
          <Field id={`cphone-${uid}`} label="Contact phone">
            <input id={`cphone-${uid}`} name="contactPhone" type="tel" maxLength={40} defaultValue={event?.contactPhone} className={inputClass} />
          </Field>
        </div>
        <Field id={`hosting-${uid}`} label="Hosted by (display name)" hint="(optional)">
          <input id={`hosting-${uid}`} name="hostingMinistry" maxLength={120} defaultValue={event?.hostingMinistry} placeholder="Youth Ministry" className={inputClass} />
        </Field>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold">Banner or flyer</h2>
        {preview && !removeBanner && (
          <img src={preview} alt="Event banner preview" className="aspect-[16/7] w-full rounded-lg object-cover" />
        )}
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor={`banner-${uid}`} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-secondary">
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
            {preview ? "Replace image" : "Upload image"}
          </label>
          <input
            id={`banner-${uid}`}
            name="banner"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                setPreview(URL.createObjectURL(file))
                setRemoveBanner(false)
              }
            }}
          />
          {preview && !removeBanner && (
            <button type="button" onClick={() => setRemoveBanner(true)} className="text-sm text-muted-foreground underline-offset-2 hover:underline">
              Remove image
            </button>
          )}
          <span className="text-xs text-muted-foreground">JPG, PNG, WebP or GIF up to 5 MB.</span>
        </div>
      </Card>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-border bg-background/95 py-4 backdrop-blur">
        <SubmitButton label={event?.status === "published" ? "Save changes" : "Publish event"} pendingLabel="Saving..." name="intent" value="publish" />
        {event?.status !== "published" && (
          <SubmitButton label="Save as draft" pendingLabel="Saving..." name="intent" value="draft" variant="outline" />
        )}
        <ActionMessage state={state} />
      </div>
    </form>
  )
}
