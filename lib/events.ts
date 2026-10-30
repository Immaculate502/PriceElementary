import "server-only"
import { headers } from "next/headers"
import { getSupabaseServerClient } from "./supabase/server"
import { getSupabaseAdminClient } from "./supabase/admin"
import { isSupabaseConfigured } from "./supabase/config"
import { getTenantContext, getChurchById } from "./tenant"
import { sendBatchEmails } from "./email"
import {
  formatEventWhen,
  type AppNotification,
  type BroadcastAudience,
  type BroadcastChannel,
  type ChurchEvent,
  type EventBroadcast,
  type EventRegistration,
  type Ministry,
} from "./event-types"

// ---------------------------------------------------------------------------
// Access
// ---------------------------------------------------------------------------

export type EventAccess = {
  userId: string
  churchId: string | null
  /** Senior pastor / church administrator (role admin) or platform super-admin. */
  isAdmin: boolean
  /** Ministries this user leads. */
  leaderMinistryIds: string[]
  canManage: boolean
}

export async function getEventAccess(): Promise<EventAccess | null> {
  const ctx = await getTenantContext()
  if (!ctx) return null
  const supabase = await getSupabaseServerClient()
  if (!supabase) return null

  const isAdmin = ctx.isSuperAdmin || ctx.role === "admin"
  const { data } = await supabase
    .from("ministry_members")
    .select("ministry_id")
    .eq("user_id", ctx.userId)
    .eq("is_leader", true)
  const leaderMinistryIds = (data ?? []).map((r) => r.ministry_id as string)

  return {
    userId: ctx.userId,
    churchId: ctx.churchId,
    isAdmin,
    leaderMinistryIds,
    canManage: isAdmin || leaderMinistryIds.length > 0,
  }
}

export function canManageEvent(access: EventAccess, ev: Pick<ChurchEvent, "churchId" | "ministryId">) {
  if (access.isAdmin) return true
  return !!ev.ministryId && ev.churchId === access.churchId && access.leaderMinistryIds.includes(ev.ministryId)
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

const EVENT_COLUMNS =
  "id, church_id, ministry_id, title, description, banner_url, category, starts_at, ends_at, timezone, location, virtual_link, registration_url, contact_name, contact_email, contact_phone, hosting_ministry, speakers, capacity, rsvp_required, visibility, status, view_count, created_at"

// Public pages never expose contact phone numbers beyond what the church chose
// to publish, but every column above is organiser-authored display content.
export function mapEvent(d: Record<string, any>): ChurchEvent {
  return {
    id: d.id,
    churchId: d.church_id,
    ministryId: d.ministry_id ?? null,
    title: d.title,
    description: d.description ?? "",
    bannerUrl: d.banner_url ?? null,
    category: d.category,
    startsAt: d.starts_at,
    endsAt: d.ends_at ?? null,
    timezone: d.timezone ?? "America/New_York",
    location: d.location ?? "",
    virtualLink: d.virtual_link ?? null,
    registrationUrl: d.registration_url ?? null,
    contactName: d.contact_name ?? "",
    contactEmail: d.contact_email ?? "",
    contactPhone: d.contact_phone ?? "",
    hostingMinistry: d.hosting_ministry ?? "",
    speakers: d.speakers ?? "",
    capacity: d.capacity ?? null,
    rsvpRequired: !!d.rsvp_required,
    visibility: d.visibility,
    status: d.status,
    viewCount: d.view_count ?? 0,
    createdAt: d.created_at,
  }
}

function mapRegistration(d: Record<string, any>): EventRegistration {
  return {
    id: d.id,
    eventId: d.event_id,
    userId: d.user_id ?? null,
    name: d.name,
    email: d.email,
    status: d.status,
    attended: !!d.attended,
    source: d.source,
    createdAt: d.created_at,
  }
}

// ---------------------------------------------------------------------------
// Session-scoped reads (RLS limits everything to the caller's church)
// ---------------------------------------------------------------------------

export async function getManageableEvents(access: EventAccess): Promise<ChurchEvent[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = await getSupabaseServerClient()
  if (!supabase) return []
  let query = supabase.from("events").select(EVENT_COLUMNS).order("starts_at", { ascending: false })
  if (!access.isAdmin) {
    if (!access.leaderMinistryIds.length) return []
    query = query.in("ministry_id", access.leaderMinistryIds)
  } else if (access.churchId) {
    query = query.eq("church_id", access.churchId)
  }
  const { data } = await query.limit(300)
  return (data ?? []).map(mapEvent)
}

/** Upcoming (and in-progress) events visible to the signed-in member. */
export async function getFeedEvents(): Promise<ChurchEvent[]> {
  const ctx = await getTenantContext()
  if (!ctx?.churchId) return []
  const supabase = await getSupabaseServerClient()
  if (!supabase) return []
  const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("church_id", ctx.churchId)
    .neq("status", "draft")
    .gte("starts_at", since)
    .order("starts_at", { ascending: true })
    .limit(100)
  return (data ?? []).map(mapEvent)
}

export async function getEvent(id: string): Promise<ChurchEvent | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const supabase = await getSupabaseServerClient()
  if (!supabase) return null
  const { data } = await supabase.from("events").select(EVENT_COLUMNS).eq("id", id).maybeSingle()
  return data ? mapEvent(data) : null
}

