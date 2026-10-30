import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import {
  canManageEvent,
  getEvent,
  getEventAccess,
  getMyRegistrations,
  getRegistrationCounts,
  memberEventUrl,
  publicEventUrl,
  siteOrigin,
} from "@/lib/events"
import { getCurrentChurch } from "@/lib/tenant"
import { EventDetail } from "@/components/events/event-detail"
import { RsvpButtons } from "@/components/events/rsvp-buttons"

export default async function MemberEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const access = await getEventAccess()
  if (!access) redirect("/login")
  const event = await getEvent(id)
  if (!event || (event.status === "draft" && !canManageEvent(access, event))) notFound()

  const [counts, mine, church, origin] = await Promise.all([
    getRegistrationCounts([event.id]),
    getMyRegistrations(access.userId),
    getCurrentChurch(),
    siteOrigin(),
  ])
  const shareUrl = event.visibility === "public" && church ? publicEventUrl(origin, church.slug, event.id) : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/events" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All events
        </Link>
        {canManageEvent(access, event) && (
          <Link
            href={access.isAdmin ? `/admin/events/${event.id}` : `/events/manage/${event.id}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            Manage this event
          </Link>
        )}
      </div>
      <EventDetail
        event={event}
        url={memberEventUrl(origin, event.id)}
        icsHref={`/api/events/${event.id}/ics`}
        shareUrl={shareUrl}
        goingCount={counts[event.id]?.going ?? 0}
        action={
          event.rsvpRequired || event.capacity ? (
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <p className="text-sm font-medium">Will you be there?</p>
              <RsvpButtons eventId={event.id} current={mine[event.id]?.status ?? null} />
            </div>
          ) : (
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <p className="text-sm font-medium">Let us know you&apos;re coming</p>
              <RsvpButtons eventId={event.id} current={mine[event.id]?.status ?? null} />
            </div>
          )
        }
      />
    </div>
  )
}
