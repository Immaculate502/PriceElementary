import { Quote } from "lucide-react"
import { Card, PageHeader } from "@/components/ui-kit"
import { SubmissionForm } from "@/components/submission-form"
import { CONFESSIONS } from "@/lib/demo-data"

export default function ConfessionsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Speak life"
        title="Daily Confessions"
        description="Declare God's Word over your life. Speak these truths aloud and add your own personal confessions."
      />

      <div className="grid gap-3">
        {CONFESSIONS.map((c, i) => (
          <Card key={i} className="flex items-start gap-3 bg-secondary/50">
            <Quote className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
            <p className="font-display text-lg leading-relaxed text-foreground text-pretty">
              {c}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="mb-4 font-display text-xl font-semibold text-foreground">
          Add a personal confession
        </h2>
        <SubmissionForm
          type="confession"
          submitLabel="Save confession"
          titlePlaceholder="e.g. My identity in Christ"
          bodyLabel="Confession"
          bodyPlaceholder="Write the scripture-based truth you are declaring…"
        />
      </Card>
    </div>
  )
}
