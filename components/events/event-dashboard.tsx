import Link from "next/link"
import { Plus } from "lucide-react"
import { Card, EmptyState, PageHeader } from "@/components/ui-kit"
import { buildAnalytics, type RegistrationCounts } from "@/lib/events"
import type { ChurchEvent } from "@/lib/event-types"
import { EventCard } from "./event-card"

export function EventDashboard({
  events,
  counts,
  base,
  title,
  description,
  subnav,
}: {
  events: ChurchEvent[]
  counts: Record<string, RegistrationCounts>
  base: string
  title: string
  description: string
  subnav?: React.ReactNode
}) {
  const a = buildAnalytics(events, counts)
  const now = Date.now()
  const upcoming = events
    .filter((e) => new Date(e.endsAt ?? e.startsAt).getTime() >= now)
    .sort((x, y) => x.startsAt.localeCompare(y.startsAt))
  const past = events.filter((e) => new Date(e.endsAt ?? e.startsAt).getTime() < now)

  const stats = [
    { label: "Upcoming events", value: a.upcomingEvents },
    { label: "Registrations", value: a.totalRegistrations },
    { label: "Checked in", value: a.totalAttended },
    { label: "Attendance rate", value: `${a.attendanceRate}%` },
    { label: "Page views", value: a.totalViews },
  ]

  const meta = (e: ChurchEvent) => {
    const c = counts[e.id]
    return (
      <p className="text-xs font-medium text-foreground">
        {c ? c.going : 0} going
        {c?.waitlist ? ` · ${c.waitlist} waitlist` : ""}
        {c?.attended ? ` · ${c.attended} checked in` : ""}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Event Center"
        title={title}
        description={description}
        action={
          <Link href={`${base}/new`} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New event
          </Link>
        }
      />
      {subnav}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <dt className="text-xs text-muted-foreground">{s.label}</dt>
            <dd className="font-display text-2xl font-semibold">{s.value}</dd>
          </Card>
        ))}
      </dl>

      {a.top.length > 0 && a.top.some((t) => t.registrations > 0) && (
        <Card>
          <h2 className="mb-3 font-display text-lg font-semibold">Most popular</h2>
          <ul className="flex flex-col gap-3">
            {a.top.filter((t) => t.registrations > 0).map((t) => {
              const max = a.top[0].registrations || 1
              return (
                <li key={t.event.id} className="grid gap-1">
                  <div className="flex justify-between gap-2 text-sm">
                    <Link href={`${base}/${t.event.id}`} className="truncate font-medium hover:underline">{t.event.title}</Link>
                    <span className="shrink-0 text-muted-foreground">{t.registrations} registered · {t.attended} attended</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${(t.registrations / max) * 100}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold">Upcoming and drafts</h2>
        {upcoming.length === 0 ? (
          <EmptyState title="No upcoming events" description="Create your first event to start inviting your congregation." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} href={`${base}/${e.id}`} showStatus meta={meta(e)} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-semibold">Past events</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {past.slice(0, 20).map((e) => (
              <EventCard key={e.id} event={e} href={`${base}/${e.id}`} showStatus meta={meta(e)} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
