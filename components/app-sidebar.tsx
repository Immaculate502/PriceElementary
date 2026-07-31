"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpen,
  CalendarClock,
  HandHeart,
  Home,
  LayoutDashboard,
  ListChecks,
  MessageSquareQuote,
  NotebookPen,
  ScrollText,
  Sparkles,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { FameEmblem } from "./fame-emblem"

const memberLinks = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/activities", label: "F.A.M.E. Activities", icon: ListChecks },
  { href: "/journal", label: "Journal", icon: NotebookPen },
  { href: "/bible-study", label: "Bible Study", icon: BookOpen },
  { href: "/reading-plan", label: "Reading Plan", icon: ScrollText },
  { href: "/confessions", label: "Confessions", icon: Sparkles },
  { href: "/prayer-requests", label: "Prayer Requests", icon: HandHeart },
  { href: "/prayer-schedule", label: "Prayer Schedule", icon: CalendarClock },
  { href: "/testimonies", label: "Testimonies", icon: MessageSquareQuote },
]

const adminLinks = [
  { href: "/admin", label: "Admin Dashboard", icon: LayoutDashboard },
  { href: "/admin/members", label: "Members", icon: Users },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex items-center gap-3 px-6 py-6">
        <FameEmblem size={48} priority />
        <div className="leading-tight">
          <p className="font-display text-lg font-semibold text-sidebar-foreground">F.A.M.E.</p>
          <p className="text-xs text-sidebar-foreground/60">Spiritual Growth Portal</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-6">
        <p className="px-3 pb-2 pt-4 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40">
          Member
        </p>
        <ul className="flex flex-col gap-1">
          {memberLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
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

        <p className="px-3 pb-2 pt-6 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40">
          Leadership
        </p>
        <ul className="flex flex-col gap-1">
          {adminLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/")
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
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

      <div className="border-t border-sidebar-border px-6 py-4">
        <p className="text-xs text-sidebar-foreground/50 text-pretty">
          {'"Let your light shine before others." — Matthew 5:16'}
        </p>
      </div>
    </aside>
  )
}
