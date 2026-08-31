"use client"

import { type ComponentPropsWithoutRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface MarqueeProps extends ComponentPropsWithoutRef<"div"> {
  className?: string
  reverse?: boolean
  pauseOnHover?: boolean
  vertical?: boolean
  repeat?: number
  children: ReactNode
}

/** Infinite horizontal scroll strip. CSS-only, honors prefers-reduced-motion
 *  (rows render statically, they just stop translating). House-styled variant
 *  of the MagicUI marquee; keep to ONE marquee per page. */
export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  vertical = false,
  repeat = 4,
  children,
  ...props
}: MarqueeProps) {
  return (
    <div
      {...props}
      className={cn(
        "group flex [gap:var(--gap)] overflow-hidden [--duration:40s] [--gap:1rem]",
        vertical && "flex-col",
        className
      )}
    >
      {Array.from({ length: repeat }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex shrink-0 justify-around [gap:var(--gap)]",
            vertical ? "[flex-direction:column]" : "flex-row",
            vertical
              ? "animate-marquee-vertical"
              : reverse
                ? "animate-marquee-reverse"
                : "animate-marquee",
            pauseOnHover && "group-hover:[animation-play-state:paused]"
          )}
        >
          {children}
        </div>
      ))}
    </div>
  )
}
