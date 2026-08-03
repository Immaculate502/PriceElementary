import { Info } from "lucide-react"
import { isSupabaseConfigured } from "@/lib/supabase/config"

export function DemoBanner() {
  if (isSupabaseConfigured()) return null

  return (
    <div className="flex items-start gap-2 border-b border-border bg-accent/25 px-4 py-2.5 text-sm text-accent-foreground lg:px-8">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="text-pretty">
        <span className="font-medium">Demo mode.</span> Sample data is shown and
        submissions are not saved. Connect Supabase to enable accounts and real
        persistence.
      </p>
    </div>
  )
}
