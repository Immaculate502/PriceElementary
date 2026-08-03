import { Flame, Mail, ShieldCheck } from "lucide-react"
import { Card, PageHeader, PillarBadge } from "@/components/ui-kit"
import { getCurrentMember, getSubmissions } from "@/lib/data"
import { PILLAR_META, type FamePillar } from "@/lib/types"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default async function ProfilePage() {
  const member = await getCurrentMember()
  const submissions = await getSubmissions({ memberId: member.id })
  const initials = member.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")

  const pillars = Object.keys(PILLAR_META) as FamePillar[]
  const byPillar = pillars.map((p) => ({
    pillar: p,
    count: submissions.filter((s) => s.pillar === p).length,
  }))

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Account" title="My Profile" />

      <Card className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-semibold text-white"
          style={{ backgroundColor: member.avatarColor }}
          aria-hidden="true"
        >
          {initials}
        </div>
        <div className="flex-1">
          <h2 className="font-display text-2xl font-semibold text-foreground">
            {member.name}
          </h2>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground sm:justify-start">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-4 w-4" aria-hidden="true" />
              {member.email}
            </span>
            <span className="inline-flex items-center gap-1.5 capitalize">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              {member.role}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Member since {formatDate(member.joinedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-gold/15 px-4 py-3 text-gold-foreground">
          <Flame className="h-5 w-5 text-gold" aria-hidden="true" />
          <div className="text-left">
            <p className="text-lg font-semibold text-foreground">{member.streak}</p>
            <p className="text-xs text-muted-foreground">day streak</p>
          </div>
        </div>
      </Card>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Growth across the pillars
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {byPillar.map(({ pillar, count }) => (
            <Card key={pillar} className="flex flex-col items-start gap-2">
              <PillarBadge pillar={pillar} />
              <p className="font-display text-3xl font-semibold text-foreground">{count}</p>
              <p className="text-sm text-muted-foreground">submissions</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