export async function getEventRegistrations(eventId: string): Promise<EventRegistration[]> {
  const supabase = await getSupabaseServerClient()
  if (!supabase) return []
  const { data } = await supabase
    .from("event_registrations")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true })
  return (data ?? []).map(mapRegistration)
}

export async function getMyRegistrations(userId: string): Promise<Record<string, EventRegistration>> {
  const supabase = await getSupabaseServerClient()
  if (!supabase) return {}
  const { data } = await supabase.from("event_registrations").select("*").eq("user_id", userId)
  return Object.fromEntries((data ?? []).map((r) => [r.event_id as string, mapRegistration(r)]))
}

export type RegistrationCounts = { going: number; maybe: number; waitlist: number; attended: number }

/** Counts per event, computed with the service role so members see live totals. */
export async function getRegistrationCounts(eventIds: string[]): Promise<Record<string, RegistrationCounts>> {
  const out: Record<string, RegistrationCounts> = {}
  if (!eventIds.length) return out
  const admin = getSupabaseAdminClient()
  if (!admin) return out
  const { data } = await admin
    .from("event_registrations")
    .select("event_id, status, attended")
    .in("event_id", eventIds)
  for (const id of eventIds) out[id] = { going: 0, maybe: 0, waitlist: 0, attended: 0 }
  for (const r of data ?? []) {
    const c = out[r.event_id as string]
    if (!c) continue
    if (r.status === "going") c.going++
    else if (r.status === "maybe") c.maybe++
    else if (r.status === "waitlist") c.waitlist++
    if (r.attended) c.attended++
  }
  return out
}

export async function getBroadcasts(opts: { eventId?: string; eventIds?: string[] } = {}): Promise<EventBroadcast[]> {
  const supabase = await getSupabaseServerClient()
  if (!supabase) return []
  let query = supabase
    .from("event_broadcasts")
    .select("*, events(title)")
    .order("created_at", { ascending: false })
    .limit(200)
  if (opts.eventId) query = query.eq("event_id", opts.eventId)
  else if (opts.eventIds) {
    if (!opts.eventIds.length) return []
    query = query.in("event_id", opts.eventIds)
  }
  const { data } = await query
  return (data ?? []).map((d: Record<string, any>) => ({
    id: d.id,
    eventId: d.event_id,
    eventTitle: d.events?.title ?? "Event",
    kind: d.kind,
    audience: d.audience,
    channels: d.channels ?? [],
    subject: d.subject,
    message: d.message,
    scheduledFor: d.scheduled_for ?? null,
    status: d.status,
    sentAt: d.sent_at ?? null,
    recipientCount: d.recipient_count ?? 0,
    inAppCount: d.in_app_count ?? 0,
    emailSent: d.email_sent ?? 0,
    emailFailed: d.email_failed ?? 0,
    createdAt: d.created_at,
  }))
}

export async function getMinistries(): Promise<Ministry[]> {
  const ctx = await getTenantContext()
  if (!ctx?.churchId) return []
  const supabase = await getSupabaseServerClient()
  if (!supabase) return []
  const { data } = await supabase
    .from("ministries")
    .select("id, name, ministry_members(user_id, is_leader, profiles(full_name))")
    .eq("church_id", ctx.churchId)
    .order("name")
  return (data ?? []).map((m: Record<string, any>) => ({
    id: m.id,
    name: m.name,
    members: (m.ministry_members ?? []).map((mm: Record<string, any>) => ({
      userId: mm.user_id,
      name: mm.profiles?.full_name ?? "Member",
      isLeader: !!mm.is_leader,
    })),
  }))
}

