import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Building2, Users, ShieldCheck, ShieldAlert, DollarSign } from "lucide-react"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { isSuperAdmin } from "@/lib/tenant"
import { formatUsd } from "@/lib/billing"
import { listChurches } from "./platform-actions"
import { PlatformChurchTable } from "@/components/platform-church-table"
import { RootedEmblem } from "@/components/rooted-emblem"
import { signOut } from "@/app/(auth)/auth-actions"

export const metadata: Metadata = {
  title: "Platform Console | ROOTED",
  description: "Manage all churches on the ROOTED platform.",
  robots: { index: false, follow: false },
}

export default async function PlatformPage() {
  if (!isSupabaseConfigured()) redirect("/admin/login")
  if (!(await isSuperAdmin())) redirect("/admin/login")

  const { churches, stats } = await listChurches()

  const cards = [
    { label: "Churches", value: String(stats.totalChurches), icon: Building2 },
    { label: "Active", value: String(stats.activeChurches), icon: ShieldCheck },
    { label: "MRR", value: formatUsd(stats.mrrCents), icon: DollarSign },
    { label: "Suspended", value: String(stats.suspendedChurches), icon: ShieldAlert },
    { label: "Total members", value: String(stats.totalMembers), icon: Users },
  ]

  return (
    <main className="min-h-screen bg-muted px-4 py-10">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <RootedEmblem size={44} priority />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Platform
              </p>
              <h1 className="font-display text-2xl font-semibold text-foreground">
                Super Admin Console
              </h1>
            </div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Sign out
            </button>
          </form>
        </header>

        <section className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {cards.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{label}</span>
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <p className="mt-2 font-display text-3xl font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </section>

        <PlatformChurchTable churches={churches} />
      </div>
    </main>
  )
}
