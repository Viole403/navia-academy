"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function Card({
  className,
  children,
  onClick,
  ...rest
}: {
  className?: string
  children: ReactNode
  onClick?: () => void
} & React.HTMLAttributes<HTMLDivElement>) {
  const interactive = Boolean(onClick)
  return (
    <div
      {...rest}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onClick?.()
              }
            }
          : rest.onKeyDown
      }
      role={interactive ? "button" : rest.role}
      tabIndex={interactive ? 0 : rest.tabIndex}
      className={cn(
        "rounded-[var(--radius)] border border-line bg-raised shadow-[var(--shadow)]",
        interactive &&
          "cursor-pointer transition-colors hover:border-line-strong focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none",
        className
      )}
    >
      {children}
    </div>
  )
}

export function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string
  value: ReactNode
  sub?: string
  icon?: ReactNode
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium tracking-wide text-ink-faint uppercase">
          {label}
        </p>
        {icon && <span className="text-ink-faint">{icon}</span>}
      </div>
      <p className="mt-1.5 font-display text-2xl font-bold text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-faint">{sub}</p>}
    </Card>
  )
}
