import Link from "next/link"
import { redirect } from "next/navigation"
import { Settings2 } from "lucide-react"
import { getEventAccess, getFeedEvents, getMyNotifications, getMyRegistrations } from "@/lib/events"
import { RSVP_LABELS } from "@/lib/event-types"
import { EmptyState, PageHeader } from "@/components/ui-kit"
import { EventCard } from "@/components/events/event-card"
import { NotificationsPanel } from "@/components/events/notifications-panel"

export const metadata = { title: "Events" }

export default async function EventsPage() {
  const access = await getEventAccess()
  if (!access) redirect("/login")
  const [events, mine, notifications] = await Promise.all([
    getFeedEvents(),
    getMyRegistrations(access.userId),
    getMyNotifications(),
  ])

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Church life"
        title="Upcoming events"
        description="Services, gatherings and ministry events from your church family."
        action={
          access.canManage ? (
            <Link
              href={access.isAdmin ? "/admin/events" : "/events/manage"}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary"
            >
              <Settings2 className="h-4 w-4" aria-hidden="true" />
              Manage events
            </Link>
          ) : undefined
        }
      />
      <NotificationsPanel notifications={notifications} />
      {events.length === 0 ? (
        <EmptyState title="No upcoming events" description="When your church shares an event, it will show up here." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((e) => {
            const reg = mine[e.id]
            return (
              <EventCard
                key={e.id}
                event={e}
                href={`/events/${e.id}`}
                meta={
                  reg ? (
                    <p className="text-xs font-medium text-primary">You: {RSVP_LABELS[reg.status]}</p>
                  ) : undefined
                }
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
