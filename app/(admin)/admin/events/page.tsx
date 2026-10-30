import { notFound } from "next/navigation"
import { getEventAccess, getManageableEvents, getRegistrationCounts } from "@/lib/events"
import { EventDashboard } from "@/components/events/event-dashboard"
import { AdminEventsNav } from "@/components/events/admin-events-nav"

export const metadata = { title: "Event Center" }

export default async function AdminEventsPage() {
  const access = await getEventAccess()
  if (!access?.isAdmin) notFound()
  const events = await getManageableEvents(access)
  const counts = await getRegistrationCounts(events.map((e) => e.id))
  return (
    <EventDashboard
      events={events}
      counts={counts}
      base="/admin/events"
      title="Events"
      description="Plan services, conferences and ministry gatherings, track RSVPs and keep your congregation informed."
      subnav={<AdminEventsNav active="events" />}
    />
  )
}
