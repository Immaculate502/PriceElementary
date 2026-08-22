import type { Metadata } from "next"
import Link from "next/link"
import { RootedEmblem } from "@/components/rooted-emblem"
import { JoinChurchForm } from "@/components/join-church-form"
import { getChurchBySlug, churchIsEntitled } from "@/lib/tenant"

export const metadata: Metadata = {
  title: "Join your church | ROOTED",
  description: "Create your member account and join your church on ROOTED.",
  robots: { index: false, follow: false },
}

export default async function JoinPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const church = await getChurchBySlug(slug)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 lg:hidden">
        <RootedEmblem size={40} priority />
        <span className="font-display text-xl font-semibold tracking-wide text-foreground">
          ROOTED
        </span>
      </div>

      {!church ? (
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Invite link not found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground text-pretty">
            We couldn&apos;t find a church for this link. Double-check it with your leader.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block text-sm font-medium text-accent-foreground hover:underline"
          >
            Go to sign in
          </Link>
        </div>
      ) : !churchIsEntitled(church) ? (
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground text-balance">
            {church.name} isn&apos;t ready yet
          </h1>
          <p className="mt-2 text-sm text-muted-foreground text-pretty">
            This church&apos;s account isn&apos;t active. Please check back once your leader has
            finished setting things up.
          </p>
        </div>
      ) : (
        <>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Joining
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-foreground text-balance">
              {church.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your member account to start growing in Faith, Action, Ministry and
              Evangelism.
            </p>
          </div>
          <JoinChurchForm slug={church.slug} />
        </>
      )}
    </div>
  )
}
