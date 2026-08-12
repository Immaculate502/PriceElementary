import Link from "next/link"
import { Lock, ShieldCheck } from "lucide-react"
import { AdminMobileNav } from "./admin-mobile-nav"
import { lockAdmin } from "@/app/(admin)/admin/admin-actions"

export function AdminHeader() {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-border bg-navy px-4 py-3 text-navy-foreground lg:px-8">
      <div className="flex items-center gap-3">
        <AdminMobileNav />
        <Link href="/admin" className="flex items-center gap-2 lg:hidden">
          <ShieldCheck className="h-5 w-5 text-gold" aria-hidden="true" />
          <span className="font-display text-lg font-semibold">Leadership</span>
        </Link>
        <span className="hidden items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium uppercase tracking-wider lg:inline-flex">
          <ShieldCheck className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
          Restricted area
        </span>
      </div>

      <form action={lockAdmin}>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium transition-colors hover:bg-white/20"
        >
          <Lock className="h-4 w-4" aria-hidden="true" />
          Lock console
        </button>
      </form>
    </header>
  )
}
