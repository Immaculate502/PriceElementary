import type React from "react"
import { RootedEmblem } from "@/components/rooted-emblem"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between bg-navy p-12 text-navy-foreground lg:flex">
        <div className="flex items-center gap-3">
          <RootedEmblem size={56} priority />
          <span className="font-display text-2xl font-semibold tracking-wide">ROOTED</span>
        </div>
        <div>
          <h1 className="font-display text-4xl font-semibold leading-tight text-balance">
            Grow deep roots in Faith, Action, Ministry, and Evangelism.
          </h1>
          <p className="mt-4 max-w-md text-navy-foreground/70 leading-relaxed text-pretty">
            A community portal for tracking your spiritual disciplines, journaling
            your walk, and encouraging one another.
          </p>
        </div>
        <p className="text-sm text-navy-foreground/50">
          {'"Let your light shine before others." — Matthew 5:16'}
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
