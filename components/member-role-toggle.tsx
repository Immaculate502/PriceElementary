"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { AlertCircle, CheckCircle2, ShieldCheck, ShieldMinus } from "lucide-react"
import { setMemberRole, type AdminActionResult } from "@/app/(admin)/admin/admin-actions"
import { Button } from "@/components/ui/button"

function ToggleButton({ isAdmin }: { isAdmin: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      size="sm"
      variant="outline"
      disabled={pending}
      className="gap-1.5 bg-background"
    >
      {isAdmin ? (
        <ShieldMinus className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {pending ? "Saving…" : isAdmin ? "Remove leader access" : "Make leader"}
    </Button>
  )
}

export function MemberRoleToggle({
  memberId,
  memberName,
  isAdmin,
}: {
  memberId: string
  memberName: string
  isAdmin: boolean
}) {
  const [state, formAction] = useActionState<AdminActionResult | null, FormData>(
    setMemberRole,
    null,
  )

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="memberId" value={memberId} />
      <input type="hidden" name="role" value={isAdmin ? "member" : "admin"} />
      <ToggleButton isAdmin={isAdmin} />
      <span className="sr-only">
        {isAdmin ? `Remove leader access from ${memberName}` : `Make ${memberName} a leader`}
      </span>
      {state && (
        <p
          className={`flex items-start gap-1.5 text-xs ${
            state.ok ? "text-muted-foreground" : "text-destructive"
          }`}
          role="status"
        >
          {state.ok ? (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
          {state.message}
        </p>
      )}
    </form>
  )
}
