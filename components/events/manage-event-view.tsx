import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ExternalLink } from "lucide-react"
import {
  canManageEvent,
  getBroadcasts,
  getChurchMembersLite,
  getEvent,
  getEventAccess,
  getEventRegistrations,
  getMinistries,
} from "@/lib/events"
import { getCurrentChurch } from "@/lib/tenant"
import { EVENT_VISIBILITY, formatEventWhen } from "@/lib/event-types"
import { EventStatusBadge } from "./event-card"
import { StatusControls } from "./status-controls"
import { EventForm } from "./event-form"
import { RegistrationsPanel } from "./registrations-panel"
import { BroadcastComposer } from "./broadcast-composer"
import { BroadcastList } from "./broadcast-list"

const TABS = [
  { id: "overview", label: "Registrations" },
  { id: "messages", label: "Messages" },
  { id: "edit", label: "Edit details" },
] as const

export async function ManageEventView({
  id,
  base,
  tab,
  created,
}: {
  id: string
  base: "admin" | "leader"
  tab: string
  created: boolean
}) {
  const basePath = base === "admin" ? "/admin/events" : "/events/manage"
  const [access, event] = await Promise.all([getEventAccess(), getEvent(id)])
  if (!access || !event || !canManageEvent(access, event)) notFound()

  const active = TABS.some((t) => t.id === tab) ? tab : "overview"
  const [registrations, broadcasts, ministries, members, church] = await Promise.all([
    active === "overview" ? getEventRegistrations(event.id) : Promise.resolve([]),
    active === "messages" ? getBroadcasts({ eventId: event.id }) : Promise.resolve([]),
    getMinistries(),
    active === "messages" ? getChurchMembersLite() : Promise.resolve([]),
    getCurrentChurch(),
  ])
  const ministryOptions = (access.isAdmin ? ministries : ministries.filter((m) => access.leaderMinistryIds.includes(m.id))).map(
    (m) => ({ id: m.id, name: m.name }),
  )
  const publicHref = event.visibility === "public" && church ? `/church/${church.slug}/events/${event.id}` : null

  return (
    <div className="flex flex-col gap-6">
      <Link href={basePath} className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All events
      </Link>

      {created && (
        <p className="rounded-lg bg-success/10 p-3 text-sm font-medium text-success" role="status">
          Event created. {event.status === "draft" ? "It's saved as a draft until you publish it." : "It's live for your congregation."}
        </p>
      )}

      <header className="flex flex-col gap-4 border-b border-border pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <EventStatusBadge status={event.status} />
          <span className="text-xs text-muted-foreground">{EVENT_VISIBILITY[event.visibility]}</span>
        </div>
        <h1 className="font-display text-3xl font-semibold text-balance">{event.title}</h1>
        <p className="text-sm text-muted-foreground">{formatEventWhen(event)}{event.location ? ` · ${event.location}` : ""}</p>
        <div className="flex flex-wrap gap-4 text-sm">
          {event.status !== "draft" && (
            <Link href={`/events/${event.id}`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
              Member view <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
          {publicHref && event.status !== "draft" && (
            <Link href={publicHref} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
              Public page <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
        <StatusControls eventId={event.id} status={event.status} base={base} />
      </header>

      <nav aria-label="Event sections" className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`${basePath}/${event.id}?tab=${t.id}`}
            aria-current={active === t.id ? "page" : undefined}
            className={
              active === t.id
                ? "-mb-px border-b-2 border-primary px-3 py-2 text-sm font-medium text-foreground"
                : "px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            }
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {active === "overview" && (
        <RegistrationsPanel
          eventId={event.id}
          registrations={registrations}
          capacity={event.capacity}
          exportHref={`/api/events/${event.id}/export`}
        />
      )}
      {active === "messages" && (
        <div className="flex flex-col gap-6">
          <BroadcastComposer
            eventId={event.id}
            eventTitle={event.title}
            isAdmin={access.isAdmin}
            ministries={ministryOptions}
            members={members.map((m) => ({ id: m.id, name: m.name }))}
          />
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-semibold">Message history</h2>
            <BroadcastList broadcasts={broadcasts} />
          </section>
        </div>
      )}
      {active === "edit" && <EventForm event={event} ministries={ministryOptions} base={base} isAdmin={access.isAdmin} />}
    </div>
  )
}
