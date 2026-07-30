import Link from "next/link"
import { AuthForm } from "@/components/auth-form"
import { isSupabaseConfigured } from "@/lib/supabase/config"

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 lg:hidden">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-navy-foreground font-display text-lg font-bold">
          F
        </div>
        <span className="font-display text-xl font-semibold text-foreground">F.A.M.E.</span>
      </div>

      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to continue your spiritual journey.
        </p>
      </div>

      <AuthForm mode="login" />

      {!isSupabaseConfigured() && (
        <p className="rounded-lg bg-accent/25 px-3 py-2 text-center text-xs text-accent-foreground">
          Demo mode — connect Supabase to enable real accounts.{" "}
          <Link href="/" className="font-medium underline">
            Explore the app
          </Link>
        </p>
      )}
    </div>
  )
}
