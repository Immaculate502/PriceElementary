"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { AlertCircle } from "lucide-react"
import { setChurchSuspended, type ChurchRow, type PlatformResult } from "@/app/platform/platform-actions"
import { Button } from "@/components/ui/button"

const ACTIVE = ["trialing", "active", "past_due"]

function statusStyle(status: string | null, suspended: boolean): string {
  if (suspended) return "bg-destructive/15 text-destructive"
  if (ACTIVE.includes(status ?? "")) return "bg-success/15 text-success"
  return "bg-muted text-muted-foreground"
}

function SuspendButton({ suspended }: { suspended: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      size="sm"
      variant={suspended ? "default" : "outline"}
      disabled={pending}
      className={suspended ? "bg-navy text-navy-foreground hover:bg-navy/90" : ""}
    >
      {pending ? "Saving…" : suspended ? "Reactivate" : "Suspend"}
    </Button>
  )
}

export function PlatformChurchTable({ churches }: { churches: ChurchRow[] }) {
  const [state, formAction] = useActionState<PlatformResult | null, FormData>(
    setChurchSuspended,
    null,
  )

  if (churches.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
        No churches have registered yet.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {state && !state.ok && (
        <p className="flex items-center gap-1.5 border-b border-border bg-destructive/5 px-5 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.message}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">Church</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Members</th>
              <th className="px-5 py-3 font-medium">Joined</th>
              <th className="px-5 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {churches.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="px-5 py-4">
                  <div className="font-medium text-foreground">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.contactEmail ?? `/${c.slug}`}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${statusStyle(
                      c.subscriptionStatus,
                      c.suspended,
                    )}`}
                  >
                    {c.suspended ? "suspended" : c.subscriptionStatus ?? "not started"}
                  </span>
                </td>
                <td className="px-5 py-4 text-foreground">{c.memberCount}</td>
                <td className="px-5 py-4 text-muted-foreground">
                  {new Date(c.createdAt).toLocaleDateString()}
                </td>
                <td className="px-5 py-4 text-right">
                  <form action={formAction} className="inline">
                    <input type="hidden" name="churchId" value={c.id} />
                    <input type="hidden" name="suspend" value={(!c.suspended).toString()} />
                    <SuspendButton suspended={c.suspended} />
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
