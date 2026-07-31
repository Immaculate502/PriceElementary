import Link from "next/link"
import { Clock, FileCheck2, Users2, Video, ArrowRight } from "lucide-react"
import { Card, EmptyState, PageHeader, PillarBadge, StatusBadge } from "@/components/ui-kit"
import { ModerationControls } from "@/components/moderation-controls"
import { AdminSecurity } from "@/components/admin-security"
import { getMembers, getSubmissions } from "@/lib/data"
import type { SubmissionType } from "@/lib/types"

const typeLabels: Record<SubmissionType, string> = {
  journal: "Journal",
  confession: "Confession",
  "prayer-request": "Prayer Request",
  testimony: "Testimony",
  "bible-study": "Bible Study",
  activity: "Activity",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export default async function AdminPage() {
  const [submissions, members] = await Promise.all([getSubmissions(), getMembers()])
  const pending = submissions.filter((s) => s.status === "pending")
  const approved = submissions.filter((s) => s.status === "approved")

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Leadership"
        title="Admin Dashboard"
        description="Review member submissions, moderate content, and shepherd the community's spiritual growth."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/15 text-warning">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">{pending.length}</p>
            <p className="text-sm text-muted-foreground">Pending review</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/15 text-success">
            <FileCheck2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">{approved.length}</p>
            <p className="text-sm text-muted-foreground">Approved</p>
          </div>
        </Card>
        <Link href="/admin/members" className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Card className="flex items-center gap-4 transition-colors hover:border-gold">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pillar-faith/15 text-pillar-faith">
              <Users2 className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-2xl font-semibold text-foreground">{members.length}</p>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                Members <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </p>
            </div>
          </Card>
        </Link>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Submissions awaiting review
        </h2>
        {pending.length ? (
          <Card className="divide-y divide-border p-0">
            {pending.map((s) => (
              <div key={s.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{s.title}</p>
                    <PillarBadge pillar={s.pillar} />
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                      {typeLabels[s.type]}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground text-pretty">
                    {s.body}
                  </p>
                  {s.videoUrl && (
                    <div className="mt-3">
                      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-pillar-ministry">
                        <Video className="h-3.5 w-3.5" aria-hidden="true" />
                        Video message
                      </span>
                      <video
                        controls
                        preload="metadata"
                        className="w-full max-w-sm rounded-lg border border-border bg-black"
                      >
                        <source src={s.videoUrl} />
                        Your browser does not support embedded video.
                      </video>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {s.memberName} · {formatDate(s.createdAt)}
                  </p>
                </div>
                <div className="shrink-0">
                  <ModerationControls id={s.id} />
                </div>
              </div>
            ))}
          </Card>
        ) : (
          <EmptyState title="All caught up" description="No submissions are awaiting review." />
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold text-foreground">
          All submissions
        </h2>
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Pillar</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {submissions.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium text-foreground">{s.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.memberName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{typeLabels[s.type]}</td>
                  <td className="px-4 py-3">
                    <PillarBadge pillar={s.pillar} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Administrator settings
        </h2>
        <AdminSecurity />
      </section>
    </div>
  )
}
