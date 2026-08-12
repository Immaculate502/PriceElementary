import type { Metadata } from "next"
import { CheckCircle2, Clock, Lock, Mic } from "lucide-react"
import { Card, EmptyState, PageHeader } from "@/components/ui-kit"
import { VocalUploadForm } from "@/components/vocal-upload-form"
import { getMyVocalVideos } from "@/lib/data"

export const metadata: Metadata = {
  title: "VOCAL | ROOTED",
  description: "Record a spoken video reflection and send it privately to leadership.",
}

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

export default async function VocalPage() {
  const videos = await getMyVocalVideos()

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Speak it out"
        title="VOCAL"
        description="Record what's hard to write. Your video goes privately to leadership — it never appears in the community feed."
      />

      <Card>
        <h2 className="mb-1 flex items-center gap-2 font-display text-xl font-semibold text-foreground">
          <Mic className="h-5 w-5 text-gold" aria-hidden="true" />
          New recording
        </h2>
        <p className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Only you and leadership can watch what you post here.
        </p>
        <VocalUploadForm />
      </Card>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Your recordings
          {videos.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {videos.length}
            </span>
          )}
        </h2>

        {videos.length === 0 ? (
          <EmptyState
            title="No recordings yet"
            description="Your VOCAL videos will appear here after you post them."
          />
        ) : (
          <div className="grid gap-4">
            {videos.map((v) => (
              <Card key={v.id}>
                <div className="flex flex-wrap items-center gap-2">
                  {v.reviewedAt ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Reviewed by leadership
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      Awaiting review
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDateTime(v.createdAt)}
                  </span>
                </div>

                <h3 className="mt-3 font-medium text-foreground">{v.title}</h3>
                {v.note && (
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
                    {v.note}
                  </p>
                )}

                {v.videoUrl ? (
                  <video
                    controls
                    preload="metadata"
                    className="mt-3 w-full max-w-md rounded-lg border border-border bg-black"
                  >
                    <source src={v.videoUrl} />
                    Your browser does not support embedded video.
                  </video>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    This recording could not be loaded. Try refreshing the page.
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
