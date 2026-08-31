"use client"

import { motion, useReducedMotion } from "framer-motion"
import { useEffect, useState, type ReactNode } from "react"

/**
 * Scroll-reveal wrapper (framer-motion). Fades + lifts content in once it
 * enters the viewport. Respects prefers-reduced-motion (renders static).
 *
 * Content is VISIBLE on first paint (SSR) — the hidden state only applies
 * after hydration, so the page never waits on JS/observer to show itself.
 *
 * `delay` is in MILLISECONDS (matches how every caller in this codebase
 * writes it — `delay={60}`, `delay={i * 70}`, etc.). Framer Motion's
 * `transition.delay` is in seconds, so it gets converted internally —
 * callers should never pass a seconds value here.
 */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  once = true,
}: {
  children: ReactNode
  /** Delay before the reveal animation starts, in milliseconds. */
  delay?: number
  y?: number
  className?: string
  once?: boolean
}) {
  const reduce = useReducedMotion()
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])
  if (reduce || !ready) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.1 }}
      transition={{
        duration: 0.6,
        delay: delay / 1000,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  )
}
