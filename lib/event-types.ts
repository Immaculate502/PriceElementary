/**
 * Client-safe Event Center types, labels and date/calendar helpers.
 * Server-only data access lives in `lib/events.ts`.
 */

export const EVENT_CATEGORIES = {
  church_service: "Church Service",
  conference: "Conference",
  revival: "Revival",
  prayer_meeting: "Prayer Meeting",
  bible_study: "Bible Study",
  youth: "Youth Event",
  mens_ministry: "Men's Ministry",
  womens_ministry: "Women's Ministry",
  marriage: "Marriage Ministry",
  leadership_training: "Leadership Training",
  community_outreach: "Community Outreach",
  fundraiser: "Fundraiser",
  celebration: "Special Celebration",
} as const
export type EventCategory = keyof typeof EVENT_CATEGORIES

export const EVENT_VISIBILITY = {
  members: "All church members",
  ministry: "Hosting ministry only",
  leaders: "Leaders only",
  public: "Public (members + public event page)",
} as const
export type EventVisibility = keyof typeof EVENT_VISIBILITY

export type EventStatus = "draft" | "published" | "cancelled"
export type RsvpStatus = "going" | "maybe" | "not_going" | "waitlist"

export const RSVP_LABELS: Record<RsvpStatus, string> = {
  going: "Going",
  maybe: "Maybe",
  not_going: "Not going",
  waitlist: "Waitlist",
}

export const BROADCAST_AUDIENCES = {
  all: "Entire congregation",
  ministries: "Specific ministries",
  leaders: "Leaders only",
  individuals: "Selected individuals",
  registrants: "People registered for this event",
  attendees: "People who attended",
} as const
export type BroadcastAudience = keyof typeof BROADCAST_AUDIENCES

export const BROADCAST_KINDS = {
  announcement: "Announcement",
  reminder: "Reminder",
  follow_up: "Follow-up",
  update: "Update",
  cancellation: "Cancellation",
} as const
export type BroadcastKind = keyof typeof BROADCAST_KINDS

export type BroadcastChannel = "in_app" | "email"

export type ChurchEvent = {
  id: string
  churchId: string
  ministryId: string | null
  title: string
  description: string
  bannerUrl: string | null
  category: EventCategory
  startsAt: string
  endsAt: string | null
  timezone: string
  location: string
  virtualLink: string | null
  registrationUrl: string | null
  contactName: string
  contactEmail: string
  contactPhone: string
  hostingMinistry: string
  speakers: string
  capacity: number | null
  rsvpRequired: boolean
  visibility: EventVisibility
  status: EventStatus
  viewCount: number
  createdAt: string
}

export type EventRegistration = {
  id: string
  eventId: string
  userId: string | null
  name: string
  email: string
  status: RsvpStatus
  attended: boolean
  source: "member" | "public" | "admin"
  createdAt: string
}

export type EventBroadcast = {
  id: string
  eventId: string
  eventTitle: string
  kind: BroadcastKind
  audience: BroadcastAudience
  channels: BroadcastChannel[]
  subject: string
  message: string
  scheduledFor: string | null
  status: "scheduled" | "sending" | "sent" | "failed"
  sentAt: string | null
  recipientCount: number
  inAppCount: number
  emailSent: number
  emailFailed: number
  createdAt: string
}

export type Ministry = {
  id: string
  name: string
  members: { userId: string; name: string; isLeader: boolean }[]
}

export type AppNotification = {
  id: string
  eventId: string | null
  title: string
  body: string
  readAt: string | null
  createdAt: string
}

// ---------------------------------------------------------------------------
// Time zones. Events store UTC instants plus the organiser's IANA zone so a
// "7:00 PM" event reads 7:00 PM in emails, the public page and calendars.
// ---------------------------------------------------------------------------

export const DEFAULT_TIMEZONE = "America/New_York"

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz })
    return true
  } catch {
    return false
  }
}

function zonedParts(utcMs: number, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00"
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  }
}

