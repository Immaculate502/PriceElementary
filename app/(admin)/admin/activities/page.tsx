import { PageHeader } from "@/components/ui-kit"
import { ActivityEditor } from "@/components/activity-editor"
import { getActivities } from "@/lib/data"

export const metadata = {
  title: "Activities · Leadership",
  description: "Add, edit, and retire the activities members work through.",
}

export default async function AdminActivitiesPage() {
  // Leadership sees retired activities too, so they can be reviewed or restored.
  const activities = await getActivities({ includeInactive: true })

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Leadership"
        title="Activities"
        description="Define what members work through in each growth area. Changes appear on their Activities page immediately."
      />

      <ActivityEditor activities={activities} />
    </div>
  )
}
