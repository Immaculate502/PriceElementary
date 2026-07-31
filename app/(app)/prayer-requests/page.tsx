import { HandHeart } from "lucide-react"
import { Card, EmptyState, PageHeader } from "@/components/ui-kit"
import { SubmissionForm } from "@/components/submission-form"
import { getSubmissions } from "@/lib/data"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default async function PrayerRequestsPage() {
  const all = await getSubmissions()
  const requests = all.filter(
    (s) => s.type === "prayer-request" && s.status === "approved" && !s.isPrivate,
  )

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Bear one another's burdens"
        title="Prayer Requests"
        description="Submit a request and let the community stand with you in prayer."
      />

      <Card>
        <h2 className="mb-1 font-display text-xl font-semibold text-foreground">
          Submit a prayer request
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Any video message you attach is shared privately with leadership only — it never appears
          in the community feed.
        </p>
        <SubmissionForm
          type="prayer-request"
          showPrivate
          allowVideo
          submitLabel="Request prayer"
          titlePlaceholder="Brief summary"
          bodyLabel="Request"
          bodyPlaceholder="Share how we can pray for you…"
        />
      </Card>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Community requests
        </h2>
        {requests.length ? (
          <div className="grid gap-4">
            {requests.map((s) => (
              <Card key={s.id} className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-pillar-ministry/15 text-pillar-ministry">
                  <HandHeart className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{s.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
                    {s.body}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {s.memberName} · {formatDate(s.createdAt)}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No requests yet"
            description="Approved, public prayer requests will appear here."
          />
        )}
      </section>
    </div>
  )
}
