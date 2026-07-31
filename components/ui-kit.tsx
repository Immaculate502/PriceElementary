import type React from "react"
import { cn } from "@/lib/utils"
import { PILLAR_META, PILLARS, type FamePillar, type SubmissionStatus } from "@/lib/types"

export function PillarProgressBars({
  progress,
  size = "sm",
}: {
  progress: Record<FamePillar, number>
  size?: "sm" | "lg"
}) {
  const max = Math.max(1, ...PILLARS.map((p) => progress[p]))
  return (
    <div className={cn("grid gap-2", size === "lg" && "gap-3")}>
      {PILLARS.map((pillar) => {
        const meta = PILLAR_META[pillar]
        const value = progress[pillar]
        const pct = Math.round((value / max) * 100)
        return (
          <div key={pillar} className="flex items-center gap-2">
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded font-display font-bold text-white",
                size === "lg" ? "h-6 w-6 text-sm" : "h-5 w-5 text-xs",
              )}
              style={{ backgroundColor: meta.token }}
              title={meta.label}
              aria-hidden="true"
            >
              {meta.letter}
            </span>
            {size === "lg" && (
              <span className="w-24 shrink-0 text-sm text-foreground">{meta.label}</span>
            )}
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: meta.token }}
              />
            </div>
            <span
              className={cn(
                "shrink-0 text-right tabular-nums text-muted-foreground",
                size === "lg" ? "w-8 text-sm" : "w-5 text-xs",
              )}
            >
              {value}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function PageHeader({
  title,
  description,
  eyebrow,
  action,
}: {
  title: string
  description?: string
  eyebrow?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-accent-foreground/70">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-3xl font-semibold text-foreground text-balance">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function Card({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function PillarBadge({ pillar }: { pillar: FamePillar }) {
  const meta = PILLAR_META[pillar]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{
        backgroundColor: `color-mix(in oklch, ${meta.token} 14%, transparent)`,
        color: meta.token,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: meta.token }}
        aria-hidden="true"
      />
      {meta.label}
    </span>
  )
}

const statusStyles: Record<SubmissionStatus, string> = {
  pending: "bg-warning/15 text-warning",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
}

export function StatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize",
        statusStyles[status],
      )}
    >
      {status}
    </span>
  )
}

export function EmptyState({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-secondary/40 p-10 text-center">
      <p className="font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  )
}
