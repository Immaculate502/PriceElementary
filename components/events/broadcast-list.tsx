import Link from "next/link"
import { cancelBroadcast } from "@/app/events-actions"
import { EmptyState } from "@/components/ui-kit"
import { cn } from "@/lib/utils"
import { BROADCAST_AUDIENCES, BROADCAST_KINDS, type EventBroadcast } from "@/lib/event-types"

const statusStyle: Record<EventBroadcast["status"], string> = {
  scheduled: "bg-warning/15 text-warning",
  sending: "bg-accent/20 text-accent-foreground",
  sent: "bg-success/15 text-success",
  failed: "bg-destructive/15 text-destructive",
}

function when(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" })
}

export function BroadcastList({
  broadcasts,
  eventHref,
}: {
  broadcasts: EventBroadcast[]
  eventHref?: (eventId: string) => string
}) {
  if (!broadcasts.length) {
    return <EmptyState title="No messages yet" description="Announcements, reminders and follow-ups you send will be tracked here." />
  }
  return (
    <ul className="flex flex-col gap-3">
      {broadcasts.map((b) => (
        <li key={b.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-foreground">{b.subject}</p>
              <p className="text-xs text-muted-foreground">
                {BROADCAST_KINDS[b.kind]} · {BROADCAST_AUDIENCES[b.audience]} ·{" "}
                {b.channels.map((c) => (c === "in_app" ? "In-app" : "Email")).join(" + ")}
                {eventHref && (
                  <>
                    {" · "}
                    <Link href={eventHref(b.eventId)} className="underline-offset-2 hover:underline">
                      {b.eventTitle}
                    </Link>
                  </>
                )}
              </p>
            </div>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", statusStyle[b.status])}>{b.status}</span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{b.message}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {b.status === "scheduled" && b.scheduledFor && <span>Scheduled for {when(b.scheduledFor)}</span>}
            {b.sentAt && <span>Sent {when(b.sentAt)}</span>}
            {b.status !== "scheduled" && (
              <span>
                {b.recipientCount} recipients · {b.inAppCount} in-app · {b.emailSent} emailed
                {b.emailFailed > 0 && <span className="text-destructive"> · {b.emailFailed} failed</span>}
              </span>
            )}
            {b.status === "scheduled" && (
              <form action={cancelBroadcast}>
                <input type="hidden" name="broadcastId" value={b.id} />
                <button type="submit" className="font-medium text-destructive underline-offset-2 hover:underline">
                  Cancel scheduled message
                </button>
              </form>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
