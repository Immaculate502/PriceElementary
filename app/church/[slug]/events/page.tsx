import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getChurchBySlug } from "@/lib/tenant"
import { getPublicEvents } from "@/lib/events"
import { EmptyState } from "@/components/ui-kit"
import { EventCard } from "@/components/events/event-card"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const church = await getChurchBySlug(slug)
  return church ? { title: `Events · ${church.name}`, description: `Upcoming events at ${church.name}.` } : {}
}

export default async function PublicEventsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const church = await getChurchBySlug(slug)
  if (!church || church.suspended) notFound()
  const events = await getPublicEvents(church.id)

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold">{church.name}</p>
        <h1 className="font-display text-4xl font-semibold text-balance">Upcoming events</h1>
        <p className="text-muted-foreground">Everyone is welcome. Join us at any of these gatherings.</p>
      </header>
      {events.length === 0 ? (
        <EmptyState title="No public events right now" description="Check back soon for upcoming gatherings." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((e) => (
            <EventCard key={e.id} event={e} href={`/church/${slug}/events/${e.id}`} />
          ))}
        </div>
      )}
      <footer className="mt-auto border-t border-border pt-6 text-center text-xs text-muted-foreground">
        Powered by Rooted Ministry
      </footer>
    </main>
  )
}
