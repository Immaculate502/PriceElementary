"use client"

import { useActionState, useState } from "react"
import { useFormStatus } from "react-dom"
import Link from "next/link"
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Copy,
  ListChecks,
  Sparkles,
  Users,
} from "lucide-react"
import {
  renameChurch,
  seedStarterActivities,
  type AdminActionResult,
} from "@/app/(admin)/admin/admin-actions"
import { Card } from "@/components/ui-kit"

function Notice({ result }: { result: AdminActionResult | null }) {
  if (!result) return null
  return (
    <p
      className={`flex items-center gap-2 text-sm ${
        result.ok ? "text-success" : "text-destructive"
      }`}
      role="status"
    >
      {result.ok ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      {result.message}
    </p>
  )
}

function SubmitButton({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-navy-foreground transition-colors hover:bg-navy/90 disabled:opacity-60"
    >
      {pending ? busy : idle}
    </button>
  )
}

/** Ordered checklist number badge. */
function StepBadge({ n, done }: { n: number; done?: boolean }) {
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
        done ? "bg-success/15 text-success" : "bg-gold/15 text-gold"
      }`}
      aria-hidden="true"
    >
      {done ? <CheckCircle2 className="h-5 w-5" /> : n}
    </span>
  )
}

export function ChurchSetupWizard({
  churchName,
  memberCount,
  activityCount,
  inviteUrl,
}: {
  churchName: string
  memberCount: number
  activityCount: number
  inviteUrl: string
}) {
  const [renameState, renameAction] = useActionState(renameChurch, null)
  const [seedState, seedAction] = useActionState(
    async () => seedStarterActivities(),
    null,
  )
  const [copied, setCopied] = useState(false)

  const hasActivities = activityCount > 0
  const hasMembers = memberCount > 0

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Step 1 — Name */}
      <Card className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <StepBadge n={1} done />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Name your church
            </h2>
            <p className="text-sm text-muted-foreground">
              This appears across the member portal and on the invite page.
            </p>
          </div>
        </div>
        <form action={renameAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="church-name" className="mb-1.5 block text-sm font-medium text-foreground">
              Church name
            </label>
            <input
              id="church-name"
              name="name"
              defaultValue={churchName}
              required
              minLength={2}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none ring-ring/30 focus:ring-2"
            />
          </div>
          <SubmitButton idle="Save name" busy="Saving..." />
        </form>
        <Notice result={renameState} />
      </Card>

      {/* Step 2 — Starter activities */}
      <Card className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <StepBadge n={2} done={hasActivities} />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Load starter activities
            </h2>
            <p className="text-sm text-muted-foreground">
              Add a ready-made set of Faith, Action, Ministry, and Evangelism
              activities your members can begin working through today. You can
              edit or retire any of them afterward.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
            <ListChecks className="h-4 w-4" aria-hidden="true" />
            {activityCount} {activityCount === 1 ? "activity" : "activities"} in your catalog
          </span>
          {hasActivities && (
            <Link
              href="/admin/activities"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-foreground hover:underline"
            >
              Manage activities
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>

        {!hasActivities && (
          <form action={seedAction}>
            <SubmitButton idle="Add starter activities" busy="Adding..." />
          </form>
        )}
        <Notice result={seedState} />
      </Card>

      {/* Step 3 — Invite members */}
      <Card className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <StepBadge n={3} done={hasMembers} />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Invite your members
            </h2>
            <p className="text-sm text-muted-foreground">
              Share this link so members can create their own accounts under
              your church.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-foreground">
            {inviteUrl}
          </code>
          <button
            type="button"
            onClick={copyInvite}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {copied ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden="true" />
                Copy link
              </>
            )}
          </button>
        </div>

        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
          <Users className="h-4 w-4" aria-hidden="true" />
          {memberCount} {memberCount === 1 ? "member" : "members"} joined
        </span>
      </Card>

      {/* Done */}
      <Card className="flex flex-col items-start gap-3 border-gold/40 bg-gold/5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-medium text-foreground">Ready to shepherd</p>
            <p className="text-sm text-muted-foreground">
              Head to your dashboard to review submissions and guide members.
            </p>
          </div>
        </div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-navy-foreground transition-colors hover:bg-navy/90"
        >
          Go to dashboard
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </Card>
    </div>
  )
}
