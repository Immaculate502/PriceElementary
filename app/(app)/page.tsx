import Link from "next/link"
import { ArrowUpRight, BookOpen, Flame, HandHeart, Sparkles } from "lucide-react"
import { Card, PageHeader, PillarBadge, StatusBadge } from "@/components/ui-kit"
import { getActivities, getCurrentMember, getSubmissions } from "@/lib/data"
import { MEMORY_VERSE } from "@/lib/demo-data"
import { PILLAR_META, type FamePillar } from "@/lib/types"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

export default async function DashboardPage() {
  const [member, activities, submissions] = await Promise.all([
    getCurrentMember(),
    getActivities(),
    getSubmissions({ memberId: undefined }),
  ])

  const pillars = Object.keys(PILLAR_META) as FamePillar[]
  const recent = submissions.slice(0, 4)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={`Welcome back, ${member.name.split(" ")[0]}`}
        title="Your walk this week"
        description="Faith · Action · Ministry · Evangelism — grow intentionally across all four pillars."
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold/20 text-gold-foreground">
            <Flame className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">{member.streak}</p>
            <p className="text-sm text-muted-foreground">Day streak</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pillar-faith/15 text-pillar-faith">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">{activities.length}</p>
            <p className="text-sm text-muted-foreground">Active disciplines</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pillar-ministry/15 text-pillar-ministry">
            <HandHeart className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">{submissions.length}</p>
            <p className="text-sm text-muted-foreground">Submissions</p>
          </div>
        </Card>
      </div>

      {/* Memory verse */}
      <Card className="bg-navy text-navy-foreground">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-1 h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">
              Memory Verse
            </p>
            <p className="mt-2 font-display text-xl leading-relaxed text-balance">
              {`"${MEMORY_VERSE.text}"`}
            </p>
            <p className="mt-2 text-sm text-navy-foreground/70">{MEMORY_VERSE.reference}</p>
          </div>
        </div>
      </Card>

      {/* Pillars */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold text-foreground">The four pillars</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {pillars.map((p) => {
            const meta = PILLAR_META[p]
            const count = activities.filter((a) => a.pillar === p).length
            return (
              <Card key={p} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl font-display text-lg font-bold text-white"
                    style={{ backgroundColor: meta.token }}
                    aria-hidden="true"
                  >
                    {meta.letter}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{meta.label}</p>
                    <p className="text-xs text-muted-foreground">{count} disciplines</p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                  {meta.blurb}
                </p>
                <Link
                  href="/activities"
                  className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-accent-foreground hover:underline"
                >
                  View activities
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Recent submissions */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-foreground">
            Recent community activity
          </h2>
          <Link
            href="/testimonies"
            className="text-sm font-medium text-accent-foreground hover:underline"
          >
            View all
          </Link>
        </div>
        <Card className="divide-y divide-border p-0">
          {recent.map((s) => (
            <div key={s.id} className="flex items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-foreground">{s.title}</p>
                  <PillarBadge pillar={s.pillar} />
                </div>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {s.memberName} · {formatDate(s.createdAt)}
                </p>
              </div>
              <StatusBadge status={s.status} />
            </div>
          ))}
        </Card>
      </section>
    </div>
  )
}
