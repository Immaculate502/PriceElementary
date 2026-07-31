"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Lock, AlertCircle } from "lucide-react"
import { unlockAdmin, type AdminActionResult } from "@/app/(app)/admin/admin-actions"
import { FameEmblem } from "./fame-emblem"
import { Button } from "@/components/ui/button"

function UnlockButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-navy text-navy-foreground hover:bg-navy/90"
    >
      {pending ? "Verifying…" : "Unlock admin area"}
    </Button>
  )
}

export function AdminGate() {
  const [state, formAction] = useActionState<AdminActionResult | null, FormData>(
    unlockAdmin,
    null,
  )

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4">
      <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <FameEmblem size={64} priority />
          <h1 className="mt-4 font-display text-2xl font-semibold text-foreground">
            Leadership access
          </h1>
          <p className="mt-2 text-sm text-muted-foreground text-pretty">
            This area is restricted. Enter the administrator password to monitor member
            progress and messages.
          </p>
        </div>

        <form action={formAction} className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="admin-password" className="text-sm font-medium text-foreground">
              Administrator password
            </label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                id="admin-password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Enter password"
                className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-sm outline-none ring-ring/30 focus:ring-2"
              />
            </div>
          </div>

          {state && !state.ok && (
            <p className="flex items-center gap-1.5 text-sm text-destructive" role="alert">
              <AlertCircle className="h-4 w-4" />
              {state.message}
            </p>
          )}

          <UnlockButton />
        </form>
      </div>
    </div>
  )
}
