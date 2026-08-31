"use client"

import { useSettings, showsTranslation } from "@/stores/settings"
import { PinyinText } from "@/components/ui"
import type { DisplayMode, DisplayModeMode } from "@/types"

interface HanziDisplayProps {
  hanzi: string
  traditional?: string
  pinyin?: string
  zhuyin?: string
  translation?: string
  className?: string
  size?: "md" | "lg" | "xl"
  hsk?: 1 | 2 | 3 | 4 | 5 | 6 | 7
}

function resolveMode(
  base: DisplayMode,
  hsk?: 1 | 2 | 3 | 4 | 5 | 6 | 7
): DisplayModeMode {
  if (!base.adaptiveByLevel || !hsk) return base.mode
  return base.levelOverrides[hsk] ?? base.mode
}

export function HanziDisplay({
  hanzi,
  traditional,
  pinyin,
  zhuyin,
  translation,
  className = "",
  size,
  hsk,
}: HanziDisplayProps) {
  const displayMode = useSettings((s) => s.displayMode)
  const hanziSizeSetting = useSettings((s) => s.hanziSize)
  const hanziSize = size ?? hanziSizeSetting

  const script =
    displayMode.script === "traditional" && traditional ? traditional : hanzi
  const effectiveMode = resolveMode(displayMode, hsk)
  const showTranslation = showsTranslation(effectiveMode)
  const sizeClass =
    hanziSize === "xl"
      ? "text-3xl"
      : hanziSize === "lg"
        ? "text-2xl"
        : "text-xl"

  return (
    <span
      className={`inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${className}`}
    >
      <span className={`hanzi ${sizeClass}`} lang="zh-CN">
        {script}
      </span>
      {(pinyin || zhuyin) && (
        <PinyinText
          pinyin={pinyin ?? ""}
          zhuyin={zhuyin}
          mode={effectiveMode}
          className="text-sm"
        />
      )}
      {showTranslation && translation && (
        <span className="text-sm text-ink-faint">= {translation}</span>
      )}
    </span>
  )
}
