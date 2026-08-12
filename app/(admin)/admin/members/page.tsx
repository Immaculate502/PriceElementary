import Link from "next/link"
import { Flame, ChevronRight } from "lucide-react"
import { Card, PageHeader, PillarProgressBars } from "@/components/ui-kit"
import { MemberRoleToggle } from "@/components/member-role-toggle"
import { getMembers, getSubmissions, pillarProgress } from "@/lib/data"

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
        description="Monitor each member's progress across the four growth areas. Select a member to review their full history and messages."
      />

      {members.length === 0 && (
        <Card className="flex flex-col gap-2 text-center">
          <p className="font-medium text-foreground">No members yet</p>
          <p className="text-sm text-muted-foreground text-pretty">
            Once members create accounts they will appear here. The first person to sign up can be
            promoted to leader from this page.
          </p>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {members.map((m) => {
          const mine = submissions.filter((s) => s.memberId === m.id)
          const progress = pillarProgress(mine)
          const initials = m.name
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("")
          return (
            <Card key={m.id} className="flex flex-col gap-4 transition-colors hover:border-gold">
              <Link
                href={`/admin/members/${m.id}`}
                className="flex items-center gap-4 outline-none"
              >
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
                    Joined {formatDate(m.joinedAt)} · {mine.length} submissions
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Flame className="h-4 w-4 text-gold" aria-hidden="true" />
                    {m.streak}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
              </Link>
              <div className="border-t border-border pt-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Approved by pillar
                </p>
                <PillarProgressBars progress={progress} />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">
                  {m.role === "admin" ? "Has leadership access" : "Member access"}
                </p>
                <MemberRoleToggle
                  memberId={m.id}
                  memberName={m.name}
                  isAdmin={m.role === "admin"}
                />
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
