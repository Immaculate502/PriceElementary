import { Clock, ExternalLink, Mail, MapPin, Mic2, Phone, User, Users, Video } from "lucide-react"
import { Card } from "@/components/ui-kit"
import { googleCalendarUrl, formatEventWhen, type ChurchEvent } from "@/lib/event-types"
import { CategoryBadge, EventStatusBadge } from "./event-card"
import { ShareCalendar } from "./share-calendar"

function Row({ icon: Icon, children }: { icon: typeof Clock; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
      <span className="min-w-0 break-words">{children}</span>
    </li>
  )
}

export function EventDetail({
  event,
  url,
  icsHref,
  shareUrl,
  goingCount,
  action,
}: {
  event: ChurchEvent
  url: string
  icsHref: string
  shareUrl: string | null
  goingCount: number
  /** RSVP / registration UI. */
  action?: React.ReactNode
}) {
  const spotsLeft = event.capacity ? Math.max(0, event.capacity - goingCount) : null

  return (
    <article className="flex flex-col gap-6">
      {event.bannerUrl && (
        <img src={event.bannerUrl} alt={`${event.title} banner`} className="aspect-[16/7] w-full rounded-xl object-cover shadow-sm" />
      )}
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={event.category} />
          {event.status === "cancelled" && <EventStatusBadge status="cancelled" />}
        </div>
        <h1 className="font-display text-3xl font-semibold text-balance sm:text-4xl">{event.title}</h1>
        {event.hostingMinistry && <p className="text-sm text-muted-foreground">Hosted by {event.hostingMinistry}</p>}
      </header>

      {event.status === "cancelled" && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm font-medium text-destructive">
          This event has been cancelled.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          {event.description && (
            <div className="whitespace-pre-line text-pretty leading-relaxed text-foreground">{event.description}</div>
          )}
          {event.speakers && (
            <div>
              <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
                <Mic2 className="h-4 w-4 text-gold" aria-hidden="true" /> Speakers and guests
              </h2>
              <p className="text-sm text-muted-foreground">{event.speakers}</p>
            </div>
          )}
          <div>
            <h2 className="mb-2 text-sm font-semibold">Add to calendar and share</h2>
            <ShareCalendar icsHref={icsHref} googleHref={googleCalendarUrl(event, url)} shareUrl={shareUrl} title={event.title} />
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4">
            <ul className="flex flex-col gap-3">
              <Row icon={Clock}>{formatEventWhen(event)}</Row>
              {event.location && <Row icon={MapPin}>{event.location}</Row>}
              {event.virtualLink && (
                <Row icon={Video}>
                  <a href={event.virtualLink} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline-offset-2 hover:underline">
                    Join online
                  </a>
                </Row>
              )}
              {event.capacity && (
                <Row icon={Users}>
                  {spotsLeft === 0 ? "Full — waitlist open" : `${spotsLeft} of ${event.capacity} spots left`}
                </Row>
              )}
            </ul>
            {event.status === "published" && action}
            {event.status === "published" && event.registrationUrl && (
              <a href={event.registrationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-2 hover:underline">
                External registration <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            )}
          </Card>

          {(event.contactName || event.contactEmail || event.contactPhone) && (
            <Card className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold">Questions?</h2>
              <ul className="flex flex-col gap-2.5">
                {event.contactName && <Row icon={User}>{event.contactName}</Row>}
                {event.contactEmail && (
                  <Row icon={Mail}>
                    <a href={`mailto:${event.contactEmail}`} className="underline-offset-2 hover:underline">{event.contactEmail}</a>
                  </Row>
                )}
                {event.contactPhone && (
                  <Row icon={Phone}>
                    <a href={`tel:${event.contactPhone}`} className="underline-offset-2 hover:underline">{event.contactPhone}</a>
                  </Row>
                )}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </article>
  )
}
