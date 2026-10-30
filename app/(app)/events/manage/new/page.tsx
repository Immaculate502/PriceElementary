import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getEventAccess, getMinistries } from "@/lib/events"
import { PageHeader } from "@/components/ui-kit"
import { EventForm } from "@/components/events/event-form"

export const metadata = { title: "New event" }

export default async function LeaderNewEventPage() {
  const access = await getEventAccess()
  if (!access) redirect("/login")
  if (access.isAdmin) redirect("/admin/events/new")
  if (!access.canManage) notFound()
  const ministries = (await getMinistries()).filter((m) => access.leaderMinistryIds.includes(m.id))
  return (
    <div className="flex flex-col gap-6">
      <Link href="/events/manage" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Your events
      </Link>
      <PageHeader eyebrow="Event Center" title="Create a ministry event" description="Events you create are tied to a ministry you lead." />
      <EventForm ministries={ministries.map((m) => ({ id: m.id, name: m.name }))} base="leader" isAdmin={false} />
    </div>
  )
}
