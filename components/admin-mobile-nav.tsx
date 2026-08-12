"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft, Menu, ShieldCheck, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { adminNavLinks, isAdminLinkActive } from "./admin-sidebar"

export function AdminMobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-navy-foreground/90 hover:bg-white/10"
        aria-label="Open leadership menu"
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
          <nav
            className="relative flex h-full w-72 max-w-[80%] flex-col bg-sidebar text-sidebar-foreground"
            aria-label="Leadership navigation"
          >
            <div className="flex items-center justify-between border-b border-sidebar-border px-5 py-5">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-gold" aria-hidden="true" />
                <span className="font-display text-lg font-semibold">Leadership</span>
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10"
                aria-label="Close leadership menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <ul className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
              {adminNavLinks.map(({ href, label, icon: Icon, exact }) => {
                const active = isAdminLinkActive(pathname, href, exact)
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {label}
                    </Link>
                  </li>
                )
              })}
            </ul>

            <div className="border-t border-sidebar-border p-3">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/60"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
                Back to member portal
              </Link>
            </div>
          </nav>
        </div>
      )}
    </div>
  )
}
