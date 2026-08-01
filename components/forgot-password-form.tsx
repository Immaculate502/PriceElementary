"use client"

import Link from "next/link"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { requestPasswordReset, type AuthResult } from "@/app/(auth)/auth-actions"
import { Button } from "@/components/ui/button"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-navy text-navy-foreground hover:bg-navy/90"
    >
      {pending ? "Sending…" : "Send reset link"}
    </Button>
  )
}

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState<AuthResult | null, FormData>(
    requestPasswordReset,
    null,
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
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

      <p className="text-center text-sm text-muted-foreground">
        {"Remembered it? "}
        <Link href="/login" className="font-medium text-accent-foreground hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  )
}
