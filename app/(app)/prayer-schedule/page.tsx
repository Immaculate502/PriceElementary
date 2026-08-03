import { Clock, Users } from "lucide-react"
import { Card, PageHeader } from "@/components/ui-kit"
import { DEMO_PRAYER_SLOTS } from "@/lib/demo-data"

export default function PrayerSchedulePage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="24-hour cover"
        title="Prayer Schedule"
        description="Our community keeps a rhythm of prayer throughout the day. Join a slot and stand in the gap."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {DEMO_PRAYER_SLOTS.map((slot) => (
          <Card key={slot.id} className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-accent-foreground">
              <Clock className="h-4 w-4" aria-hidden="true" />
              <span className="font-display text-lg font-semibold text-foreground">
                {slot.time}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{slot.focus}</p>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" aria-hidden="true" />
              <span>
                {slot.members.length
                  ? slot.members.join(", ")
                  : "Open — be the first to join"}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
