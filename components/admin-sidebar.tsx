"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArrowLeft,
  ClipboardList,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  Mic,
  ShieldCheck,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Navigation for the standalone Leadership console. `exact` stops the dashboard
 * from staying highlighted while a leader is on one of its sub-pages.
 */
export const adminNavLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/members", label: "Members", icon: Users },
  { href: "/admin/vocal", label: "VOCAL", icon: Mic },
  { href: "/admin/activities", label: "Activities", icon: ClipboardList },
  { href: "/admin/lessons", label: "Lessons", icon: GraduationCap, exact: true },
  { href: "/admin/lessons/responses", label: "Review answers", icon: FileCheck2 },
]

export function isAdminLinkActive(
  pathname: string,
  href: string,
  exact?: boolean,
): boolean {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/")
}

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-6 py-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="leading-tight">
          <p className="font-display text-lg font-semibold text-sidebar-foreground">
            Leadership
          </p>
          <p className="text-xs text-sidebar-foreground/60">ROOTED Console</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Leadership navigation">
        <ul className="flex flex-col gap-1">
          {adminNavLinks.map(({ href, label, icon: Icon, exact }) => {
            const active = isAdminLinkActive(pathname, href, exact)
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          Back to member portal
        </Link>
      </div>
    </aside>
  )
}
