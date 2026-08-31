"use client"

import { useEffect, useRef } from "react"
import {
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion"
import { cn } from "@/lib/utils"

interface NumberTickerProps {
  value: number
  /** Seconds to wait after entering the viewport before counting. */
  delay?: number
  className?: string
}

/**
 * Magic UI "Number Ticker" pattern, adapted to the house system:
 * counts up once when scrolled into view; renders the final value
 * statically under reduced motion.
 */
export function NumberTicker({
  value,
  delay = 0,
  className,
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduce = useReducedMotion()
  const motionValue = useMotionValue(0)
  const springValue = useSpring(motionValue, { damping: 60, stiffness: 100 })
  const isInView = useInView(ref, { once: true, margin: "0px" })

  useEffect(() => {
    if (reduce) return
    let timer: ReturnType<typeof setTimeout> | null = null
    if (isInView) {
      timer = setTimeout(() => motionValue.set(value), delay * 1000)
    }
    return () => {
      if (timer !== null) clearTimeout(timer)
    }
  }, [motionValue, isInView, delay, value, reduce])

  useEffect(
    () =>
      springValue.on("change", (latest) => {
        if (ref.current) {
          ref.current.textContent = new Intl.NumberFormat("en-US").format(
            Math.round(latest)
          )
        }
      }),
    [springValue]
  )

  const staticValue = new Intl.NumberFormat("en-US").format(value)
  return (
    <span ref={ref} className={cn("inline-block tabular-nums", className)}>
      {reduce ? staticValue : 0}
    </span>
  )
}
