import { AuthForm } from "@/components/auth-form"
import { RootedEmblem } from "@/components/rooted-emblem"
import { isOAuthProviderEnabled } from "@/lib/supabase/oauth-status"

export default async function SignupPage() {
  const googleEnabled = await isOAuthProviderEnabled("google")

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 lg:hidden">
        <RootedEmblem size={40} priority />
        <span className="font-display text-xl font-semibold tracking-wide text-foreground">
          ROOTED
        </span>
      </div>

      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Join the community</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your account and begin growing across all four growth areas.
        </p>
      </div>

      <AuthForm mode="signup" googleEnabled={googleEnabled} />
    </div>
  )
}
