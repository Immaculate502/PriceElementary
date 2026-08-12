import { Card, EmptyState, PageHeader, PillarBadge } from "@/components/ui-kit"
import { getActivities } from "@/lib/data"
import { PILLAR_META, type Pillar } from "@/lib/types"

export default async function ActivitiesPage() {
  const activities = await getActivities()
  const pillars = Object.keys(PILLAR_META) as Pillar[]

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Disciplines"
        title="Activities"
        description="Track the disciplines that shape a growing disciple across all four growth areas. Complete activities to earn growth points and build your streak."
      />

      {activities.length === 0 && (
        <EmptyState
          title="No activities yet"
          description="Your leaders are still setting up the activity list. Check back soon."
        />
      )}

      {pillars.map((pillar) => {
        const items = activities.filter((a) => a.pillar === pillar)
        if (!items.length) return null
        const meta = PILLAR_META[pillar]
        return (
          <section key={pillar} className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg font-display font-bold text-white"
                style={{ backgroundColor: meta.token }}
                aria-hidden="true"
              >
                {meta.letter}
              </div>
              <h2 className="font-display text-xl font-semibold text-foreground">
                {meta.label}
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((a) => (
                <Card key={a.id} className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-foreground">{a.title}</p>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{
                        backgroundColor: `color-mix(in oklch, ${meta.token} 14%, transparent)`,
                        color: meta.token,
                      }}
                    >
                      +{a.points} pts
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                    {a.description}
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {a.frequency}
                    </span>
                    <PillarBadge pillar={a.pillar} />
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
