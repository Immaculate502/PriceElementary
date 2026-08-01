"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { updatePassword, type AuthResult } from "@/app/(auth)/auth-actions"
import { Button } from "@/components/ui/button"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-navy text-navy-foreground hover:bg-navy/90"
    >
      {pending ? "Saving…" : "Save new password"}
    </Button>
  )
}

export function ResetPasswordForm() {
  const [state, formAction] = useActionState<AuthResult | null, FormData>(updatePassword, null)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/40 focus:ring-2"
        />
        <p className="text-xs text-muted-foreground">At least 8 characters.</p>
      </div>

      <div className="grid gap-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/40 focus:ring-2"
        />
      </div>

      <SubmitButton />

      {state && (
        <p
          className={`flex items-start gap-1.5 text-sm ${
            state.ok ? "text-success" : "text-destructive"
          }`}
          role="status"
        >
          {state.ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span className="text-pretty">{state.message}</span>
        </p>
      )}
    </form>
  )
}
