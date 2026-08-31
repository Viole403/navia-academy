"use client"

import { useMounted } from "@/lib/use-mounted"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useMemo, useRef, useState } from "react"
import { ArrowLeft, Eye, EyeOff, Volume2, X } from "lucide-react"
import { useFocusTrap } from "@/hooks/use-focus-trap"
import { useReadings, readingById } from "@/lib/readings"
import { useVocabulary } from "@/lib/vocabulary"
import { useProgress } from "@/stores/progress"
import { showsPinyin, showsTranslation, useSettings } from "@/stores/settings"
import { play } from "@/lib/audio"
import { useTranslation } from "@/i18n/locale-context"
import { locText, translationFor } from "@/lib/content-translation"
import { cn } from "@/lib/utils"
import type { VocabWord } from "@/types"
import {
  Button,
  Card,
  EmptyState,
  PinyinText,
  SectionHeader,
} from "@/components/ui"
import { ExercisePlayer } from "@/components/dashboard/exercise-player"
import { VocabCard } from "@/components/dashboard/vocab-card"

/** Greedy longest-match segmentation against the course dictionary. */
function segment(
  text: string,
  vocabulary: VocabWord[]
): { token: string; word: VocabWord | null }[] {
  const out: { token: string; word: VocabWord | null }[] = []
  let i = 0
  while (i < text.length) {
    let match: VocabWord | null = null
    for (let len = Math.min(4, text.length - i); len >= 1; len--) {
      const slice = text.slice(i, i + len)
      const w = vocabulary.find((v) => (v.hanzi ?? v.text) === slice)
      if (w) {
        match = w
        break
      }
    }
    if (match) {
      out.push({ token: match.hanzi ?? match.text ?? "", word: match })
      i += (match.hanzi ?? match.text ?? "").length
    } else {
      out.push({ token: text[i], word: null })
      i += 1
    }
  }
  return out
}

export default function ReadingDetailPage() {
  const { readingId } = useParams<{ readingId: string }>()
  const reading = readingById(readingId)
  const progress = useProgress()
  const settings = useSettings()
  const { t, locale } = useTranslation()
  const [selected, setSelected] = useState<VocabWord | null>(null)
  const [showQuestions, setShowQuestions] = useState(false)
  const [audioLoading, setAudioLoading] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)
  useFocusTrap({
    active: selected !== null,
    containerRef: popupRef,
    onEscape: () => setSelected(null),
  })
  const mounted = useMounted()
  useReadings()
  const vocabulary = useVocabulary()

  const segments = useMemo(
    () =>
      reading?.paragraphs.map((p) =>
        segment(p.hanzi ?? p.text ?? "", vocabulary)
      ) ?? [],
    [reading, vocabulary]
  )

  if (!mounted) return null

  if (!reading) {
    return (
      <EmptyState
        title="Lectura no encontrada"
        action={
          <Link href="/dashboard/reading">
            <Button>{t("common.backTo", { page: t("nav.reading") })}</Button>
          </Link>
        }
      />
    )
  }

  return (
    <div className="animate-fade-up mx-auto max-w-2xl">
      <Link
        href="/dashboard/reading"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Readings
      </Link>

      <SectionHeader
        title={reading.title}
        subtitle={locText(reading, "summary", locale)}
        action={
          <div className="flex gap-1">
            <button
              onClick={() =>
                settings.setDisplayMode({
                  mode: showsPinyin(settings.displayMode.mode)
                    ? "none"
                    : "hanyu+trans",
                })
              }
              aria-pressed={showsPinyin(settings.displayMode.mode)}
              className={cn(
                "cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-medium hover:bg-hover",
                showsPinyin(settings.displayMode.mode)
                  ? "text-accent"
                  : "text-ink-faint"
              )}
            >
              pīn
            </button>
            <button
              onClick={() =>
                settings.setDisplayMode({
                  mode: showsTranslation(settings.displayMode.mode)
                    ? "hanyu"
                    : "hanyu+trans",
                })
              }
              aria-pressed={showsTranslation(settings.displayMode.mode)}
              className={cn(
                "cursor-pointer rounded-lg p-2 hover:bg-hover",
                showsTranslation(settings.displayMode.mode)
                  ? "text-accent"
                  : "text-ink-faint"
              )}
              title="Show/hide translation"
            >
              {showsTranslation(settings.displayMode.mode) ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </button>
          </div>
        }
      />

      <p className="mb-4 text-xs text-ink-faint">
        Tap any underlined word to view its card and save it.
      </p>

      <div className="space-y-5">
        {reading.paragraphs.map((p, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <p
                className={cn(
                  "hanzi leading-relaxed",
                  settings.hanziSize === "xl"
                    ? "text-3xl"
                    : settings.hanziSize === "lg"
                      ? "text-2xl"
                      : "text-xl"
                )}
                lang="zh-CN"
              >
                {segments[i]?.map((seg, j) =>
                  seg.word ? (
                    <button
                      key={j}
                      onClick={() => setSelected(seg.word)}
                      className="cursor-pointer rounded decoration-accent/50 underline-offset-4 hover:bg-accent-soft hover:underline"
                    >
                      {seg.token}
                    </button>
                  ) : (
                    <span key={j}>{seg.token}</span>
                  )
                )}
              </p>
              <button
                onClick={() =>
                  play(
                    p.audio ?? p.hanzi ?? p.text ?? "",
                    {
                      rate: settings.audioRate,
                      onLoadingChange: setAudioLoading,
                      onError: () => {},
                    },
                    "zh-CN",
                    settings.voiceGender
                  )
                }
                disabled={audioLoading}
                className="mt-1 shrink-0 cursor-pointer rounded p-1.5 text-ink-faint hover:text-accent disabled:opacity-50"
                aria-label={t("audio.listenParagraph")}
              >
                <Volume2 className="h-4 w-4" />
              </button>
            </div>
            {
              <PinyinText
                pinyin={p.pinyin ?? p.romanization ?? ""}
                zhuyin={p.zhuyin}
                className="mt-2 block text-sm"
              />
            }
            {showsTranslation(settings.displayMode.mode) && (
              <p className="mt-1 text-sm text-ink-faint">
                {translationFor(p, locale)}
              </p>
            )}
          </Card>
        ))}
      </div>

      {!showQuestions ? (
        <Button className="mt-6 w-full" onClick={() => setShowQuestions(true)}>
          Comprehension questions
        </Button>
      ) : (
        <div className="mt-6 space-y-4">
          {reading.questions.map((q) => (
            <Card key={q.id} className="p-5">
              <ExercisePlayer
                exercise={q}
                onResult={(ok) => {
                  progress.logStudy(2, "reading", ok ? 8 : 2)
                  progress.unlockAchievements()
                }}
              />
            </Card>
          ))}
        </div>
      )}

      {/* Word popup */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={(e) => e.target === e.currentTarget && setSelected(null)}
        >
          <div
            ref={popupRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("reading.wordDialog")}
            className="animate-fade-up w-full max-w-md"
          >
            <div className="relative">
              <button
                onClick={() => setSelected(null)}
                aria-label={t("common.close")}
                className="absolute -top-2 right-2 z-10 cursor-pointer rounded-full border border-line bg-raised p-1.5 text-ink-faint hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
              <VocabCard word={selected} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
