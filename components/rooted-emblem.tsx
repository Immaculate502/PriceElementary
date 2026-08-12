import Image from "next/image"
import { cn } from "@/lib/utils"

/**
 * The ROOTED brand emblem — a tree and cross crest with the name on a banner.
 *
 * The source PNG has a transparent background and is a crest rather than a
 * circle, so it is never clipped to a round shape: `object-contain` lets it
 * sit cleanly on cream, green, or white surfaces alike.
 */
export function RootedEmblem({
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
      src="/rooted-emblem.png"
      alt="ROOTED"
      width={size}
      height={size}
      priority={priority}
      className={cn("object-contain", className)}
    />
  )
}
