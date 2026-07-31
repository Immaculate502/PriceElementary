import type React from "react"
import { isAdminUnlocked } from "@/lib/admin-auth"
import { AdminGate } from "@/components/admin-gate"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const unlocked = await isAdminUnlocked()
  if (!unlocked) return <AdminGate />
  return <>{children}</>
}
