"use client"

import { useMounted } from "@/lib/use-mounted"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Volume2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useCharacters, charById } from "@/lib/characters"
import { useVocabulary } from "@/lib/vocabulary"
import { srsFor, useProgress } from "@/stores/progress"
import { showsTranslation, useSettings } from "@/stores/settings"
import { play } from "@/lib/audio"
import { masteryLabel } from "@/lib/srs"
import { ttsLocaleFor } from "@/lib/languages"
import type { VoiceLocale } from "@navia/utils"
import { useTranslation } from "@/i18n/locale-context"
import { locText } from "@/lib/content-translation"
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ExamBadge,
  PinyinText,
} from "@/components/ui"
import { HanziPractice } from "@/components/dashboard/hanzi-practice"

export default function CharDetailPage() {
  const { charId } = useParams<{ charId: string }>()
  const char = charById(charId)
  const progress = useProgress()
  const settings = useSettings()
  const [audioLoading, setAudioLoading] = useState(false)
  const mounted = useMounted()
  const CHARACTERS = useCharacters()
  const vocabulary = useVocabulary()
  const vocabById = useMemo(
    () => new Map(vocabulary.map((w) => [w.id, w] as const)),
    [vocabulary]
  )
  const { t, locale: uiLocale } = useTranslation()
  useEffect(() => {
    // Auto-enroll into the review deck: opening a character's detail counts as learning it.
    if (char) progress.ensureCard(char.id, "character")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [char?.id])
  if (!mounted) return null

  if (!char) {
    return (
      <EmptyState
        title="Character not found"
        action={
          <Link href="/dashboard/characters">
            <Button>{t("common.backTo", { page: t("nav.characters") })}</Button>
          </Link>
        }
      />
    )
  }

  const locale = ttsLocaleFor(settings.language) as VoiceLocale
  const card = srsFor(progress, settings.language)[char.id]
  const words = char.words.map((id) => vocabById.get(id)).filter(Boolean)
  const similar = (char.similar ?? [])
    .map((s) => CHARACTERS.find((c) => c.char === s))
    .filter(Boolean)

  return (
    <div className="animate-fade-up mx-auto max-w-3xl">
      <Link
        href="/dashboard/characters"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Characters
      </Link>

      <div className="grid gap-6 md:grid-cols-[auto_1fr]">
        <Card className="flex flex-col items-center p-6">
          <HanziPractice
            char={char.char}
            size={240}
            onQuizComplete={(mistakes) => {
              progress.ensureCard(char.id, "character")
              progress.reviewCard(
                char.id,
                mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1
              )
              progress.logStudy(2, "characters", mistakes === 0 ? 8 : 4)
              progress.unlockAchievements()
            }}
          />
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="hanzi text-4xl" lang={locale}>
                    {char.char}
                  </span>
                  <PinyinText
                    pinyin={char.pinyin}
                    zhuyin={char.zhuyin}
                    className="text-xl font-medium"
                  />
                  <button
                    onClick={() =>
                      play(
                        char.audio ?? char.char,
                        {
                          rate: settings.audioRate,
                          onLoadingChange: setAudioLoading,
                          onError: () => {},
                        },
                        locale,
                        settings.voiceGender
                      )
                    }
                    disabled={audioLoading}
                    className="cursor-pointer rounded p-1.5 text-ink-faint hover:text-accent disabled:opacity-50"
                    aria-label={t("audio.listen")}
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                </div>
                {showsTranslation(settings.displayMode.mode) && (
                  <p className="mt-1 text-lg text-ink-soft">{char.meaning}</p>
                )}
                {char.traditional && (
                  <p className="mt-1 text-sm text-ink-faint">
                    {t("characters.traditional")}{" "}
                    <span className="hanzi text-lg" lang="zh-TW">
                      {char.traditional}
                    </span>
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <ExamBadge
                  hsk={char.hsk}
                  examMappings={char.examMappings}
                  currentExam={settings.activeExamType}
                />
                <Badge
                  tone={
                    card ? (card.mastery >= 60 ? "success" : "warn") : "neutral"
                  }
                >
                  {card
                    ? t(masteryLabel(card.mastery))
                    : t("characters.notStudied")}
                </Badge>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold">
              {t("characters.structure")}
            </h2>
            <dl className="mt-2 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-faint">
                  {t("characters.strokesLabel")}
                </dt>
                <dd>{char.strokes}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-faint">{t("characters.radical")}</dt>
                <dd className="hanzi" lang={locale}>
                  {char.radical}{" "}
                  {showsTranslation(settings.displayMode.mode) && (
                    <span className="font-sans text-xs text-ink-faint">
                      ({char.radicalMeaning})
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-faint">{t("characters.components")}</dt>
                <dd className="hanzi" lang={locale}>
                  {char.components.join(" + ")}
                </dd>
              </div>
            </dl>
            {char.mnemonic && showsTranslation(settings.displayMode.mode) && (
              <p className="mt-3 rounded-lg bg-sunken px-3 py-2 text-sm text-ink-soft">
                💡 {locText(char, "mnemonic", uiLocale)}
              </p>
            )}
          </Card>
        </div>
      </div>

      {words.length > 0 && (
        <Card className="mt-4 p-5">
          <h2 className="text-sm font-semibold">{t("characters.words")}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {words.map((w) => (
              <Link
                key={w!.id}
                href={`/dashboard/vocabulary/${w!.id}`}
                className="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-accent"
              >
                <span className="hanzi" lang={locale}>
                  {w!.hanzi}
                </span>{" "}
                {showsTranslation(settings.displayMode.mode) && (
                  <span className="text-ink-faint">· {w!.translation}</span>
                )}
              </Link>
            ))}
          </div>
        </Card>
      )}

      {similar.length > 0 && (
        <Card className="mt-4 p-5">
          <h2 className="text-sm font-semibold">{t("characters.similar")}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {similar.map((s) => (
              <Link
                key={s!.id}
                href={`/dashboard/characters/${s!.id}`}
                className="hanzi rounded-lg border border-line px-3 py-2 text-2xl hover:border-accent"
                lang={locale}
                title={
                  showsTranslation(settings.displayMode.mode)
                    ? `${s!.pinyin} · ${s!.meaning}`
                    : s!.pinyin
                }
              >
                {s!.char}
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
