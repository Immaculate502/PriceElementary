import { processDueBroadcasts, siteOrigin } from "@/lib/events"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 })
  }
  const processed = await processDueBroadcasts(await siteOrigin())
  return Response.json({ processed })
}
