import { Mic } from "lucide-react"
import { Card, EmptyState, PageHeader } from "@/components/ui-kit"
import { VocalReviewCard } from "@/components/vocal-review-card"
import { getVocalVideos } from "@/lib/data"

export default async function AdminVocalPage() {
  const videos = await getVocalVideos({ forLeadership: true })
  const unreviewed = videos.filter((v) => !v.reviewedAt)
  const reviewed = videos.filter((v) => v.reviewedAt)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Member voices"
        title="VOCAL"
        description="Spoken video reflections sent privately by members. Mark each one reviewed so nothing gets missed."
        action={
          <div className="flex gap-6">
            <div className="text-right">
              {/* font-sans: the display serif renders lining figures as small
                  roman-numeral-like glyphs, which reads wrong for a counter. */}
              <p className="font-sans text-2xl font-semibold tabular-nums text-warning">
                {unreviewed.length}
              </p>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </div>
            <div className="text-right">
              <p className="font-sans text-2xl font-semibold tabular-nums text-foreground">
                {videos.length}
              </p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        }
      />

      {videos.length === 0 ? (
        <EmptyState
          title="No VOCAL videos yet"
          description="When members record a reflection, it will appear here for review."
        />
      ) : (
        <>
          <section className="flex flex-col gap-4">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-foreground">
              <Mic className="h-5 w-5 text-gold" aria-hidden="true" />
              Needs review
              <span className="font-sans text-sm font-normal tabular-nums text-muted-foreground">
                {unreviewed.length}
              </span>
            </h2>
            {unreviewed.length === 0 ? (
              <Card>
                <p className="text-sm text-muted-foreground">
                  Everything has been reviewed. Nothing waiting.
                </p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {unreviewed.map((v) => (
                  <VocalReviewCard key={v.id} video={v} showMember />
                ))}
              </div>
            )}
          </section>

          {reviewed.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-foreground">
                Reviewed
                <span className="font-sans text-sm font-normal tabular-nums text-muted-foreground">
                  {reviewed.length}
                </span>
              </h2>
              <div className="grid gap-4">
                {reviewed.map((v) => (
                  <VocalReviewCard key={v.id} video={v} showMember />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
