"use client"

import { useActionState } from "react"
import { Loader2 } from "lucide-react"
import { linkToChurchByInvite, type AuthResult } from "@/app/(auth)/onboarding-actions"

export function LinkChurchForm() {
  const [state, formAction, pending] = useActionState<AuthResult | null, FormData>(
    linkToChurchByInvite,
    null,
  )

  return (
    <form action={formAction} className="flex w-full flex-col gap-3 text-left">
      <label htmlFor="invite" className="text-sm font-medium text-foreground">
        Church invite link
      </label>
      <input
        id="invite"
        name="invite"
        type="text"
        required
        autoComplete="off"
        placeholder="https://rootedministry.online/join/your-church"
        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        aria-describedby={state && !state.ok ? "invite-error" : undefined}
      />
      {state && !state.ok ? (
        <p id="invite-error" role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        Join church
      </button>
    </form>
  )
}
