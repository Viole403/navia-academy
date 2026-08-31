"use client"

import { useState } from "react"
import { Bookmark, BookmarkCheck, Volume2 } from "lucide-react"
import type { VocabWord } from "@/types"
import { play } from "@/lib/audio"
import { savedFor, useProgress } from "@/stores/progress"
import { showsTranslation, useSettings } from "@/stores/settings"
import { cn } from "@/lib/utils"
import { PinyinText } from "@/components/ui"
import { useTranslation } from "@/i18n/locale-context"
import { translationFor } from "@/lib/content-translation"
import { formatWordSubtitle } from "@/lib/vocab-utils"
import { isCharScript, ttsLocaleFor } from "@/lib/languages"

export function VocabCard({
  word,
  compact,
}: {
  word: VocabWord
  compact?: boolean
}) {
  const audioRate = useSettings((s) => s.audioRate)
  const displayMode = useSettings((s) => s.displayMode)
  const language = useSettings((s) => s.language)
  const showTranslation = showsTranslation(displayMode.mode)
  const characterSet = displayMode.script
  const langSaved = useProgress((s) => savedFor(s, language))
  const toggleSaved = useProgress((s) => s.toggleSaved)

  const [audioLoading, setAudioLoading] = useState(false)

  const saved = langSaved.includes(word.id)
  const hasCharScript = isCharScript(word.language)
  const contentLocale = ttsLocaleFor(word.language)
  const hanzi =
    characterSet === "traditional" && word.traditional
      ? word.traditional
      : (word.text ?? word.hanzi ?? "")
  const { t, locale } = useTranslation()
  const wordSubtitle = formatWordSubtitle(word)

  return (
    <div
      className={cn(
        "rounded-[var(--radius)] border border-line bg-raised",
        compact ? "p-3" : "p-4"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span
              className={cn(
                hasCharScript ? "hanzi" : "",
                "font-medium",
                compact ? "text-2xl" : "text-3xl"
              )}
              lang={contentLocale}
            >
              {hanzi}
            </span>
            {wordSubtitle && (
              <PinyinText
                pinyin={wordSubtitle}
                zhuyin={word.zhuyin}
                className="text-sm font-medium"
              />
            )}
          </div>
          {showTranslation && (
            <p className="mt-1 text-sm text-ink-soft">
              {translationFor(word, locale)}{" "}
              <span className="text-ink-faint">· {word.pos}</span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() =>
              play(word.audio ?? hanzi, {
                rate: audioRate,
                onLoadingChange: setAudioLoading,
                onError: () => {},
              })
            }
            disabled={audioLoading}
            aria-label={t("audio.listenWord", { hanzi })}
            className="cursor-pointer rounded-lg p-2 text-ink-faint hover:bg-hover hover:text-accent disabled:opacity-50"
          >
            <Volume2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => toggleSaved(word.id)}
            aria-label={saved ? "Remove from saved" : "Save word"}
            aria-pressed={saved}
            className={cn(
              "cursor-pointer rounded-lg p-2 hover:bg-hover",
              saved ? "text-accent" : "text-ink-faint"
            )}
          >
            {saved ? (
              <BookmarkCheck className="h-4 w-4" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      {!compact && word.examples[0] && (
        <div className="mt-3 border-t border-line pt-3 text-sm">
          <p className={hasCharScript ? "hanzi" : ""} lang={contentLocale}>
            {word.examples[0].text ?? word.examples[0].hanzi ?? ""}
          </p>
          {word.examples[0].romanization && (
            <PinyinText
              pinyin={word.examples[0].romanization}
              zhuyin={word.examples[0].zhuyin}
              className="text-xs"
            />
          )}
          {showTranslation && (
            <p className="mt-0.5 text-xs text-ink-faint">
              {translationFor(word.examples[0], locale)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
