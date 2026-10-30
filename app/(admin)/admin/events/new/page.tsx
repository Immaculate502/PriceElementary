import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getEventAccess, getMinistries } from "@/lib/events"
import { PageHeader } from "@/components/ui-kit"
import { EventForm } from "@/components/events/event-form"

export const metadata = { title: "New event" }

export default async function AdminNewEventPage() {
  const access = await getEventAccess()
  if (!access?.isAdmin) notFound()
  const ministries = await getMinistries()
  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/events" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All events
      </Link>
      <PageHeader eyebrow="Event Center" title="Create an event" description="Save as a draft to keep working, or publish when you're ready." />
      <EventForm ministries={ministries.map((m) => ({ id: m.id, name: m.name }))} base="admin" isAdmin />
    </div>
  )
}
