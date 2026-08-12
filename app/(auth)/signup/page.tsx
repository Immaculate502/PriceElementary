import { AuthForm } from "@/components/auth-form"

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 lg:hidden">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-navy-foreground font-display text-lg font-bold">
          F
        </div>
        <span className="font-display text-xl font-semibold text-foreground">ROOTED</span>
      </div>

      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Join the community</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your account and begin growing across all four pillars.
        </p>
      </div>

      <AuthForm mode="signup" />
    </div>
  )
}