export type MemberLite = { id: string; name: string; email: string; role: string }

export async function getChurchMembersLite(): Promise<MemberLite[]> {
  const ctx = await getTenantContext()
  if (!ctx?.churchId) return []
  const supabase = await getSupabaseServerClient()
  if (!supabase) return []
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("church_id", ctx.churchId)
    .order("full_name")
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.full_name ?? "Member",
    email: p.email ?? "",
    role: p.role ?? "member",
  }))
}

export async function getMyNotifications(limit = 20): Promise<AppNotification[]> {
  const ctx = await getTenantContext()
  if (!ctx) return []
  const supabase = await getSupabaseServerClient()
  if (!supabase) return []
  const { data } = await supabase
    .from("notifications")
    .select("id, event_id, title, body, read_at, created_at")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(limit)
  return (data ?? []).map((n) => ({
    id: n.id,
    eventId: n.event_id ?? null,
    title: n.title,
    body: n.body ?? "",
    readAt: n.read_at ?? null,
    createdAt: n.created_at,
  }))
}

export type EventAnalytics = {
  totalEvents: number
  upcomingEvents: number
  totalRegistrations: number
  totalAttended: number
  totalViews: number
  attendanceRate: number
  top: { event: ChurchEvent; registrations: number; attended: number }[]
}

export function buildAnalytics(events: ChurchEvent[], counts: Record<string, RegistrationCounts>): EventAnalytics {
  const now = Date.now()
  let totalRegistrations = 0
  let totalAttended = 0
  let pastRegistrations = 0
  let totalViews = 0
  for (const ev of events) {
    const c = counts[ev.id]
    const regs = c ? c.going + c.maybe + c.waitlist : 0
    totalRegistrations += regs
    totalAttended += c?.attended ?? 0
    totalViews += ev.viewCount
    if (new Date(ev.startsAt).getTime() < now) pastRegistrations += c?.going ?? 0
  }
  const top = events
    .filter((e) => e.status !== "draft")
    .map((event) => {
      const c = counts[event.id]
      return { event, registrations: c ? c.going + c.maybe + c.waitlist : 0, attended: c?.attended ?? 0 }
    })
    .sort((a, b) => b.registrations - a.registrations)
    .slice(0, 5)

  return {
    totalEvents: events.length,
    upcomingEvents: events.filter((e) => e.status === "published" && new Date(e.startsAt).getTime() >= now).length,
    totalRegistrations,
    totalAttended,
    totalViews,
    attendanceRate: pastRegistrations ? Math.round((totalAttended / pastRegistrations) * 100) : 0,
    top,
  }
}

// ---------------------------------------------------------------------------
// Public (anonymous) reads — service role, restricted to published public events
// ---------------------------------------------------------------------------

export async function getPublicEvents(churchId: string): Promise<ChurchEvent[]> {
  const admin = getSupabaseAdminClient()
  if (!admin) return []
  const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  const { data } = await admin
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("church_id", churchId)
    .eq("visibility", "public")
    .neq("status", "draft")
    .gte("starts_at", since)
    .order("starts_at", { ascending: true })
    .limit(100)
  return (data ?? []).map(mapEvent)
}

export async function getPublicEvent(churchId: string, id: string): Promise<ChurchEvent | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const admin = getSupabaseAdminClient()
  if (!admin) return null
  const { data } = await admin
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("id", id)
    .eq("church_id", churchId)
    .eq("visibility", "public")
    .neq("status", "draft")
    .maybeSingle()
  return data ? mapEvent(data) : null
}

// ---------------------------------------------------------------------------
// URLs
// ---------------------------------------------------------------------------

