"use client"

import { useActionState, useState } from "react"
import { useFormStatus } from "react-dom"
import { ShieldCheck, CheckCircle2, AlertCircle, KeyRound } from "lucide-react"
import {
  changeAdminPassword,
  type AdminActionResult,
} from "@/app/(admin)/admin/admin-actions"
import { Button } from "@/components/ui/button"

function SaveButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      className="bg-navy text-navy-foreground hover:bg-navy/90"
    >
      {pending ? "Updating…" : "Update password"}
    </Button>
  )
}

export function AdminSecurity() {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState<AdminActionResult | null, FormData>(
    changeAdminPassword,
    null,
  )

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy text-navy-foreground">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-medium text-foreground">Security</p>
            <p className="text-sm text-muted-foreground">
              Change your own leader login password.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen((v) => !v)}
            className="gap-2"
          >
            <KeyRound className="h-4 w-4" />
            {open ? "Cancel" : "Change password"}
          </Button>
        </div>
      </div>

      {open && (
        <form action={formAction} className="mt-5 grid max-w-md gap-4 border-t border-border pt-5">
          <div className="grid gap-2">
            <label htmlFor="next" className="text-sm font-medium text-foreground">
              New password
            </label>
            <input
              id="next"
              name="next"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none ring-ring/30 focus:ring-2"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="confirm" className="text-sm font-medium text-foreground">
              Confirm new password
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none ring-ring/30 focus:ring-2"
            />
          </div>

          {state && (
            <p
              className={`flex items-center gap-1.5 text-sm ${
                state.ok ? "text-success" : "text-destructive"
              }`}
              role="status"
            >
              {state.ok ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              {state.message}
            </p>
          )}

          <div>
            <SaveButton />
          </div>
        </form>
      )}
    </div>
  )
}
