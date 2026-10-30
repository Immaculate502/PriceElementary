import { Download } from "lucide-react"
import { setAttendance } from "@/app/events-actions"
import { Card, EmptyState } from "@/components/ui-kit"
import { RSVP_LABELS, type EventRegistration } from "@/lib/event-types"
import { WalkInForm } from "./walk-in-form"

export function RegistrationsPanel({
  eventId,
  registrations,
  capacity,
  exportHref,
}: {
  eventId: string
  registrations: EventRegistration[]
  capacity: number | null
  exportHref: string
}) {
  const going = registrations.filter((r) => r.status === "going").length
  const maybe = registrations.filter((r) => r.status === "maybe").length
  const waitlist = registrations.filter((r) => r.status === "waitlist").length
  const attended = registrations.filter((r) => r.attended).length
  const active = registrations.filter((r) => r.status !== "not_going" || r.attended)

  const stats = [
    { label: "Going", value: capacity ? `${going} / ${capacity}` : going },
    { label: "Maybe", value: maybe },
    { label: "Waitlist", value: waitlist },
    { label: "Checked in", value: attended },
  ]

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">Registrations and attendance</h2>
        <a
          href={exportHref}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Export CSV
        </a>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg bg-secondary/60 p-3">
            <dt className="text-xs text-muted-foreground">{s.label}</dt>
            <dd className="font-display text-2xl font-semibold">{s.value}</dd>
          </div>
        ))}
      </dl>

      <WalkInForm eventId={eventId} />

      {active.length === 0 ? (
        <EmptyState title="No registrations yet" description="RSVPs from members and public sign-ups will appear here." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="py-2 pr-3 font-medium">Name</th>
                <th scope="col" className="py-2 pr-3 font-medium">Email</th>
                <th scope="col" className="py-2 pr-3 font-medium">Response</th>
                <th scope="col" className="py-2 pr-3 font-medium">Source</th>
                <th scope="col" className="py-2 font-medium">Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {active.map((r) => (
                <tr key={r.id}>
                  <td className="py-2.5 pr-3 font-medium">{r.name}</td>
                  <td className="py-2.5 pr-3 text-muted-foreground">{r.email}</td>
                  <td className="py-2.5 pr-3">{RSVP_LABELS[r.status]}</td>
                  <td className="py-2.5 pr-3 capitalize text-muted-foreground">{r.source === "admin" ? "Walk-in" : r.source}</td>
                  <td className="py-2.5">
                    <form action={setAttendance}>
                      <input type="hidden" name="registrationId" value={r.id} />
                      <input type="hidden" name="attended" value={r.attended ? "false" : "true"} />
                      <button
                        type="submit"
                        className={
                          r.attended
                            ? "rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success hover:bg-success/25"
                            : "rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-secondary"
                        }
                        aria-label={r.attended ? `Undo check-in for ${r.name}` : `Check in ${r.name}`}
                      >
                        {r.attended ? "Checked in" : "Check in"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
