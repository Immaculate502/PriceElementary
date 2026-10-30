import { ManageEventView } from "@/components/events/manage-event-view"

export const metadata = { title: "Manage event" }

export default async function LeaderEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; created?: string }>
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  return <ManageEventView id={id} base="leader" tab={sp.tab ?? "overview"} created={sp.created === "1"} />
}
