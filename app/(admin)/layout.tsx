import type React from "react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { isAdminUnlocked } from "@/lib/admin-auth"
import { AdminSidebar } from "@/components/admin-sidebar"
import { AdminHeader } from "@/components/admin-header"

export const metadata: Metadata = {
  title: "Leadership Console | F.A.M.E.",
  description: "Restricted leadership area for F.A.M.E. group administrators.",
  robots: { index: false, follow: false },
}

/**
 * Standalone Leadership console shell. Completely separate from the member
 * app: its own sidebar, header and sign-in. Locked visitors are sent to the
 * dedicated /admin/login page rather than seeing the console chrome.
 */
export default async function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (!(await isAdminUnlocked())) redirect("/admin/login")

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