function offsetMs(utcMs: number, tz: string): number {
  const p = zonedParts(utcMs, tz)
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  return asUtc - Math.floor(utcMs / 1000) * 1000
}

/** "2026-11-08T19:00" interpreted in `tz` → ISO UTC string. */
export function zonedLocalToUtc(local: string, tz: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local)
  if (!m) return null
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])
  let ts = guess - offsetMs(guess, tz)
  // Second pass settles the answer across DST transitions.
  ts = guess - offsetMs(ts, tz)
  return Number.isFinite(ts) ? new Date(ts).toISOString() : null
}

/** ISO UTC → "YYYY-MM-DDTHH:mm" wall-clock time in `tz` (datetime-local value). */
export function utcToZonedLocal(iso: string, tz: string): string {
  const p = zonedParts(new Date(iso).getTime(), tz)
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}

export function formatEventWhen(ev: Pick<ChurchEvent, "startsAt" | "endsAt" | "timezone">): string {
  const tz = isValidTimeZone(ev.timezone) ? ev.timezone : DEFAULT_TIMEZONE
  const start = new Date(ev.startsAt)
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(start)
  const time = (d: Date, withZone: boolean) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
      ...(withZone ? { timeZoneName: "short" as const } : {}),
    }).format(d)

  if (!ev.endsAt) return `${date} · ${time(start, true)}`
  const end = new Date(ev.endsAt)
  const sameDay = utcToZonedLocal(ev.startsAt, tz).slice(0, 10) === utcToZonedLocal(ev.endsAt, tz).slice(0, 10)
  if (sameDay) return `${date} · ${time(start, false)} – ${time(end, true)}`
  const endDate = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    month: "short",
    day: "numeric",
  }).format(end)
  return `${date} ${time(start, false)} – ${endDate} ${time(end, true)}`
}

export function formatEventDay(iso: string, tz: string) {
  const zone = isValidTimeZone(tz) ? tz : DEFAULT_TIMEZONE
  const d = new Date(iso)
  return {
    month: new Intl.DateTimeFormat("en-US", { timeZone: zone, month: "short" }).format(d),
    day: new Intl.DateTimeFormat("en-US", { timeZone: zone, day: "numeric" }).format(d),
  }
}

// ---------------------------------------------------------------------------
// Calendar + sharing
// ---------------------------------------------------------------------------

function icsDate(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
}

function icsEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n")
}

function defaultEnd(ev: Pick<ChurchEvent, "startsAt" | "endsAt">) {
  return ev.endsAt ?? new Date(new Date(ev.startsAt).getTime() + 60 * 60 * 1000).toISOString()
}

export function buildIcs(ev: ChurchEvent, url: string, organizer: string): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Rooted//Event Center//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ev.id}@rootedministry.online`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(ev.startsAt)}`,
    `DTEND:${icsDate(defaultEnd(ev))}`,
    `SUMMARY:${icsEscape(ev.title)}`,
    `DESCRIPTION:${icsEscape([ev.description, ev.virtualLink ? `Join online: ${ev.virtualLink}` : "", url].filter(Boolean).join("\n\n"))}`,
    `LOCATION:${icsEscape(ev.location || ev.virtualLink || "")}`,
    `URL:${url}`,
    `ORGANIZER;CN=${icsEscape(organizer)}:mailto:${ev.contactEmail || "info@rootedministry.online"}`,
    ev.status === "cancelled" ? "STATUS:CANCELLED" : "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
  return lines.join("\r\n")
}

export function googleCalendarUrl(ev: ChurchEvent, url: string): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${icsDate(ev.startsAt)}/${icsDate(defaultEnd(ev))}`,
    details: [ev.description, url].filter(Boolean).join("\n\n"),
    location: ev.location || ev.virtualLink || "",
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function shareLinks(url: string, title: string) {
  const u = encodeURIComponent(url)
  const t = encodeURIComponent(title)
  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    x: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
    whatsapp: `https://wa.me/?text=${t}%20${u}`,
    email: `mailto:?subject=${t}&body=${u}`,
  }
}
