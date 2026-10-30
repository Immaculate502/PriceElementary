"use client"

import { useEffect, useState } from "react"
import { useFormStatus } from "react-dom"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { EventActionResult } from "@/app/events-actions"

export const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-gold focus-visible:ring-2 focus-visible:ring-ring"

export function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {hint && <span className="font-normal text-muted-foreground"> {hint}</span>}
      </label>
      {children}
    </div>
  )
}

export function ActionMessage({ state }: { state: EventActionResult | null }) {
  if (!state) return null
  return (
    <p
      className={`flex items-start gap-1.5 text-sm ${state.ok ? "text-success" : "text-destructive"}`}
      role="status"
    >
      {state.ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      ) : (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      <span className="text-pretty">{state.message}</span>
    </p>
  )
}

export function SubmitButton({
  label,
  pendingLabel,
  name,
  value,
  variant,
  size = "sm",
}: {
  label: string
  pendingLabel: string
  name?: string
  value?: string
  variant?: "default" | "outline" | "secondary" | "destructive" | "ghost"
  size?: "sm" | "default"
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size={size} variant={variant} name={name} value={value} disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  )
}

/** The browser's IANA time zone, resolved after hydration to avoid SSR mismatch. */
export function useBrowserTimeZone(initial?: string) {
  const [tz, setTz] = useState(initial ?? "")
  useEffect(() => {
    if (!initial) setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York")
  }, [initial])
  return tz
}
