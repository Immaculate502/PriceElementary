import { Card, EmptyState, PageHeader, PillarBadge } from "@/components/ui-kit"
import { SubmissionForm } from "@/components/submission-form"
import { getSubmissions } from "@/lib/data"

export default async function BibleStudyPage() {
  const all = await getSubmissions()
  const studies = all.filter((s) => s.type === "bible-study" && s.status === "approved")

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Grow in the Word"
        title="Bible Study"
        description="Share what God is teaching you and learn from the reflections of the community."
      />

      <Card>
        <h2 className="mb-4 font-display text-xl font-semibold text-foreground">
          Share a study reflection
        </h2>
        <SubmissionForm
          type="bible-study"
          submitLabel="Share reflection"
          titlePlaceholder="Passage or theme"
          bodyLabel="Reflection"
          bodyPlaceholder="What is the passage about? What is God showing you?"
        />
      </Card>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Community reflections
        </h2>
        {studies.length ? (
          <div className="grid gap-4">
            {studies.map((s) => (
              <Card key={s.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-foreground">{s.title}</p>
                  <PillarBadge pillar={s.pillar} />
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                  {s.body}
                </p>
                <p className="text-xs text-muted-foreground">— {s.memberName}</p>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No reflections yet"
            description="Be the first to share what you're learning."
          />
        )}
      </section>
    </div>
  )
}
