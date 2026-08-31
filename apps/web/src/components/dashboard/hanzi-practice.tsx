"use client"

import { useEffect, useRef, useState } from "react"
import { Eye, Pencil, Play } from "lucide-react"
import type HanziWriter from "hanzi-writer"
import { Button } from "@/components/ui"
import { useTranslation } from "@/i18n/locale-context"

type Mode = "watch" | "guided" | "memory"

interface Props {
  char: string
  size?: number
  onQuizComplete?: (mistakes: number) => void
}

/** Hanzi Writer wrapper on a Tian Zi Ge grid: animation, guided and memory quiz. */
export function HanziPractice({ char, size = 240, onQuizComplete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const writerRef = useRef<HanziWriter | null>(null)
  const [mode, setMode] = useState<Mode>("watch")
  const { t } = useTranslation()
  const [status, setStatus] = useState<string>(t("hanzi.status.watch"))
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function init() {
      if (!containerRef.current) return
      containerRef.current.innerHTML = ""
      const { default: HW } = await import("hanzi-writer")
      if (cancelled || !containerRef.current) return
      try {
        writerRef.current = HW.create(containerRef.current, char, {
          width: size,
          height: size,
          padding: 12,
          strokeColor:
            getComputedStyle(document.documentElement)
              .getPropertyValue("--ink")
              .trim() || "#1a1714",
          outlineColor:
            getComputedStyle(document.documentElement)
              .getPropertyValue("--grid-line")
              .trim() || "#e5ddca",
          drawingColor:
            getComputedStyle(document.documentElement)
              .getPropertyValue("--accent")
              .trim() || "#b3382c",
          showCharacter: true,
          showOutline: true,
          strokeAnimationSpeed: 1,
          delayBetweenStrokes: 250,
          onLoadCharDataError: () => setLoadError(true),
        })
      } catch {
        setLoadError(true)
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [char, size])

  function animate() {
    setMode("watch")
    setStatus(t("hanzi.status.watch"))
    writerRef.current?.showCharacter()
    writerRef.current?.animateCharacter()
  }

  function startQuiz(memoryMode: boolean) {
    const writer = writerRef.current
    if (!writer) return
    setMode(memoryMode ? "memory" : "guided")
    setStatus(memoryMode ? t("hanzi.status.memory") : t("hanzi.status.guided"))
    if (memoryMode) {
      writer.hideCharacter()
      writer.hideOutline()
    } else {
      writer.showOutline()
    }
    writer.quiz({
      onComplete: (summary) => {
        const mistakes = summary.totalMistakes
        setStatus(
          mistakes === 0
            ? t("hanzi.status.perfect")
            : t("hanzi.status.completed", {
                count: String(mistakes),
                error: mistakes === 1 ? t("hanzi.error") : t("hanzi.errors"),
              })
        )
        onQuizComplete?.(mistakes)
      },
      onMistake: () => setStatus(t("hanzi.status.mistake")),
    })
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-line bg-sunken p-6 text-center text-sm text-ink-faint">
        {t("hanzi.loadError", { char })}
      </div>
    )
  }

  return (
    <div className="inline-flex flex-col items-center gap-3">
      <div
        className="tianzige rounded-lg"
        style={{ width: size, height: size }}
      >
        <div
          ref={containerRef}
          className="relative z-10"
          style={{ width: size, height: size }}
        />
      </div>
      <p className="max-w-60 text-center text-xs text-ink-faint" role="status">
        {status}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          size="sm"
          variant={mode === "watch" ? "primary" : "outline"}
          onClick={animate}
        >
          <Play className="h-3.5 w-3.5" /> {t("hanzi.strokeOrder")}
        </Button>
        <Button
          size="sm"
          variant={mode === "guided" ? "primary" : "outline"}
          onClick={() => startQuiz(false)}
        >
          <Pencil className="h-3.5 w-3.5" /> {t("hanzi.guided")}
        </Button>
        <Button
          size="sm"
          variant={mode === "memory" ? "primary" : "outline"}
          onClick={() => startQuiz(true)}
        >
          <Eye className="h-3.5 w-3.5" /> {t("hanzi.memory")}
        </Button>
      </div>
    </div>
  )
}
