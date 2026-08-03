import { LogOut } from "lucide-react"
import { signOut } from "@/app/(auth)/auth-actions"

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-navy-foreground/80 transition-colors hover:bg-white/10 hover:text-navy-foreground"
        aria-label="Sign out"
        title="Sign out"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </form>
  )
}
