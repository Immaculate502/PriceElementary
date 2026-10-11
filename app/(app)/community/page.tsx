import type { Metadata } from "next"
import RootedCommunity from "@/components/rooted-community"

export const metadata: Metadata = {
  title: "Community | Rooted",
  description: "Chat with members of your church and the wider Rooted fellowship.",
}

export default function CommunityPage() {
  return <RootedCommunity />
}
