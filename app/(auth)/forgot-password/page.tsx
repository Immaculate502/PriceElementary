import { ForgotPasswordForm } from "@/components/forgot-password-form"
import { RootedEmblem } from "@/components/rooted-emblem"

export const metadata = {
  title: "Reset your password | ROOTED",
  description: "Request a link to reset your ROOTED member account password.",
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 lg:hidden">
        <RootedEmblem size={40} priority />
        <span className="font-display text-xl font-semibold tracking-wide text-foreground">
          ROOTED
        </span>
      </div>

      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Reset your password</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
          Enter the email you registered with and we will send you a link to choose a new password.
        </p>
      </div>

      <ForgotPasswordForm />
    </div>
  )
}
