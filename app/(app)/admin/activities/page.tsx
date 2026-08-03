import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { PageHeader } from "@/components/ui-kit"
import { ActivityEditor } from "@/components/activity-editor"
import { getActivities } from "@/lib/data"

export const metadata = {
  title: "Activities · Leadership",
  description: "Add, edit, and retire the F.A.M.E. activities members work through.",
}

export default async function AdminActivitiesPage() {
  // Leadership sees retired activities too, so they can be reviewed or restored.
  const activities = await getActivities({ includeInactive: true })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Link
          href="/admin"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to admin
        </Link>
        <PageHeader
          eyebrow="Leadership"
          title="Activities"
          description="Define what members work through in each pillar. Changes appear on their Activities page immediately."
        />
      </div>

      <ActivityEditor activities={activities} />
    </div>
  )
}
