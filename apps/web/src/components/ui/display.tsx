"use client"

import type { ReactNode } from "react"
import {
  cn,
  toneClassForSyllable,
  toneClassForZhuyinSyllable,
} from "@/lib/utils"
import { showsPinyin, showsZhuyin, useSettings } from "@/stores/settings"
import type { DisplayModeMode } from "@/types"

export function ProgressBar({
  value,
  max = 100,
  className,
  label,
}: {
  value: number
  max?: number
  className?: string
  label?: string
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemax={max}
      aria-label={label}
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-sunken",
        className
      )}
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
          {subtitle && (
            <p className="mt-0.5 text-sm text-ink-faint">{subtitle}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  )
}

/**
 * Renders the reading aid for hanzi following the active display mode:
 * pinyin (with tone colors), zhuyin, both ("all"), or nothing ("hanzi only").
 * Pass `mode` explicitly when a page needs its own effective mode (e.g.
 * adaptive-by-level); otherwise it reads the user setting.
 */
export function PinyinText({
  pinyin,
  zhuyin,
  className,
  mode,
}: {
  pinyin: string
  zhuyin?: string
  className?: string
  mode?: DisplayModeMode
}) {
  const storeMode = useSettings((s) => s.displayMode.mode)
  const m = mode ?? storeMode
  const showPinyin = showsPinyin(m)
  const showZhuyin = showsZhuyin(m) && Boolean(zhuyin)

  // Guard: Return null if no reading aid to show OR if pinyin/zhuyin is missing
  if (!showPinyin && !showZhuyin) return null
  if (showPinyin && !pinyin) return null
  if (showZhuyin && !zhuyin) return null

  return (
    <span className={className}>
      {showPinyin &&
        pinyin.split(" ").map((syl, i) => (
          <span key={`p${i}`} className={toneClassForSyllable(syl)}>
            {syl}{" "}
          </span>
        ))}
      {showZhuyin &&
        zhuyin!.split(" ").map((syl, i) => (
          <span key={`z${i}`} className={toneClassForZhuyinSyllable(syl)}>
            {syl}{" "}
          </span>
        ))}
    </span>
  )
}
