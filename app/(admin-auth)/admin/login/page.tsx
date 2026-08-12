import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { isAdminUnlocked } from "@/lib/admin-auth"
import { AdminLoginForm } from "@/components/admin-login-form"

export const metadata: Metadata = {
  title: "Leadership sign in | F.A.M.E.",
  description: "Sign in to the F.A.M.E. leadership console.",
  robots: { index: false, follow: false },
}

/**
 * Standalone sign-in for the leadership console. Lives outside the gated
 * (admin) layout so it can render without the console chrome.
 */
export default async function AdminLoginPage() {
  if (await isAdminUnlocked()) redirect("/admin")

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted px-4 py-12">
      <AdminLoginForm />
    </main>
  )
}
