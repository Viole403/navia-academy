"use client"

import { useEffect, useRef, type RefObject } from "react"

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(", ")

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.getClientRects().length > 0 || el === document.activeElement,
  )
}

interface UseFocusTrapOptions {
  active: boolean
  containerRef: RefObject<HTMLElement | null>
  initialFocusRef?: RefObject<HTMLElement | null>
  onEscape?: () => void
}

export function useFocusTrap({ active, containerRef, initialFocusRef, onEscape }: UseFocusTrapOptions) {
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const onEscapeRef = useRef(onEscape)

  useEffect(() => {
    onEscapeRef.current = onEscape
  }, [onEscape])

  useEffect(() => {
    if (!active) return

    const container = containerRef.current
    if (!container) return

    previousFocusRef.current = (document.activeElement as HTMLElement | null) ?? null

    const focusables = getFocusable(container)
    ;(initialFocusRef?.current ?? focusables[0] ?? container).focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation()
        onEscapeRef.current?.()
        return
      }
      if (e.key !== "Tab") return
      if (!container) return
      const list = getFocusable(container)
      if (list.length === 0) {
        e.preventDefault()
        return
      }
      const first = list[0]
      const last = list[list.length - 1]
      const current = document.activeElement as HTMLElement | null
      if (e.shiftKey) {
        if (current === first || current === container || !container.contains(current)) {
          e.preventDefault()
          last.focus()
        }
      } else if (current === last || current === container || !container.contains(current)) {
        e.preventDefault()
        first.focus()
      }
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    document.addEventListener("keydown", onKeyDown, true)
    return () => {
      document.removeEventListener("keydown", onKeyDown, true)
      document.body.style.overflow = prevOverflow
      previousFocusRef.current?.focus()
    }
  }, [active, containerRef, initialFocusRef])
}