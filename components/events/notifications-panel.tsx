import Link from "next/link"
import { Bell } from "lucide-react"
import { markNotificationsRead } from "@/app/events-actions"
import { Card } from "@/components/ui-kit"
import type { AppNotification } from "@/lib/event-types"

function ago(iso: string) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export function NotificationsPanel({ notifications }: { notifications: AppNotification[] }) {
  if (!notifications.length) return null
  const unread = notifications.filter((n) => !n.readAt).length

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Bell className="h-4 w-4 text-gold" aria-hidden="true" />
          Notifications
          {unread > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">{unread} new</span>
          )}
        </h2>
        {unread > 0 && (
          <form action={markNotificationsRead}>
            <button type="submit" className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
              Mark all read
            </button>
          </form>
        )}
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {notifications.slice(0, 6).map((n) => {
          const body = (
            <>
              <span className="flex items-start justify-between gap-2">
                <span className={n.readAt ? "text-sm text-foreground" : "text-sm font-semibold text-foreground"}>
                  {!n.readAt && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-gold align-middle" aria-label="Unread" />}
                  {n.title}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{ago(n.createdAt)}</span>
              </span>
              {n.body && <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">{n.body}</span>}
            </>
          )
          return (
            <li key={n.id} className="py-2.5">
              {n.eventId ? (
                <Link href={`/events/${n.eventId}`} className="block hover:opacity-80">{body}</Link>
              ) : (
                body
              )}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
