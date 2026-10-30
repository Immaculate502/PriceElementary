import { notFound } from "next/navigation"
import { getChurchMembersLite, getEventAccess, getMinistries } from "@/lib/events"
import { PageHeader } from "@/components/ui-kit"
import { AdminEventsNav } from "@/components/events/admin-events-nav"
import { MinistriesManager } from "@/components/events/ministries-manager"

export const metadata = { title: "Ministries" }

export default async function AdminMinistriesPage() {
  const access = await getEventAccess()
  if (!access?.isAdmin) notFound()
  const [ministries, members] = await Promise.all([getMinistries(), getChurchMembersLite()])
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Event Center"
        title="Ministries"
        description="Group members into ministries. Ministry leaders can create and manage events for their own ministry."
      />
      <AdminEventsNav active="ministries" />
      <MinistriesManager ministries={ministries} members={members.map((m) => ({ id: m.id, name: m.name }))} />
    </div>
  )
}
