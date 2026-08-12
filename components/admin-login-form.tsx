"use client"

import Link from "next/link"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { AlertCircle, ArrowLeft, Lock } from "lucide-react"
import { unlockAdmin, type AdminActionResult } from "@/app/(admin)/admin/admin-actions"
import { RootedEmblem } from "./rooted-emblem"
import { Button } from "@/components/ui/button"

function UnlockButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-navy text-navy-foreground hover:bg-navy/90"
    >
      {pending ? "Verifying…" : "Enter console"}
    </Button>
  )
}

export function AdminLoginForm() {
  const [state, formAction] = useActionState<AdminActionResult | null, FormData>(
    unlockAdmin,
    null,
  )

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <RootedEmblem size={64} priority />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Restricted
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-foreground">
            Leadership Console
          </h1>
          <p className="mt-2 text-sm text-muted-foreground text-pretty">
            Enter the administrator password to manage members, activities and lessons.
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
                autoFocus
                autoComplete="current-password"
                placeholder="Enter password"
                className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-sm outline-none ring-ring/30 focus:ring-2"
              />
            </div>
          </div>

          {state && !state.ok && (
            <p className="flex items-center gap-1.5 text-sm text-destructive" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {state.message}
            </p>
          )}

          <UnlockButton />
        </form>
      </div>

      <Link
        href="/"
        className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to member portal
      </Link>
    </div>
  )
}
