import { notFound } from "next/navigation"
import { getBroadcasts, getEventAccess } from "@/lib/events"
import { PageHeader } from "@/components/ui-kit"
import { AdminEventsNav } from "@/components/events/admin-events-nav"
import { BroadcastList } from "@/components/events/broadcast-list"

export const metadata = { title: "Event messages" }

export default async function AdminBroadcastsPage() {
  const access = await getEventAccess()
  if (!access?.isAdmin) notFound()
  const broadcasts = await getBroadcasts()
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Event Center"
        title="Messages"
        description="Every announcement, reminder and follow-up sent from the Event Center. To send a new one, open an event and use its Messages tab."
      />
      <AdminEventsNav active="messages" />
      <BroadcastList broadcasts={broadcasts} eventHref={(id) => `/admin/events/${id}?tab=messages`} />
    </div>
  )
}
