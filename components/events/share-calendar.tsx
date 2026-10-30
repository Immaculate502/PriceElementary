"use client"

import { useState } from "react"
import { CalendarPlus, Check, Link2 } from "lucide-react"
import { shareLinks } from "@/lib/event-types"

const btn =
  "inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary"

export function ShareCalendar({
  icsHref,
  googleHref,
  shareUrl,
  title,
}: {
  icsHref: string
  googleHref: string
  shareUrl: string | null
  title: string
}) {
  const [copied, setCopied] = useState(false)
  const links = shareUrl ? shareLinks(shareUrl, title) : null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <a href={icsHref} className={btn}>
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          Apple / Outlook
        </a>
        <a href={googleHref} target="_blank" rel="noopener noreferrer" className={btn}>
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          Google Calendar
        </a>
      </div>
      {links && shareUrl && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={btn}
            onClick={async () => {
              try {
                if (navigator.share) {
                  await navigator.share({ title, url: shareUrl })
                  return
                }
              } catch {
                // User dismissed the share sheet — fall back to copying.
              }
              await navigator.clipboard.writeText(shareUrl)
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
          >
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
            {copied ? "Link copied" : "Share link"}
          </button>
          <a href={links.facebook} target="_blank" rel="noopener noreferrer" className={btn}>Facebook</a>
          <a href={links.x} target="_blank" rel="noopener noreferrer" className={btn}>X</a>
          <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" className={btn}>WhatsApp</a>
          <a href={links.email} className={btn}>Email</a>
        </div>
      )}
    </div>
  )
}
