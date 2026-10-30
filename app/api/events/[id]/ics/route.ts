import { getEvent, getPublicEvent, memberEventUrl, publicEventUrl, siteOrigin } from "@/lib/events"
import { getChurchById, getChurchBySlug } from "@/lib/tenant"
import { buildIcs, type ChurchEvent } from "@/lib/event-types"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const slug = new URL(request.url).searchParams.get("church")
  const origin = await siteOrigin()

  let event: ChurchEvent | null = null
  let url = ""
  let organizer = "Rooted Ministry"

  if (slug) {
    const church = await getChurchBySlug(slug)
    if (church) {
      event = await getPublicEvent(church.id, id)
      url = publicEventUrl(origin, church.slug, id)
      organizer = church.name
    }
  } else {
    event = await getEvent(id)
    if (event?.status === "draft") event = null
    if (event) {
      url = memberEventUrl(origin, id)
      organizer = (await getChurchById(event.churchId))?.name ?? organizer
    }
  }

  if (!event) return new Response("Not found", { status: 404 })

  const filename = event.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "event"
  return new Response(buildIcs(event, url, organizer), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.ics"`,
      "Cache-Control": "private, no-store",
    },
  })
}
