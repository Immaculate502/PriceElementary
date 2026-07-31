import Image from "next/image"
import { cn } from "@/lib/utils"

/**
 * The F.A.M.E. brand emblem — gold crown badge on black.
 * Rendered as a circular image so it sits cleanly on any surface.
 */
export function FameEmblem({
  size = 44,
  className,
  priority = false,
}: {
  size?: number
  className?: string
  priority?: boolean
}) {
  return (
    <Image
      src="/fame-emblem.png"
      alt="F.A.M.E. — Faith Actions Move Everything"
      width={size}
      height={size}
      priority={priority}
      className={cn("rounded-full object-contain", className)}
    />
  )
}
