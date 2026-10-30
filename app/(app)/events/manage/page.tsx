import { notFound, redirect } from "next/navigation"
import { getEventAccess, getManageableEvents, getRegistrationCounts } from "@/lib/events"
import { EventDashboard } from "@/components/events/event-dashboard"

export const metadata = { title: "Manage events" }

export default async function LeaderEventsPage() {
  const access = await getEventAccess()
  if (!access) redirect("/login")
  if (access.isAdmin) redirect("/admin/events")
  if (!access.canManage) notFound()
  const events = await getManageableEvents(access)
  const counts = await getRegistrationCounts(events.map((e) => e.id))
  return (
    <EventDashboard
      events={events}
      counts={counts}
      base="/events/manage"
      title="Your ministry events"
      description="Create and manage events for the ministries you lead."
    />
  )
}
