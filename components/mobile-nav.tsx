"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { FameEmblem } from "./fame-emblem"

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/activities", label: "F.A.M.E. Activities" },
  { href: "/journal", label: "Journal" },
  { href: "/bible-study", label: "Bible Study" },
  { href: "/reading-plan", label: "Lessons" },
  { href: "/confessions", label: "Confessions" },
  { href: "/prayer-requests", label: "Prayer Requests" },
  { href: "/prayer-schedule", label: "Prayer Schedule" },
  { href: "/testimonies", label: "Testimonies" },
  { href: "/admin", label: "Admin Dashboard" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/activities", label: "Activities" },
  { href: "/admin/lessons", label: "Lessons" },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-navy-foreground/90 hover:bg-white/10"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            className="absolute inset-0 bg-navy/60 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <nav className="relative flex h-full w-72 max-w-[80%] flex-col bg-sidebar text-sidebar-foreground">
            <div className="flex items-center justify-between px-5 py-5">
              <span className="flex items-center gap-2">
                <FameEmblem size={32} />
                <span className="font-display text-lg font-semibold">F.A.M.E.</span>
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ul className="flex flex-col gap-1 overflow-y-auto px-3 pb-6">
              {links.map(({ href, label }) => {
                const active = pathname === href
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "block rounded-lg px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60",
                      )}
                    >
                      {label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>
      )}
    </div>
  )
}
