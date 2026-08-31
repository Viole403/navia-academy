"use client"

import { cn } from "@/lib/utils"

/** Mechanical SVG grain overlay — industrial print texture. Absolute by default
 *  (pass className to position). Used on the hero only per impeccable.md;
 *  low opacity + blend so it reads in both light and dark modes. */
export function NoiseOverlay({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
    >
      <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <filter id="navia-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect
          width="100%"
          height="100%"
          filter="url(#navia-noise)"
          opacity="0.06"
          style={{ mixBlendMode: "overlay" }}
        />
      </svg>
    </div>
  )
}
