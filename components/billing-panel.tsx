"use client"

import { useActionState, useState } from "react"
import { useFormStatus } from "react-dom"
import { AlertCircle, ArrowRight, CheckCircle2, Copy, ExternalLink } from "lucide-react"
import { startCheckout, openBillingPortal, type BillingResult } from "@/app/billing/billing-actions"
import { Button } from "@/components/ui/button"

function ActionButton({
  action,
  idle,
  busy,
  variant = "default",
}: {
  action: () => Promise<BillingResult>
  idle: string
  busy: string
  variant?: "default" | "outline"
}) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending}
      className={variant === "default" ? "bg-navy text-navy-foreground hover:bg-navy/90" : ""}
    >
      {pending ? busy : idle}
    </Button>
  )
}

export function BillingPanel({
  entitled,
  status,
  inviteUrl,
  planName,
  monthlyLabel,
  setupLabel,
  features,
  initialNotice,
}: {
  entitled: boolean
  status: string | null
  inviteUrl: string
  planName: string
  monthlyLabel: string
  setupLabel: string
  features: string[]
  initialNotice: "success" | "cancelled" | null
}) {
  const [checkoutState, checkoutAction] = useActionState(async () => startCheckout(), null)
  const [portalState, portalAction] = useActionState(async () => openBillingPortal(), null)
  const [copied, setCopied] = useState(false)

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const result: BillingResult | null = checkoutState ?? portalState

  return (
    <div className="grid gap-6">
      {initialNotice === "success" && (
        <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Payment received. Your church is active — invite your members below.
        </div>
      )}
      {initialNotice === "cancelled" && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Checkout was cancelled. You can start again whenever you&apos;re ready.
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">{planName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="text-2xl font-semibold text-foreground">{monthlyLabel}</span>
              {" / month"}
            </p>
            <p className="text-sm text-muted-foreground">
              {"One-time setup fee of "}
              {setupLabel}
              {" on your first invoice."}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
              entitled ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
            }`}
          >
            {status ?? "not started"}
          </span>
        </div>

        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap gap-3">
          {!entitled ? (
            <form action={checkoutAction}>
              <ActionButton
                action={startCheckout}
                idle="Start subscription"
                busy="Redirecting to Stripe…"
              />
            </form>
          ) : (
            <form action={portalAction}>
              <ActionButton
                action={openBillingPortal}
                idle="Manage billing"
                busy="Opening portal…"
                variant="outline"
              />
            </form>
          )}
        </div>

        {result && !result.ok && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-destructive" role="status">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {result.message}
          </p>
        )}
      </div>

      {entitled && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="font-display text-lg font-semibold text-foreground">Invite your members</h3>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            Share this link with your youth so they can create their accounts and join your church.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-muted px-3 py-2 text-sm">
              {inviteUrl}
            </code>
            <Button type="button" variant="outline" onClick={copyInvite} className="gap-2">
              <Copy className="h-4 w-4" />
              {copied ? "Copied!" : "Copy"}
            </Button>
            <a
              href={inviteUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <ExternalLink className="h-4 w-4" />
              Open
            </a>
          </div>

          <a
            href="/admin/setup"
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2.5 text-sm font-medium text-navy-foreground transition-colors hover:bg-navy/90"
          >
            Continue to church setup
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      )}
    </div>
  )
}
