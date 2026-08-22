import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getTenantContext } from "@/lib/tenant"
import { AdminLoginForm } from "@/components/admin-login-form"

export const metadata: Metadata = {
  title: "Leadership sign in | ROOTED",
  description: "Sign in to the ROOTED leadership console.",
  robots: { index: false, follow: false },
}

/**
 * Standalone sign-in for the leadership console. Lives outside the gated
 * (admin) layout so it can render without the console chrome.
 */
export default async function AdminLoginPage() {
  const ctx = await getTenantContext()
  if (ctx?.isSuperAdmin) redirect("/platform")
  if (ctx && ctx.role === "admin") redirect("/admin")

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted px-4 py-12">
      <AdminLoginForm />
    </main>
  )
}
