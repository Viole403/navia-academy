"use client"

import { useCallback, useEffect, useState } from "react"
import { useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

export interface TypeCycleItem {
  text: string
  /** Exam identity color for the marker dot (CSS color / var). */
  color?: string
  /** Optional exam key for external consumers. */
  key?: string
}

interface TypeCycleProps {
  items: TypeCycleItem[]
  typeSpeed?: number
  deleteSpeed?: number
  pause?: number
  className?: string
  showDot?: boolean
  initialIndex?: number
}

/**
 * Shared typing-state hook — powers TypeCycle and external consumers
 * that need a synchronized cycler across multiple render sites.
 */
export function useTypeCycler(
  items: TypeCycleItem[],
  opts?: {
    initialIndex?: number
    typeSpeed?: number
    deleteSpeed?: number
    pause?: number
  }
) {
  const reduce = useReducedMotion()
  const [idx, setIdx] = useState(opts?.initialIndex ?? 0)
  const [len, setLen] = useState(0)
  const [deleting, setDeleting] = useState(false)

  const item = items[idx % items.length] ?? { text: "" }

  useEffect(() => {
    if (reduce) return
    const full = item.text
    let delay = deleting ? (opts?.deleteSpeed ?? 22) : (opts?.typeSpeed ?? 45)
    let next: () => void = () => setLen((v) => v + (deleting ? -1 : 1))
    if (!deleting && len === full.length) {
      delay = opts?.pause ?? 1600
      next = () => setDeleting(true)
    } else if (deleting && len === 0) {
      next = () => {
        setDeleting(false)
        setIdx((i) => (i + 1) % items.length)
      }
    }
    const t = setTimeout(next, delay)
    return () => clearTimeout(t)
  }, [len, deleting, idx, item.text, items.length, reduce, opts])

  const jumpTo = useCallback(
    (target: number) => {
      const i = ((target % items.length) + items.length) % items.length
      setIdx(i)
      setLen(0)
      setDeleting(false)
    },
    [items.length]
  )

  return {
    item,
    text: reduce ? item.text : item.text.slice(0, len),
    reduce,
    jumpTo,
  }
}

/**
 * Typewriter that cycles through phrases: types, pauses, deletes, moves on.
 * Reduced motion renders the current phrase statically (no typing, no cycling).
 * Decorative by contract — parent owns the accessible equivalent.
 */
export function TypeCycle({
  items,
  typeSpeed = 45,
  deleteSpeed = 22,
  pause = 1600,
  className,
  showDot = true,
  initialIndex = 0,
}: TypeCycleProps) {
  const { item, text, reduce } = useTypeCycler(items, {
    initialIndex,
    typeSpeed,
    deleteSpeed,
    pause,
  })

  const dot = showDot ? (
    <span
      aria-hidden
      className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ background: item.color ?? "var(--accent)" }}
    />
  ) : null

  if (reduce) {
    return (
      <span className={cn("inline-flex items-center gap-2", className)}>
        {dot}
        <span>{item.text}</span>
      </span>
    )
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {dot}
      <span>
        {text}
        <span className="animate-pulse">▍</span>
      </span>
    </span>
  )
}
