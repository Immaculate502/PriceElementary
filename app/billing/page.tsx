import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { headers } from "next/headers"
import { ArrowRight } from "lucide-react"
import { requireChurchAdmin } from "@/lib/admin-auth"
import { getCurrentChurch, churchIsEntitled } from "@/lib/tenant"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { PLAN, PLAN_FEATURES, formatUsd } from "@/lib/billing"
import { BillingPanel } from "@/components/billing-panel"
import { RootedEmblem } from "@/components/rooted-emblem"

export const metadata: Metadata = {
  title: "Billing | ROOTED",
  description: "Manage your church's ROOTED subscription.",
  robots: { index: false, follow: false },
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  if (!isSupabaseConfigured()) redirect("/admin/login")

  const ctx = await requireChurchAdmin()
  if (!ctx) redirect("/admin/login")

  const church = await getCurrentChurch()
  if (!church) redirect("/admin/login")

  const { status } = await searchParams
  const notice = status === "success" ? "success" : status === "cancelled" ? "cancelled" : null

  const entitled = churchIsEntitled(church)

  const h = await headers()
  const origin =
    h.get("origin") ?? (h.get("host") ? `https://${h.get("host")}` : "")
  const inviteUrl = `${origin}/join/${church.slug}`

  return (
    <main className="min-h-screen bg-muted px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <RootedEmblem size={44} priority />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {church.name}
              </p>
              <h1 className="font-display text-2xl font-semibold text-foreground">Billing</h1>
            </div>
          </div>
          {entitled && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-foreground hover:underline"
            >
              Go to console
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        <BillingPanel
          entitled={entitled}
          status={church.subscriptionStatus}
          inviteUrl={inviteUrl}
          planName={PLAN.name}
          monthlyLabel={formatUsd(PLAN.monthlyAmount)}
          setupLabel={formatUsd(PLAN.setupFeeAmount)}
          features={PLAN_FEATURES}
          initialNotice={notice}
        />
      </div>
    </main>
  )
}
