import Link from "next/link"
import { MapPin, Video, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  EVENT_CATEGORIES,
  formatEventDay,
  formatEventWhen,
  type ChurchEvent,
  type EventStatus,
} from "@/lib/event-types"

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const styles: Record<EventStatus, string> = {
    draft: "bg-muted text-muted-foreground",
    published: "bg-success/15 text-success",
    cancelled: "bg-destructive/15 text-destructive",
  }
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", styles[status])}>
      {status}
    </span>
  )
}

export function CategoryBadge({ category }: { category: ChurchEvent["category"] }) {
  return (
    <span className="inline-flex items-center rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
      {EVENT_CATEGORIES[category] ?? category}
    </span>
  )
}

export function DateChip({ iso, timezone }: { iso: string; timezone: string }) {
  const { month, day } = formatEventDay(iso, timezone)
  return (
    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-navy text-navy-foreground">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-gold">{month}</span>
      <span className="font-display text-xl font-semibold leading-none">{day}</span>
    </div>
  )
}

export function EventCard({
  event,
  href,
  meta,
  showStatus = false,
}: {
  event: ChurchEvent
  href: string
  meta?: React.ReactNode
  showStatus?: boolean
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {event.bannerUrl ? (
        <img src={event.bannerUrl} alt="" className="aspect-[16/7] w-full object-cover" />
      ) : (
        <div className="flex aspect-[16/7] w-full items-end bg-primary p-4" aria-hidden="true">
          <span className="font-display text-sm uppercase tracking-widest text-primary-foreground/70">
            {EVENT_CATEGORIES[event.category]}
          </span>
        </div>
      )}
      <div className="flex flex-1 gap-4 p-4">
        <DateChip iso={event.startsAt} timezone={event.timezone} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <CategoryBadge category={event.category} />
            {(showStatus || event.status === "cancelled") && <EventStatusBadge status={event.status} />}
          </div>
          <h3 className="font-display text-lg font-semibold leading-snug text-foreground text-balance group-hover:underline">
            {event.title}
          </h3>
          <p className="text-sm text-muted-foreground">{formatEventWhen(event)}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {event.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {event.location}
              </span>
            )}
            {event.virtualLink && (
              <span className="inline-flex items-center gap-1">
                <Video className="h-3.5 w-3.5" aria-hidden="true" />
                Online
              </span>
            )}
            {event.capacity && (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                {event.capacity} spots
              </span>
            )}
          </div>
          {meta}
        </div>
      </div>
    </Link>
  )
}
