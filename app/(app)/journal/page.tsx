import { Lock } from "lucide-react"
import { Card, EmptyState, PageHeader, PillarBadge } from "@/components/ui-kit"
import { SubmissionForm } from "@/components/submission-form"
import { getCurrentMember, getSubmissions } from "@/lib/data"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default async function JournalPage() {
  const member = await getCurrentMember()
  const all = await getSubmissions({ memberId: member.id })
  const entries = all.filter((s) => s.type === "journal")

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Reflect"
        title="My Journal"
        description="A private space to record what God is doing in your life. Entries can be kept private or shared with leadership."
      />

      <Card>
        <h2 className="mb-4 font-display text-xl font-semibold text-foreground">
          New journal entry
        </h2>
        <SubmissionForm
          type="journal"
          showPrivate
          submitLabel="Save entry"
          titlePlaceholder="What is today about?"
          bodyLabel="Entry"
          bodyPlaceholder="Write freely…"
        />
      </Card>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold text-foreground">Past entries</h2>
        {entries.length ? (
          <div className="grid gap-4">
            {entries.map((s) => (
              <Card key={s.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{s.title}</p>
                    {s.isPrivate && (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-label="Private" />
                    )}
                  </div>
                  <PillarBadge pillar={s.pillar} />
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                  {s.body}
                </p>
                <p className="text-xs text-muted-foreground">{formatDate(s.createdAt)}</p>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No entries yet"
            description="Start journaling to build a record of your walk."
          />
        )}
      </section>
    </div>
  )
}
