import Link from "next/link"
import { CheckCircle2, Clock } from "lucide-react"
import { Card } from "@/components/ui-kit"
import { VocalReviewToggle } from "@/components/vocal-review-toggle"
import type { VocalVideo } from "@/lib/types"

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

/**
 * One VOCAL entry as leadership sees it. Shared by the VOCAL queue and each
 * member's detail page; `showMember` adds the attribution line that would be
 * redundant when the card already sits under that member's profile.
 */
export function VocalReviewCard({
  video,
  showMember = false,
}: {
  video: VocalVideo
  showMember?: boolean
}) {
  const reviewed = Boolean(video.reviewedAt)

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        {reviewed ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            Reviewed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            New
          </span>
        )}
        {showMember && (
          <Link
            href={`/admin/members/${video.memberId}`}
            className="text-sm font-medium text-foreground underline-offset-2 hover:underline"
          >
            {video.memberName}
          </Link>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {formatDateTime(video.createdAt)}
        </span>
      </div>

      <h3 className="mt-3 font-medium text-foreground">{video.title}</h3>
      {video.note && (
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
          {video.note}
        </p>
      )}

      {video.videoUrl ? (
        <video
          controls
          preload="metadata"
          className="mt-3 w-full max-w-md rounded-lg border border-border bg-black"
        >
          <source src={video.videoUrl} />
          Your browser does not support embedded video.
        </video>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          This recording could not be loaded. Try refreshing the page.
        </p>
      )}

      <div className="mt-4 border-t border-border pt-3">
        <VocalReviewToggle
          vocalId={video.id}
          title={video.title}
          reviewed={reviewed}
        />
      </div>
    </Card>
  )
}
