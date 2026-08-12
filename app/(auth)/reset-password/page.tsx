import { ResetPasswordForm } from "@/components/reset-password-form"
import { RootedEmblem } from "@/components/rooted-emblem"

export const metadata = {
  title: "Choose a new password | ROOTED",
  description: "Set a new password for your ROOTED member account.",
}

// Reachable only with the session created by the recovery link. The proxy sends
// anyone without a session to /login, so an expired link cannot land here.
export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 lg:hidden">
        <RootedEmblem size={40} priority />
        <span className="font-display text-xl font-semibold tracking-wide text-foreground">
          ROOTED
        </span>
      </div>

      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Choose a new password
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
          Pick something you will remember. You will be signed in once it is saved.
        </p>
      </div>

      <ResetPasswordForm />
    </div>
  )
}
