import { CheckCircle2, Circle } from "lucide-react"
import { Card, PageHeader } from "@/components/ui-kit"
import { DEMO_READING_PLAN } from "@/lib/demo-data"

export default function ReadingPlanPage() {
  const plan = DEMO_READING_PLAN
  const completed = plan.filter((d) => d.completed).length
  const pct = Math.round((completed / plan.length) * 100)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Gospel of John"
        title="Reading Plan"
        description="A guided journey through the Gospel of John. Read daily and mark your progress."
      />

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">
            {completed} of {plan.length} days complete
          </p>
          <p className="text-sm font-semibold text-accent-foreground">{pct}%</p>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-gold transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </Card>

      <Card className="divide-y divide-border p-0">
        {plan.map((day) => (
          <div key={day.day} className="flex items-center gap-4 p-4">
            {day.completed ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <Circle className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">
                Day {day.day} · {day.theme}
              </p>
              <p className="text-sm text-muted-foreground">{day.reference}</p>
            </div>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {day.completed ? "Read" : "Pending"}
            </span>
          </div>
        ))}
      </Card>
    </div>
  )
}
