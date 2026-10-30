import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getChurchBySlug } from "@/lib/tenant"
import { getPublicEvent, getRegistrationCounts, publicEventUrl, siteOrigin } from "@/lib/events"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { EventDetail } from "@/components/events/event-detail"
import { PublicRegisterForm } from "@/components/events/public-register-form"

type Params = { params: Promise<{ slug: string; id: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, id } = await params
  const church = await getChurchBySlug(slug)
  const event = church ? await getPublicEvent(church.id, id) : null
  if (!church || !event) return {}
  const description = event.description?.slice(0, 160) ?? `${event.title} at ${church.name}`
  return {
    title: `${event.title} · ${church.name}`,
    description,
    openGraph: { title: event.title, description, images: event.bannerUrl ? [event.bannerUrl] : undefined },
  }
}

export default async function PublicEventPage({ params }: Params) {
  const { slug, id } = await params
  const church = await getChurchBySlug(slug)
  if (!church || church.suspended) notFound()
  const event = await getPublicEvent(church.id, id)
  if (!event) notFound()

  const admin = getSupabaseAdminClient()
  const [counts, origin] = await Promise.all([
    getRegistrationCounts([event.id]),
    siteOrigin(),
    admin?.rpc("increment_event_view", { p_event: event.id }),
  ])
  const going = counts[event.id]?.going ?? 0
  const url = publicEventUrl(origin, slug, event.id)

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <Link href={`/church/${slug}/events`} className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        More events at {church.name}
      </Link>
      <EventDetail
        event={event}
        url={url}
        icsHref={`/api/events/${event.id}/ics?church=${encodeURIComponent(slug)}`}
        shareUrl={url}
        goingCount={going}
        action={
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <p className="text-sm font-medium">Save your spot</p>
            <PublicRegisterForm slug={slug} eventId={event.id} full={!!event.capacity && going >= event.capacity} />
          </div>
        }
      />
      <footer className="mt-auto border-t border-border pt-6 text-center text-xs text-muted-foreground">
        Powered by Rooted Ministry
      </footer>
    </main>
  )
}
