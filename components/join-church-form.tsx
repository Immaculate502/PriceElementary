"use client"

import Link from "next/link"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { AlertCircle } from "lucide-react"
import { joinChurch, type AuthResult } from "@/app/(auth)/onboarding-actions"
import { Button } from "@/components/ui/button"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-navy text-navy-foreground hover:bg-navy/90"
    >
      {pending ? "Creating your account…" : "Join & create account"}
    </Button>
  )
}

export function JoinChurchForm({ slug }: { slug: string }) {
  const [state, formAction] = useActionState<AuthResult | null, FormData>(joinChurch, null)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="slug" value={slug} />

      <div className="grid gap-2">
        <label htmlFor="name" className="text-sm font-medium text-foreground">
          Full name
        </label>
        <input
          id="name"
          name="name"
          required
          autoComplete="name"
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/40 focus:ring-2"
        />
      </div>

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

      <div className="grid gap-2">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/40 focus:ring-2"
        />
      </div>

      <SubmitButton />

      {state && !state.ok && (
        <p className="flex items-center gap-1.5 text-sm text-destructive" role="status">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.message}
        </p>
      )}

      <p className="text-center text-sm text-muted-foreground">
        {"Already a member? "}
        <Link href="/login" className="font-medium text-accent-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}
