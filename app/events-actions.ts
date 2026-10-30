"use server"

import { randomUUID } from "node:crypto"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { getTenantContext, getChurchBySlug, getChurchById, churchIsEntitled } from "@/lib/tenant"
import { sendEmail } from "@/lib/email"
import {
  canManageEvent,
  dispatchBroadcast,
  getEvent,
  getEventAccess,
  getPublicEvent,
  memberEventUrl,
  publicEventUrl,
  renderEventEmail,
  siteOrigin,
} from "@/lib/events"
import {
  BROADCAST_AUDIENCES,
  BROADCAST_KINDS,
  EVENT_CATEGORIES,
  EVENT_VISIBILITY,
  isValidTimeZone,
  zonedLocalToUtc,
  type ChurchEvent,
} from "@/lib/event-types"

export type EventActionResult = { ok: boolean; message: string }

const BASE_PATHS = { admin: "/admin/events", leader: "/events/manage" } as const
const MAX_BANNER_BYTES = 5 * 1024 * 1024
const BANNER_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
}

function str(fd: FormData, key: string, max = 500) {
  return String(fd.get(key) ?? "").trim().slice(0, max)
}

function optionalUrl(value: string): string | null | false {
  if (!value) return null
  try {
    const u = new URL(value)
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : false
  } catch {
    return false
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function revalidateEvents() {
  revalidatePath("/admin/events", "layout")
  revalidatePath("/events", "layout")
  revalidatePath("/church", "layout")
}

// ---------------------------------------------------------------------------
// Create / edit
// ---------------------------------------------------------------------------

export async function saveEvent(_prev: EventActionResult | null, fd: FormData): Promise<EventActionResult> {
  const access = await getEventAccess()
  if (!access?.canManage || !access.churchId) {
    return { ok: false, message: "You don't have permission to manage events." }
  }
  const base = BASE_PATHS[(str(fd, "base") as keyof typeof BASE_PATHS)] ?? BASE_PATHS.admin

  const eventId = str(fd, "eventId", 40)
  const title = str(fd, "title", 200)
  const description = str(fd, "description", 6000)
  const category = str(fd, "category")
  const visibility = str(fd, "visibility")
  const timezone = str(fd, "timezone", 80)
  const ministryId = str(fd, "ministryId", 40) || null
  const intent = str(fd, "intent")
  const capacityRaw = str(fd, "capacity", 10)

  if (!title) return { ok: false, message: "Give the event a title." }
  if (title.length > 160) return { ok: false, message: "Keep the title under 160 characters." }
  if (description.length > 5000) return { ok: false, message: "Keep the description under 5000 characters." }
  if (!(category in EVENT_CATEGORIES)) return { ok: false, message: "Choose a category." }
  if (!(visibility in EVENT_VISIBILITY)) return { ok: false, message: "Choose who can see this event." }
  if (!isValidTimeZone(timezone)) return { ok: false, message: "Your time zone could not be detected." }

  const startsAt = zonedLocalToUtc(str(fd, "start", 20), timezone)
  if (!startsAt) return { ok: false, message: "Choose a start date and time." }
  const endRaw = str(fd, "end", 20)
  const endsAt = endRaw ? zonedLocalToUtc(endRaw, timezone) : null
  if (endRaw && !endsAt) return { ok: false, message: "The end time is not valid." }
  if (endsAt && endsAt < startsAt) return { ok: false, message: "The event can't end before it starts." }

  const virtualLink = optionalUrl(str(fd, "virtualLink", 500))
  const registrationUrl = optionalUrl(str(fd, "registrationUrl", 500))
  if (virtualLink === false) return { ok: false, message: "The virtual meeting link must start with https://." }
  if (registrationUrl === false) return { ok: false, message: "The registration link must start with https://." }

  const contactEmail = str(fd, "contactEmail", 254)
  if (contactEmail && !EMAIL_RE.test(contactEmail)) return { ok: false, message: "The contact email is not valid." }

  let capacity: number | null = null
  if (capacityRaw) {
    capacity = Number(capacityRaw)
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000) {
      return { ok: false, message: "Capacity must be a whole number above zero." }
    }
  }

  // Ministry leaders may only create events for a ministry they lead.
  if (!access.isAdmin && (!ministryId || !access.leaderMinistryIds.includes(ministryId))) {
    return { ok: false, message: "Choose one of the ministries you lead." }
  }
  if (visibility === "ministry" && !ministryId) {
    return { ok: false, message: "Choose the hosting ministry for a ministry-only event." }
  }

  const supabase = await getSupabaseServerClient()
  const admin = getSupabaseAdminClient()
  if (!supabase || !admin) return { ok: false, message: "Database unavailable." }

  let existing: ChurchEvent | null = null
  if (eventId) {
    existing = await getEvent(eventId)
    if (!existing || !canManageEvent(access, existing)) return { ok: false, message: "Event not found." }
  }

  if (ministryId) {
    const { data: ministry } = await supabase
      .from("ministries")
      .select("id")
      .eq("id", ministryId)
      .eq("church_id", access.churchId)
      .maybeSingle()
    if (!ministry) return { ok: false, message: "That ministry was not found." }
  }

  // Banner / flyer upload (stored in a public bucket, written server-side).
  let bannerUrl: string | null | undefined = undefined
  const banner = fd.get("banner")
  if (banner instanceof File && banner.size > 0) {
    const ext = BANNER_TYPES[banner.type]
    if (!ext) return { ok: false, message: "Upload a JPG, PNG, WebP or GIF image." }
    if (banner.size > MAX_BANNER_BYTES) return { ok: false, message: "Keep the banner under 5 MB." }
    const path = `${access.churchId}/${randomUUID()}.${ext}`
    const { error: upErr } = await admin.storage
      .from("event-banners")
      .upload(path, Buffer.from(await banner.arrayBuffer()), { contentType: banner.type, upsert: false })
    if (upErr) return { ok: false, message: `Banner upload failed: ${upErr.message}` }
    bannerUrl = admin.storage.from("event-banners").getPublicUrl(path).data.publicUrl
  } else if (str(fd, "removeBanner") === "true") {
    bannerUrl = null
  }

  const status =
    intent === "publish" ? "published" : intent === "draft" ? "draft" : (existing?.status ?? "draft")

  const values = {
    title,
    description,
    category,
    visibility,
    timezone,
    ministry_id: ministryId,
    starts_at: startsAt,
    ends_at: endsAt,
    location: str(fd, "location", 300),
    virtual_link: virtualLink,
    registration_url: registrationUrl,
    contact_name: str(fd, "contactName", 120),
    contact_email: contactEmail,
    contact_phone: str(fd, "contactPhone", 40),
    hosting_ministry: str(fd, "hostingMinistry", 120),
    speakers: str(fd, "speakers", 500),
    capacity,
    rsvp_required: str(fd, "rsvpRequired") === "on",
    status,
    ...(bannerUrl !== undefined ? { banner_url: bannerUrl } : {}),
  }

  if (existing) {
    const { error } = await supabase.from("events").update(values).eq("id", existing.id)
    if (error) return { ok: false, message: error.message }
    revalidateEvents()
    return { ok: true, message: status === "published" ? "Event saved and published." : "Event saved." }
  }

  const { data: created, error } = await supabase
    .from("events")
    .insert({ ...values, church_id: access.churchId, created_by: access.userId })
    .select("id")
    .single()
  if (error || !created) return { ok: false, message: error?.message ?? "Could not create the event." }

  revalidateEvents()
  redirect(`${base}/${created.id}?created=1`)
}

export async function setEventStatus(_prev: EventActionResult | null, fd: FormData): Promise<EventActionResult> {
  const access = await getEventAccess()
  if (!access?.canManage) return { ok: false, message: "You don't have permission to manage events." }
  const ev = await getEvent(str(fd, "eventId", 40))
  if (!ev || !canManageEvent(access, ev)) return { ok: false, message: "Event not found." }

  const status = str(fd, "status")
  if (!["draft", "published", "cancelled"].includes(status)) return { ok: false, message: "Invalid status." }

  const supabase = await getSupabaseServerClient()
  if (!supabase) return { ok: false, message: "Database unavailable." }
  const { error } = await supabase.from("events").update({ status }).eq("id", ev.id)
  if (error) return { ok: false, message: error.message }

  let note = ""
  if (status === "cancelled" && str(fd, "notify") === "on") {
    const { data: row, error: bErr } = await supabase
      .from("event_broadcasts")
      .insert({
        event_id: ev.id,
        church_id: ev.churchId,
        created_by: access.userId,
        kind: "cancellation",
        audience: "registrants",
        channels: ["in_app", "email"],
        subject: `Cancelled: ${ev.title}`,
        message: `We're sorry — "${ev.title}" has been cancelled. Thank you for your understanding.`,
      })
      .select("id")
      .single()
    if (!bErr && row) {
      const sent = await dispatchBroadcast(row.id, await siteOrigin())
      note = ` ${sent.message}`
    }
  }

  revalidateEvents()
  const label = status === "published" ? "Event published." : status === "draft" ? "Event moved to drafts." : "Event cancelled."
  return { ok: true, message: label + note }
}

export async function deleteEvent(fd: FormData): Promise<void> {
  const access = await getEventAccess()
  const base = BASE_PATHS[(str(fd, "base") as keyof typeof BASE_PATHS)] ?? BASE_PATHS.admin
  if (!access?.canManage) redirect(base)
  const ev = await getEvent(str(fd, "eventId", 40))
  if (ev && canManageEvent(access, ev)) {
    const supabase = await getSupabaseServerClient()
    await supabase?.from("events").delete().eq("id", ev.id)
    revalidateEvents()
  }
  redirect(base)
}

// ---------------------------------------------------------------------------
// Broadcasts
// ---------------------------------------------------------------------------

export async function sendBroadcast(_prev: EventActionResult | null, fd: FormData): Promise<EventActionResult> {
  const access = await getEventAccess()
  if (!access?.canManage) return { ok: false, message: "You don't have permission to send messages." }
  const ev = await getEvent(str(fd, "eventId", 40))
  if (!ev || !canManageEvent(access, ev)) return { ok: false, message: "Event not found." }

  const kind = str(fd, "kind")
  const audience = str(fd, "audience")
  const subject = str(fd, "subject", 200)
  const message = str(fd, "message", 5000)
  const channels = fd.getAll("channels").map(String).filter((c) => c === "in_app" || c === "email")
  const ministryIds = fd.getAll("ministryIds").map(String).filter((v) => /^[0-9a-f-]{36}$/i.test(v))
  const recipientIds = fd.getAll("recipientIds").map(String).filter((v) => /^[0-9a-f-]{36}$/i.test(v))

  if (!(kind in BROADCAST_KINDS)) return { ok: false, message: "Choose a message type." }
  if (!(audience in BROADCAST_AUDIENCES)) return { ok: false, message: "Choose who should receive it." }
  if (!subject) return { ok: false, message: "Add a subject." }
  if (subject.length > 160) return { ok: false, message: "Keep the subject under 160 characters." }
  if (!message) return { ok: false, message: "Write a message." }
  if (message.length > 4000) return { ok: false, message: "Keep the message under 4000 characters." }
  if (!channels.length) return { ok: false, message: "Choose at least one delivery channel." }
  if (audience === "ministries" && !ministryIds.length) return { ok: false, message: "Pick at least one ministry." }
  if (audience === "individuals" && !recipientIds.length) return { ok: false, message: "Pick at least one person." }
  if (!access.isAdmin && (audience === "all" || audience === "leaders")) {
    return { ok: false, message: "Only church administrators can message the whole church or all leaders." }
  }
  if (!access.isAdmin && audience === "ministries" && ministryIds.some((id) => !access.leaderMinistryIds.includes(id))) {
    return { ok: false, message: "You can only message ministries you lead." }
  }

  let scheduledFor: string | null = null
  const sendAt = str(fd, "sendAt", 20)
  if (sendAt) {
    const tz = str(fd, "timezone", 80)
    if (!isValidTimeZone(tz)) return { ok: false, message: "Your time zone could not be detected." }
    scheduledFor = zonedLocalToUtc(sendAt, tz)
    if (!scheduledFor) return { ok: false, message: "The scheduled time is not valid." }
    if (new Date(scheduledFor).getTime() < Date.now() - 60_000) {
      return { ok: false, message: "Pick a time in the future, or leave it blank to send now." }
    }
  }

  const supabase = await getSupabaseServerClient()
  if (!supabase) return { ok: false, message: "Database unavailable." }
  const { data: row, error } = await supabase
    .from("event_broadcasts")
    .insert({
      event_id: ev.id,
      church_id: ev.churchId,
      created_by: access.userId,
      kind,
      audience,
      ministry_ids: ministryIds,
      recipient_ids: recipientIds,
      channels,
      subject,
      message,
      scheduled_for: scheduledFor,
    })
    .select("id")
    .single()
  if (error || !row) return { ok: false, message: error?.message ?? "Could not save the message." }

  revalidateEvents()
  if (scheduledFor && new Date(scheduledFor).getTime() > Date.now()) {
    return { ok: true, message: "Message scheduled." }
  }
  return dispatchBroadcast(row.id, await siteOrigin())
}

export async function cancelBroadcast(fd: FormData): Promise<void> {
  const access = await getEventAccess()
  if (!access?.canManage) return
  const supabase = await getSupabaseServerClient()
  await supabase?.from("event_broadcasts").delete().eq("id", str(fd, "broadcastId", 40)).eq("status", "scheduled")
  revalidateEvents()
}

// ---------------------------------------------------------------------------
// Member RSVP
// ---------------------------------------------------------------------------

async function goingCount(eventId: string) {
  const admin = getSupabaseAdminClient()
  if (!admin) return 0
  const { count } = await admin
    .from("event_registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("status", "going")
  return count ?? 0
}

async function sendConfirmation(ev: ChurchEvent, to: string, name: string, status: string, url: string) {
  const church = await getChurchById(ev.churchId)
  if (!church || !EMAIL_RE.test(to)) return
  const waitlisted = status === "waitlist"
  const { html, text } = renderEventEmail({
    churchName: church.name,
    heading: waitlisted ? "You're on the waitlist" : "You're registered",
    message: waitlisted
      ? `Hi ${name}, this event is currently full, so we've added you to the waitlist. We'll let you know if a spot opens up.`
      : `Hi ${name}, thank you for registering. We look forward to seeing you!`,
    event: ev,
    url,
  })
  const result = await sendEmail({
    to,
    subject: `${waitlisted ? "Waitlisted" : "Registered"}: ${ev.title}`,
    html,
    text,
    replyTo: ev.contactEmail || church.contactEmail || undefined,
  })
  if (!result.ok) console.error("[events] confirmation email failed:", result.error)
}

export async function rsvpEvent(_prev: EventActionResult | null, fd: FormData): Promise<EventActionResult> {
  const ctx = await getTenantContext()
  if (!ctx?.churchId) return { ok: false, message: "Sign in to RSVP." }
  const ev = await getEvent(str(fd, "eventId", 40))
  if (!ev || ev.churchId !== ctx.churchId) return { ok: false, message: "Event not found." }
  if (ev.status !== "published") return { ok: false, message: "This event isn't accepting RSVPs." }

  const requested = str(fd, "status")
  if (!["going", "maybe", "not_going"].includes(requested)) return { ok: false, message: "Invalid response." }

  const supabase = await getSupabaseServerClient()
  if (!supabase) return { ok: false, message: "Database unavailable." }
  const { data: existing } = await supabase
    .from("event_registrations")
    .select("id, status")
    .eq("event_id", ev.id)
    .eq("user_id", ctx.userId)
    .maybeSingle()

  let status = requested
  if (requested === "going" && existing?.status !== "going" && ev.capacity && (await goingCount(ev.id)) >= ev.capacity) {
    status = "waitlist"
  }

  const row = { status, name: ctx.fullName, email: ctx.email || "unknown@member" }
  const { error } = existing
    ? await supabase.from("event_registrations").update(row).eq("id", existing.id)
    : await supabase
        .from("event_registrations")
        .insert({ ...row, event_id: ev.id, church_id: ev.churchId, user_id: ctx.userId, source: "member" })
  if (error) return { ok: false, message: error.message }

  if ((status === "going" || status === "waitlist") && existing?.status !== status && ctx.email) {
    await sendConfirmation(ev, ctx.email, ctx.fullName, status, memberEventUrl(await siteOrigin(), ev.id))
  }

  revalidateEvents()
  return {
    ok: true,
    message:
      status === "waitlist"
        ? "This event is full — you're on the waitlist."
        : status === "going"
          ? "You're going! A confirmation is on its way."
          : status === "maybe"
            ? "Marked as maybe."
            : "Thanks for letting us know.",
  }
}

// ---------------------------------------------------------------------------
// Public visitor registration
// ---------------------------------------------------------------------------

export async function registerPublic(_prev: EventActionResult | null, fd: FormData): Promise<EventActionResult> {
  // Honeypot: real visitors never see or fill this field.
  if (str(fd, "website")) return { ok: true, message: "You're registered!" }

  const church = await getChurchBySlug(str(fd, "slug", 80))
  if (!church || !churchIsEntitled(church)) return { ok: false, message: "This event page is unavailable." }
  const ev = await getPublicEvent(church.id, str(fd, "eventId", 40))
  if (!ev || ev.status !== "published") return { ok: false, message: "This event isn't accepting registrations." }
  if (new Date(ev.endsAt ?? ev.startsAt).getTime() < Date.now()) {
    return { ok: false, message: "This event has already taken place." }
  }

  const name = str(fd, "name", 120)
  const email = str(fd, "email", 254).toLowerCase()
  if (!name) return { ok: false, message: "Enter your name." }
  if (!EMAIL_RE.test(email)) return { ok: false, message: "Enter a valid email address." }

  const admin = getSupabaseAdminClient()
  if (!admin) return { ok: false, message: "Registration is temporarily unavailable." }

  const { data: existing } = await admin
    .from("event_registrations")
    .select("id, status")
    .eq("event_id", ev.id)
    .ilike("email", email)
    .maybeSingle()
  if (existing && existing.status !== "not_going") {
    return { ok: true, message: "You're already registered — see you there!" }
  }

  const status = ev.capacity && (await goingCount(ev.id)) >= ev.capacity ? "waitlist" : "going"
  const { error } = existing
    ? await admin.from("event_registrations").update({ status, name }).eq("id", existing.id)
    : await admin
        .from("event_registrations")
        .insert({ event_id: ev.id, church_id: church.id, name, email, status, source: "public" })
  if (error) return { ok: false, message: "Could not register. Please try again." }

  await sendConfirmation(ev, email, name, status, publicEventUrl(await siteOrigin(), church.slug, ev.id))
  revalidateEvents()
  return {
    ok: true,
    message: status === "waitlist" ? "This event is full — you've been added to the waitlist." : "You're registered! Check your email for details.",
  }
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

export async function setAttendance(fd: FormData): Promise<void> {
  const access = await getEventAccess()
  if (!access?.canManage) return
  const attended = str(fd, "attended") === "true"
  const supabase = await getSupabaseServerClient()
  // RLS + the attendance guard trigger only allow managers of this event.
  await supabase
    ?.from("event_registrations")
    .update({ attended, attended_at: attended ? new Date().toISOString() : null })
    .eq("id", str(fd, "registrationId", 40))
  revalidateEvents()
}

export async function addWalkIn(_prev: EventActionResult | null, fd: FormData): Promise<EventActionResult> {
  const access = await getEventAccess()
  if (!access?.canManage) return { ok: false, message: "You don't have permission." }
  const ev = await getEvent(str(fd, "eventId", 40))
  if (!ev || !canManageEvent(access, ev)) return { ok: false, message: "Event not found." }

  const name = str(fd, "name", 120)
  const email = str(fd, "email", 254).toLowerCase()
  if (!name) return { ok: false, message: "Enter the attendee's name." }
  if (!EMAIL_RE.test(email)) return { ok: false, message: "Enter a valid email address." }

  const admin = getSupabaseAdminClient()
  if (!admin) return { ok: false, message: "Database unavailable." }
  const { data: member } = await admin
    .from("profiles")
    .select("id")
    .eq("church_id", ev.churchId)
    .ilike("email", email)
    .maybeSingle()
  const { data: existing } = await admin
    .from("event_registrations")
    .select("id")
    .eq("event_id", ev.id)
    .ilike("email", email)
    .maybeSingle()

  const now = new Date().toISOString()
  const { error } = existing
    ? await admin.from("event_registrations").update({ attended: true, attended_at: now }).eq("id", existing.id)
    : await admin.from("event_registrations").insert({
        event_id: ev.id,
        church_id: ev.churchId,
        user_id: member?.id ?? null,
        name,
        email,
        status: "going",
        attended: true,
        attended_at: now,
        source: "admin",
      })
  if (error) return { ok: false, message: error.message }
  revalidateEvents()
  return { ok: true, message: `${name} checked in.` }
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function markNotificationsRead(): Promise<void> {
  const ctx = await getTenantContext()
  if (!ctx) return
  const supabase = await getSupabaseServerClient()
  await supabase
    ?.from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", ctx.userId)
    .is("read_at", null)
  revalidatePath("/events", "layout")
}

// ---------------------------------------------------------------------------
// Ministries (church administrators only — enforced by RLS too)
// ---------------------------------------------------------------------------

async function requireAdminAccess() {
  const access = await getEventAccess()
  return access?.isAdmin && access.churchId ? access : null
}

export async function createMinistry(_prev: EventActionResult | null, fd: FormData): Promise<EventActionResult> {
  const access = await requireAdminAccess()
  if (!access) return { ok: false, message: "Only church administrators can manage ministries." }
  const name = str(fd, "name", 100)
  if (!name) return { ok: false, message: "Name the ministry." }
  if (name.length > 80) return { ok: false, message: "Keep the name under 80 characters." }
  const supabase = await getSupabaseServerClient()
  if (!supabase) return { ok: false, message: "Database unavailable." }
  const { error } = await supabase.from("ministries").insert({ name, church_id: access.churchId })
  if (error) {
    return { ok: false, message: error.code === "23505" ? "That ministry already exists." : error.message }
  }
  revalidateEvents()
  return { ok: true, message: `${name} added.` }
}

export async function deleteMinistry(fd: FormData): Promise<void> {
  if (!(await requireAdminAccess())) return
  const supabase = await getSupabaseServerClient()
  await supabase?.from("ministries").delete().eq("id", str(fd, "ministryId", 40))
  revalidateEvents()
}

export async function addMinistryMember(_prev: EventActionResult | null, fd: FormData): Promise<EventActionResult> {
  const access = await requireAdminAccess()
  if (!access) return { ok: false, message: "Only church administrators can manage ministries." }
  const ministryId = str(fd, "ministryId", 40)
  const userId = str(fd, "userId", 40)
  if (!ministryId || !userId) return { ok: false, message: "Choose a member." }
  const supabase = await getSupabaseServerClient()
  if (!supabase) return { ok: false, message: "Database unavailable." }
  const { error } = await supabase.from("ministry_members").upsert(
    { ministry_id: ministryId, user_id: userId, church_id: access.churchId, is_leader: str(fd, "isLeader") === "on" },
    { onConflict: "ministry_id,user_id" },
  )
  if (error) return { ok: false, message: error.message }
  revalidateEvents()
  return { ok: true, message: "Member added." }
}

export async function updateMinistryMember(fd: FormData): Promise<void> {
  if (!(await requireAdminAccess())) return
  const supabase = await getSupabaseServerClient()
  if (!supabase) return
  const ministryId = str(fd, "ministryId", 40)
  const userId = str(fd, "userId", 40)
  const op = str(fd, "op")
  if (op === "remove") {
    await supabase.from("ministry_members").delete().eq("ministry_id", ministryId).eq("user_id", userId)
  } else {
    await supabase
      .from("ministry_members")
      .update({ is_leader: op === "makeLeader" })
      .eq("ministry_id", ministryId)
      .eq("user_id", userId)
  }
  revalidateEvents()
}
