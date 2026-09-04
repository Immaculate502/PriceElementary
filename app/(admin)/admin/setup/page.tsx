import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { PageHeader } from "@/components/ui-kit"
import { ChurchSetupWizard } from "@/components/church-setup-wizard"
import { getTenantContext, getCurrentChurch } from "@/lib/tenant"
import { getActivities, getMembers } from "@/lib/data"

export const metadata: Metadata = {
  title: "Setup · Leadership",
  description: "Name your church, load starter activities, and invite members.",
}

export default async function AdminSetupPage() {
  // Super-admins have no single church to set up; send them to the platform.
  const ctx = await getTenantContext()
  if (ctx?.isSuperAdmin) redirect("/platform")

  const church = await getCurrentChurch()
  if (!church) redirect("/admin/login")

  const [activities, members] = await Promise.all([
    getActivities({ includeInactive: true }),
    getMembers(),
  ])

  const h = await headers()
  const origin = h.get("origin") ?? (h.get("host") ? `https://${h.get("host")}` : "")
  const inviteUrl = `${origin}/join/${church.slug}`

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Leadership"
        title="Church setup"
        description="A few quick steps to get your church ready for members."
      />

      <ChurchSetupWizard
        churchName={church.name}
        memberCount={members.length}
        activityCount={activities.length}
        inviteUrl={inviteUrl}
      />
    </div>
  )
}
