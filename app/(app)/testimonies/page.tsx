import { MessageSquareQuote } from "lucide-react"
import { Card, EmptyState, PageHeader, PillarBadge } from "@/components/ui-kit"
import { SubmissionForm } from "@/components/submission-form"
import { getSubmissions } from "@/lib/data"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export default async function TestimoniesPage() {
  const all = await getSubmissions()
  const testimonies = all.filter((s) => s.type === "testimony" && s.status === "approved")

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Give God the glory"
        title="Testimonies"
        description="Celebrate what God has done. Share your testimony to encourage the whole community."
      />

      <Card>
        <h2 className="mb-4 font-display text-xl font-semibold text-foreground">
          Share a testimony
        </h2>
        <SubmissionForm
          type="testimony"
          defaultPillar="evangelism"
          submitLabel="Share testimony"
          titlePlaceholder="What did God do?"
          bodyLabel="Testimony"
          bodyPlaceholder="Tell the story…"
        />
      </Card>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Recent testimonies
        </h2>
        {testimonies.length ? (
          <div className="grid gap-4">
            {testimonies.map((s) => (
              <Card key={s.id} className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <MessageSquareQuote className="h-5 w-5 text-gold" aria-hidden="true" />
                  <p className="font-display text-lg font-semibold text-foreground">
                    {s.title}
                  </p>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                  {s.body}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {s.memberName} · {formatDate(s.createdAt)}
                  </p>
                  <PillarBadge pillar={s.pillar} />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No testimonies yet"
            description="Be the first to share what God has done."
          />
        )}
      </section>
    </div>
  )
}
