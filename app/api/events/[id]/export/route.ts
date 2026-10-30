import { canManageEvent, getEvent, getEventAccess, getEventRegistrations } from "@/lib/events"
import { RSVP_LABELS } from "@/lib/event-types"

function csvCell(value: string | number | null | undefined) {
  let s = value == null ? "" : String(value)
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const access = await getEventAccess()
  if (!access) return new Response("Unauthorized", { status: 401 })
  const event = await getEvent(id)
  if (!event || !canManageEvent(access, event)) return new Response("Not found", { status: 404 })

  const rows = await getEventRegistrations(event.id)
  const lines = [
    ["Name", "Email", "RSVP", "Source", "Checked in", "Registered at"].map(csvCell).join(","),
    ...rows.map((r) =>
      [r.name, r.email, RSVP_LABELS[r.status], r.userId ? "Member" : "Guest", r.attended ? "Yes" : "No", r.createdAt]
        .map(csvCell)
        .join(","),
    ),
  ]
  const filename = event.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "event"
  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}-registrations.csv"`,
      "Cache-Control": "private, no-store",
    },
  })
}
