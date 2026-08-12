import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Flame, Lock, MessageSquare, Mic, Video } from "lucide-react"
import {
  Card,
  PageHeader,
  PillarBadge,
  PillarProgressBars,
  StatusBadge,
  EmptyState,
} from "@/components/ui-kit"
import { MemberRoleToggle } from "@/components/member-role-toggle"
import { VocalReviewCard } from "@/components/vocal-review-card"
import { getMemberById, getSubmissions, getVocalVideos, pillarProgress } from "@/lib/data"

function formatDateTime(iso: string) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

const typeLabels: Record<string, string> = {
  journal: "Journal",
  confession: "Confession",
  "prayer-request": "Prayer request",
  testimony: "Testimony",
  "bible-study": "Bible study",
  activity: "Activity",
}

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const member = await getMemberById(id)
  if (!member) notFound()

  const [submissions, vocalVideos] = await Promise.all([
    getSubmissions({ memberId: id }),
    getVocalVideos({ memberId: id, forLeadership: true }),
  ])
  const unreviewedVocal = vocalVideos.filter((v) => !v.reviewedAt).length
  const progress = pillarProgress(submissions)
  const approvedCount = submissions.filter((s) => s.status === "approved").length
  const pendingCount = submissions.filter((s) => s.status === "pending").length
  const totalApproved = Object.values(progress).reduce((a, b) => a + b, 0)

  const initials = member.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/admin/members"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to members
        </Link>
        <PageHeader
          eyebrow="Member profile"
          title={member.name}
          description={member.email}
          action={
            <div className="flex flex-col items-end gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1.5 text-sm font-medium text-gold-foreground">
                <Flame className="h-4 w-4 text-gold" aria-hidden="true" />
                {member.streak} day streak
              </span>
              <MemberRoleToggle
                memberId={member.id}
                memberName={member.name}
                isAdmin={member.role === "admin"}
              />
            </div>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Progress */}
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-semibold text-white"
              style={{ backgroundColor: member.avatarColor }}
              aria-hidden="true"
            >
              {initials}
            </div>
            <div>
              <p className="font-medium text-foreground">Progress by growth area</p>
              <p className="text-sm text-muted-foreground">
                Approved submissions in each growth area
              </p>
            </div>
          </div>
          <PillarProgressBars progress={progress} size="lg" />
        </Card>

        {/* Stats */}
        <Card className="flex flex-col justify-center gap-4">
          <div>
            <p className="font-display text-3xl font-semibold text-foreground">{totalApproved}</p>
            <p className="text-sm text-muted-foreground">Approved contributions</p>
          </div>
          <div className="flex gap-6 border-t border-border pt-4">
            <div>
              <p className="font-display text-xl font-semibold text-success">{approvedCount}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
            <div>
              <p className="font-display text-xl font-semibold text-warning">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div>
              <p className="font-display text-xl font-semibold text-foreground">
                {submissions.length}
              </p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        </Card>
      </div>

      {/* VOCAL recordings */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-foreground">
          <Mic className="h-5 w-5 text-gold" aria-hidden="true" />
          VOCAL recordings
          {vocalVideos.length > 0 && (
            <span className="font-sans tabular-nums text-sm font-normal text-muted-foreground">
              {vocalVideos.length}
              {unreviewedVocal > 0 && ` · ${unreviewedVocal} new`}
            </span>
          )}
        </h2>

        {vocalVideos.length === 0 ? (
          <EmptyState
            title="No VOCAL videos yet"
            description="This member hasn't recorded a spoken reflection."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {vocalVideos.map((v) => (
              <VocalReviewCard key={v.id} video={v} />
            ))}
          </div>
        )}
      </section>

      {/* Message timeline */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-foreground">
          <MessageSquare className="h-5 w-5 text-gold" aria-hidden="true" />
          Messages &amp; submissions
        </h2>

        {submissions.length === 0 ? (
          <EmptyState
            title="No messages yet"
            description="This member hasn't submitted anything to the community."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {submissions.map((s) => (
              <Card key={s.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                    {typeLabels[s.type] ?? s.type}
                  </span>
                  <PillarBadge pillar={s.pillar} />
                  <StatusBadge status={s.status} />
                  {s.isPrivate && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Lock className="h-3 w-3" aria-hidden="true" />
                      Private
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDateTime(s.createdAt)}
                  </span>
                </div>
                <h3 className="mt-3 font-medium text-foreground">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
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
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
