import Link from "next/link"
import { Flame } from "lucide-react"
import { MobileNav } from "./mobile-nav"
import { FameEmblem } from "./fame-emblem"
import { SignOutButton } from "./sign-out-button"
import { getCurrentMember } from "@/lib/data"

export async function AppHeader() {
  const member = await getCurrentMember()
  const initials = member.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-border bg-navy px-4 py-3 text-navy-foreground lg:px-8">
      <div className="flex items-center gap-3">
        <MobileNav />
        <Link href="/" className="flex items-center gap-2 lg:hidden">
          <FameEmblem size={32} />
          <span className="font-display text-lg font-semibold">F.A.M.E.</span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm sm:flex">
          <Flame className="h-4 w-4 text-gold" aria-hidden="true" />
          <span className="font-medium">{member.streak}</span>
          <span className="text-navy-foreground/70">day streak</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight">{member.name}</p>
            <p className="text-xs capitalize text-navy-foreground/60">{member.role}</p>
          </div>
          <Link
            href="/profile"
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: member.avatarColor }}
            aria-label="View profile"
          >
            {initials}
          </Link>
          <SignOutButton />
        </div>
      </div>
    </header>
  )
}
