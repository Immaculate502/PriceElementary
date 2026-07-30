import { Flame } from "lucide-react"
import { Card, PageHeader } from "@/components/ui-kit"
import { getMembers, getSubmissions } from "@/lib/data"

function formatDate(iso: string) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default async function MembersPage() {
  const [members, submissions] = await Promise.all([getMembers(), getSubmissions()])

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Leadership"
        title="Members"
        description="An overview of everyone growing in the F.A.M.E. community."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {members.map((m) => {
          const count = submissions.filter((s) => s.memberId === m.id).length
          const initials = m.name
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("")
          return (
            <Card key={m.id} className="flex items-center gap-4">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-semibold text-white"
                style={{ backgroundColor: m.avatarColor }}
                aria-hidden="true"
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-foreground">{m.name}</p>
                  {m.role === "admin" && (
                    <span className="rounded-full bg-gold/20 px-2 py-0.5 text-xs font-medium text-gold-foreground">
                      Leader
                    </span>
                  )}
                </div>
                <p className="truncate text-sm text-muted-foreground">{m.email}</p>
                <p className="text-xs text-muted-foreground">
                  Joined {formatDate(m.joinedAt)} · {count} submissions
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Flame className="h-4 w-4 text-gold" aria-hidden="true" />
                {m.streak}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