export async function siteOrigin(): Promise<string> {
  try {
    const h = await headers()
    const origin = h.get("origin")
    if (origin) return origin
    const host = h.get("x-forwarded-host") ?? h.get("host")
    if (host) return `${host.startsWith("localhost") ? "http" : "https"}://${host}`
  } catch {
    // Outside a request (e.g. cron) — fall through.
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  return "https://rootedministry.online"
}

export function memberEventUrl(origin: string, eventId: string) {
  return `${origin}/events/${eventId}`
}

export function publicEventUrl(origin: string, churchSlug: string, eventId: string) {
  return `${origin}/church/${churchSlug}/events/${eventId}`
}

// ---------------------------------------------------------------------------
// Email template
// ---------------------------------------------------------------------------

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function renderEventEmail(args: {
  churchName: string
  heading: string
  message: string
  event: ChurchEvent
  url: string
}) {
  const { churchName, heading, message, event, url } = args
  const when = formatEventWhen(event)
  const where = event.location || (event.virtualLink ? "Online" : "")
  const paragraphs = escapeHtml(message)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.6">${p.replace(/\n/g, "<br>")}</p>`)
    .join("")

  const html = `<!doctype html><html><body style="margin:0;background:#f6f3ec;font-family:Georgia,'Times New Roman',serif;color:#2a2a28">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <p style="margin:0 0 6px;font:600 12px/1 Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#8a6d1f">${escapeHtml(churchName)}</p>
    <h1 style="margin:0 0 20px;font-size:24px;line-height:1.3">${escapeHtml(heading)}</h1>
    <div style="font:15px/1.6 Arial,sans-serif">${paragraphs}</div>
    <div style="margin:22px 0;padding:16px;border-radius:12px;background:#ffffff;border:1px solid #e6e0d2;font:14px/1.5 Arial,sans-serif">
      <p style="margin:0 0 4px;font-weight:700">${escapeHtml(event.title)}</p>
      <p style="margin:0">${escapeHtml(when)}</p>
      ${where ? `<p style="margin:0">${escapeHtml(where)}</p>` : ""}
      ${event.status === "cancelled" ? `<p style="margin:8px 0 0;color:#a23a2a;font-weight:700">This event has been cancelled.</p>` : ""}
    </div>
    <a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#1f4d3a;color:#ffffff;text-decoration:none;font:600 14px Arial,sans-serif">View event</a>
    <p style="margin:28px 0 0;font:12px/1.5 Arial,sans-serif;color:#7a7568">Sent by ${escapeHtml(churchName)} through Rooted.</p>
  </div></body></html>`

  const text = `${heading}\n\n${message}\n\n${event.title}\n${when}${where ? `\n${where}` : ""}${
    event.status === "cancelled" ? "\nThis event has been cancelled." : ""
  }\n\nView event: ${url}\n\n— ${churchName}`

  return { html, text }
}

// ---------------------------------------------------------------------------
// Broadcast delivery (service role, after the sender's permission was checked
// when the broadcast row was inserted under RLS)
// ---------------------------------------------------------------------------

type Recipient = { userId: string | null; email: string; name: string }

async function resolveRecipients(
  admin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  churchId: string,
  eventId: string,
  audience: BroadcastAudience,
  ministryIds: string[],
  recipientIds: string[],
): Promise<Recipient[]> {
  const byKey = new Map<string, Recipient>()
  const add = (r: Recipient) => {
    const key = r.userId ?? `email:${r.email.toLowerCase()}`
    if (!byKey.has(key)) byKey.set(key, r)
  }
  const addProfiles = (rows: Record<string, any>[] | null) => {
    for (const p of rows ?? []) add({ userId: p.id, email: p.email ?? "", name: p.full_name ?? "Member" })
  }

  if (audience === "all") {
    const { data } = await admin.from("profiles").select("id, email, full_name").eq("church_id", churchId)
    addProfiles(data)
  } else if (audience === "leaders") {
    const { data: admins } = await admin
      .from("profiles")
      .select("id, email, full_name")
      .eq("church_id", churchId)
      .eq("role", "admin")
    addProfiles(admins)
    const { data: leads } = await admin
      .from("ministry_members")
      .select("profiles(id, email, full_name)")
      .eq("church_id", churchId)
      .eq("is_leader", true)
    addProfiles((leads ?? []).map((l: Record<string, any>) => l.profiles).filter(Boolean))
  } else if (audience === "ministries") {
    if (ministryIds.length) {
      const { data } = await admin
        .from("ministry_members")
        .select("profiles(id, email, full_name)")
        .eq("church_id", churchId)
        .in("ministry_id", ministryIds)
      addProfiles((data ?? []).map((l: Record<string, any>) => l.profiles).filter(Boolean))
    }
  } else if (audience === "individuals") {
    if (recipientIds.length) {
      const { data } = await admin
        .from("profiles")
        .select("id, email, full_name")
        .eq("church_id", churchId)
        .in("id", recipientIds)
      addProfiles(data)
    }
  } else {
    let query = admin
      .from("event_registrations")
      .select("user_id, email, name")
      .eq("event_id", eventId)
      .eq("church_id", churchId)
    query = audience === "attendees" ? query.eq("attended", true) : query.in("status", ["going", "maybe", "waitlist"])
    const { data } = await query
    for (const r of data ?? []) add({ userId: r.user_id ?? null, email: r.email ?? "", name: r.name ?? "Guest" })
  }

  return [...byKey.values()]
}

/** Delivers one broadcast. Claims it atomically so it is never sent twice. */
export async function dispatchBroadcast(broadcastId: string, origin: string): Promise<{ ok: boolean; message: string }> {
  const admin = getSupabaseAdminClient()
  if (!admin) return { ok: false, message: "Service-role key missing." }

  const { data: claimed } = await admin
    .from("event_broadcasts")
    .update({ status: "sending" })
    .eq("id", broadcastId)
    .eq("status", "scheduled")
    .select("*")
    .maybeSingle()
  if (!claimed) return { ok: false, message: "This message was already sent." }

  const fail = async (error: string) => {
    await admin.from("event_broadcasts").update({ status: "failed", error }).eq("id", broadcastId)
    return { ok: false, message: error }
  }

  const { data: evRow } = await admin.from("events").select(EVENT_COLUMNS).eq("id", claimed.event_id).maybeSingle()
  if (!evRow) return fail("The event no longer exists.")
  const event = mapEvent(evRow)
  const church = await getChurchById(claimed.church_id)
  if (!church) return fail("Church not found.")

  const recipients = await resolveRecipients(
    admin,
    claimed.church_id,
    claimed.event_id,
    claimed.audience,
    claimed.ministry_ids ?? [],
    claimed.recipient_ids ?? [],
  )
  const channels = (claimed.channels ?? []) as BroadcastChannel[]

  let inAppCount = 0
  if (channels.includes("in_app")) {
    const rows = recipients
      .filter((r) => r.userId)
      .map((r) => ({
        church_id: claimed.church_id,
        user_id: r.userId,
        event_id: claimed.event_id,
        broadcast_id: claimed.id,
        title: claimed.subject,
        body: claimed.message,
      }))
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await admin.from("notifications").insert(rows.slice(i, i + 500))
      if (!error) inAppCount += Math.min(500, rows.length - i)
    }
  }

  let emailSent = 0
  let emailFailed = 0
  let emailError: string | undefined
  if (channels.includes("email")) {
    const emailRecipients = recipients.filter((r) => /.+@.+\..+/.test(r.email))
    const memberUrl = memberEventUrl(origin, event.id)
    const pubUrl = event.visibility === "public" ? publicEventUrl(origin, church.slug, event.id) : memberUrl
    const result = await sendBatchEmails(
      emailRecipients.map((r) => {
        const { html, text } = renderEventEmail({
          churchName: church.name,
          heading: claimed.subject,
          message: claimed.message,
          event,
          url: r.userId ? memberUrl : pubUrl,
        })
        return {
          to: r.email,
          subject: `${claimed.subject} — ${church.name}`,
          html,
          text,
          replyTo: event.contactEmail || church.contactEmail || undefined,
        }
      }),
    )
    emailSent = result.sent
    emailFailed = result.failed
    emailError = result.error
    if (emailError) console.error("[events] broadcast email error:", emailError)
  }

  const nothingDelivered = recipients.length > 0 && inAppCount === 0 && emailSent === 0
  await admin
    .from("event_broadcasts")
    .update({
      status: nothingDelivered ? "failed" : "sent",
      sent_at: new Date().toISOString(),
      recipient_count: recipients.length,
      in_app_count: inAppCount,
      email_sent: emailSent,
      email_failed: emailFailed,
      error: emailError ?? null,
    })
    .eq("id", broadcastId)

  if (nothingDelivered) return { ok: false, message: "No messages could be delivered." }
  return {
    ok: true,
    message:
      recipients.length === 0
        ? "Sent, but nobody matched that audience yet."
        : `Delivered to ${recipients.length} ${recipients.length === 1 ? "person" : "people"}${
            emailFailed ? ` (${emailFailed} emails failed)` : ""
          }.`,
  }
}

/** Sends any scheduled broadcasts that are now due. Optionally limited to one church. */
export async function processDueBroadcasts(origin: string, churchId?: string | null) {
  const admin = getSupabaseAdminClient()
  if (!admin) return 0
  let query = admin
    .from("event_broadcasts")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_for", new Date().toISOString())
    .limit(20)
  if (churchId) query = query.eq("church_id", churchId)
  const { data } = await query
  let processed = 0
  for (const row of data ?? []) {
    const result = await dispatchBroadcast(row.id as string, origin)
    if (result.ok) processed++
  }
  return processed
}
