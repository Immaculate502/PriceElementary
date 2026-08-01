import { ForgotPasswordForm } from "@/components/forgot-password-form"

export const metadata = {
  title: "Reset your password | F.A.M.E.",
  description: "Request a link to reset your F.A.M.E. member account password.",
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 lg:hidden">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy font-display text-lg font-bold text-navy-foreground">
          F
        </div>
        <span className="font-display text-xl font-semibold text-foreground">F.A.M.E.</span>
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
