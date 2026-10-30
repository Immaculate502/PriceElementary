import Link from "next/link"

const LINKS = [
  { id: "events", href: "/admin/events", label: "Events" },
  { id: "messages", href: "/admin/events/broadcasts", label: "Messages" },
  { id: "ministries", href: "/admin/events/ministries", label: "Ministries" },
] as const

export function AdminEventsNav({ active }: { active: (typeof LINKS)[number]["id"] }) {
  return (
    <nav aria-label="Event Center" className="flex gap-1 border-b border-border">
      {LINKS.map((l) => (
        <Link
          key={l.id}
          href={l.href}
          aria-current={active === l.id ? "page" : undefined}
          className={
            active === l.id
              ? "-mb-px border-b-2 border-primary px-3 py-2 text-sm font-medium text-foreground"
              : "px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          }
        >
          {l.label}
        </Link>
      ))}
    </nav>
  )
}
