import { AlertCircle } from "lucide-react"
import { signOut } from "@/app/(auth)/auth-actions"

export function ChurchInactiveNotice({
  reason,
}: {
  reason: "no-church" | "inactive"
}) {
  const copy =
    reason === "no-church"
      ? {
          title: "No church linked to your account",
          body: "Your account isn't connected to a church yet. Ask your church leader for an invite link, or sign in with the account you used to join.",
        }
      : {
          title: "Your church's subscription is paused",
          body: "The FAME journey is temporarily unavailable for your church while its subscription is inactive. Please reach out to your church leader — once they reactivate the plan, everything picks up right where you left off.",
        }

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-5 rounded-2xl border border-border bg-card px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="h-7 w-7" aria-hidden="true" />
      </span>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-balance text-foreground">{copy.title}</h1>
        <p className="text-sm leading-relaxed text-pretty text-muted-foreground">{copy.body}</p>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Sign out
        </button>
      </form>
    </div>
  )
}
