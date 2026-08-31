"use client"

import { useRef, type KeyboardEvent, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface TabItem {
  id: string
  label: string
}

export function Tabs({
  tabs,
  active,
  onChange,
  className,
  id,
}: {
  tabs: TabItem[]
  active: string
  onChange: (id: string) => void
  className?: string
  /** Base id used to wire each tab to its `tabpanel` (e.g. "vocab"). */
  id?: string
}) {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const tabButtonId = (tabId: string) => (id ? `${id}-tab-${tabId}` : undefined)
  const panelId = (tabId: string) => (id ? `${id}-panel-${tabId}` : undefined)

  const focusTab = (index: number) => {
    const next = tabs[index]
    if (!next) return
    tabRefs.current[next.id]?.focus()
    onChange(next.id)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = tabs.findIndex((t) => t.id === active)
    if (currentIndex < 0) return
    let nextIndex = currentIndex
    if (e.key === "ArrowRight")
      nextIndex = Math.min(currentIndex + 1, tabs.length - 1)
    else if (e.key === "ArrowLeft") nextIndex = Math.max(currentIndex - 1, 0)
    else if (e.key === "Home") nextIndex = 0
    else if (e.key === "End") nextIndex = tabs.length - 1
    else return
    e.preventDefault()
    focusTab(nextIndex)
  }

  return (
    <div
      role="tablist"
      onKeyDown={handleKeyDown}
      className={cn(
        "flex gap-1 overflow-x-auto border-b border-line",
        className
      )}
    >
      {tabs.map((t) => {
        const selected = active === t.id
        return (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[t.id] = el
            }}
            id={tabButtonId(t.id)}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={panelId(t.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={cn(
              "-mb-px cursor-pointer border-b-2 px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              selected
                ? "border-accent text-ink"
                : "border-transparent text-ink-faint hover:text-ink-soft"
            )}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Wraps a tab's content region. Must be paired with a `Tabs` that passes the
 * matching `id`, so the panel is labelled by its tab (`aria-labelledby`).
 */
export function TabPanel({
  baseId,
  tabId,
  className,
  children,
}: {
  baseId: string
  tabId: string
  className?: string
  children: ReactNode
}) {
  return (
    <div
      id={`${baseId}-panel-${tabId}`}
      role="tabpanel"
      aria-labelledby={`${baseId}-tab-${tabId}`}
      tabIndex={0}
      className={cn("outline-none", className)}
    >
      {children}
    </div>
  )
}
