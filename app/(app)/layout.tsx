import type React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import { DemoBanner } from "@/components/demo-banner"
import { ChurchInactiveNotice } from "@/components/church-inactive-notice"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { getTenantContext, getCurrentChurch, churchIsEntitled } from "@/lib/tenant"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // When Supabase is connected, members can only use the app while their
  // church has an active subscription. Super-admins and demo mode bypass this.
  let blocked: "no-church" | "inactive" | null = null
  if (isSupabaseConfigured()) {
    const ctx = await getTenantContext()
    if (ctx && !ctx.isSuperAdmin) {
      if (!ctx.churchId) {
        blocked = "no-church"
      } else if (!churchIsEntitled(await getCurrentChurch())) {
        blocked = "inactive"
      }
    }
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <DemoBanner />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-5xl">
            {blocked ? <ChurchInactiveNotice reason={blocked} /> : children}
          </div>
        </main>
      </div>
    </div>
  )
}
