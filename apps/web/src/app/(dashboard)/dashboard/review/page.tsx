"use client"

import { useMounted } from "@/lib/use-mounted"
import Link from "next/link"
import { useMemo, useState } from "react"
import { Brain, Eye, Volume2 } from "lucide-react"
import { useProgress, srsFor } from "@/stores/progress"
import { useSettings, showsTranslation } from "@/stores/settings"
import { dueCards, inExamFor } from "@/lib/derived"
import { masteryLabel } from "@/lib/srs"
import { useVocabulary, vocabById } from "@/lib/vocabulary"
import { useCharacters, charById } from "@/lib/characters"
import { useGrammar, grammarById } from "@/lib/grammar"
import { play } from "@/lib/audio"
import { shuffle } from "@/lib/utils"
import { ttsLocaleFor } from "@/lib/languages"
import type { VoiceLocale } from "@navia/utils"
import type { DisplayModeMode, SrsCard, SrsGrade } from "@/types"
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PinyinText,
  ProgressBar,
  SectionHeader,
  StatCard,
} from "@/components/ui"
import { useTranslation } from "@/i18n/locale-context"
import { locText, translationFor } from "@/lib/content-translation"

interface CardFace {
  front: React.ReactNode
  back: React.ReactNode
  audio?: string
}

function faceFor(
  card: SrsCard,
  t: (key: string, params?: Record<string, string>) => string,
  dm: DisplayModeMode,
  locale: string
): CardFace | null {
  if (card.kind === "word") {
    const w = vocabById(card.itemId)
    if (!w) return null
    return {
      front: (
        <span className="hanzi text-6xl" lang={locale}>
          {w.hanzi ?? w.text}
        </span>
      ),
      back: (
        <div className="text-center">
          {
            <PinyinText
              pinyin={w.pinyin ?? w.romanization ?? ""}
              zhuyin={w.zhuyin}
              className="text-xl font-medium"
            />
          }
          {showsTranslation(dm) && (
            <p className="mt-1 text-lg">{translationFor(w, locale)}</p>
          )}
          {w.examples[0] && (
            <p className="hanzi mt-3 text-sm text-ink-soft" lang={locale}>
              {w.examples[0].hanzi ?? w.examples[0].text ?? ""}{" "}
              {showsTranslation(dm) && (
                <span className="font-sans text-xs text-ink-faint">
                  — {translationFor(w.examples[0], locale)}
                </span>
              )}
            </p>
          )}
        </div>
      ),
      audio: w.hanzi ?? w.text,
    }
  }
  if (card.kind === "character") {
    const c = charById(card.itemId)
    if (!c) return null
    return {
      front: (
        <span className="hanzi text-7xl" lang={locale}>
          {c.char}
        </span>
      ),
      back: (
        <div className="text-center">
          {
            <PinyinText
              pinyin={c.pinyin}
              zhuyin={c.zhuyin}
              className="text-xl font-medium"
            />
          }
          <p className="mt-1 text-lg">{c.meaning}</p>
          <p className="mt-2 text-xs text-ink-faint">
            {c.strokes} strokes · radical {c.radical} ({c.radicalMeaning})
          </p>
        </div>
      ),
      audio: c.char,
    }
  }
  const g = grammarById(card.itemId)
  if (!g) return null
  return {
    front: (
      <div className="text-center">
        <p className="text-sm text-ink-faint">{t("review.structurePrompt")}</p>
        <p className="hanzi mt-2 text-2xl" lang={locale}>
          {g.pattern}
        </p>
        <p className="mt-1 text-sm text-ink-soft">{g.title}</p>
      </div>
    ),
    back: (
      <div className="text-center">
        <p className="text-sm leading-relaxed">
          {locText(g, "simpleExplanation", locale)}
        </p>
        {g.examples[0] && (
          <p className="hanzi mt-3 text-sm text-ink-soft" lang={locale}>
            {g.examples[0].hanzi}{" "}
            {showsTranslation(dm) && (
              <span className="font-sans text-xs text-ink-faint">
                — {translationFor(g.examples[0], locale)}
              </span>
            )}
          </p>
        )}
      </div>
    ),
  }
}

const GRADES: {
  grade: SrsGrade
  key: "forgot" | "difficult" | "good" | "easy"
  cls: string
}[] = [
  { grade: 0, key: "forgot", cls: "border-danger text-danger" },
  { grade: 1, key: "difficult", cls: "border-warn text-warn" },
  { grade: 2, key: "good", cls: "border-jade text-jade" },
  { grade: 3, key: "easy", cls: "border-info text-info" },
]

export default function ReviewPage() {
  const { t } = useTranslation()
  const progress = useProgress()
  const settings = useSettings()
  const [queue, setQueue] = useState<SrsCard[] | null>(null)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [results, setResults] = useState<SrsGrade[]>([])
  const [audioLoading, setAudioLoading] = useState(false)
  const mounted = useMounted()
  const VOCABULARY = useVocabulary()
  const CHARACTERS = useCharacters()
  const GRAMMAR_POINTS = useGrammar()

  const locale = ttsLocaleFor(settings.language) as VoiceLocale
  const langSrs = srsFor(progress, settings.language)
  const isInExam = useMemo(
    () =>
      inExamFor(
        settings.activeExamType,
        VOCABULARY,
        CHARACTERS,
        GRAMMAR_POINTS
      ),
    [settings.activeExamType, VOCABULARY, CHARACTERS, GRAMMAR_POINTS]
  )
  const due = useMemo(
    () => dueCards(langSrs).filter(isInExam),
    [langSrs, isInExam]
  )
  const allCards = useMemo(
    () => Object.values(langSrs).filter(isInExam),
    [langSrs, isInExam]
  )
  const mastered = allCards.filter((c) => c.mastery >= 85).length

  if (!mounted) return null

  /* ------------------------------ Session view ------------------------------ */
  if (queue) {
    if (index >= queue.length) {
      const again = results.filter((g) => g === 0).length
      return (
        <div className="animate-fade-up mx-auto max-w-md py-10 text-center">
          <Brain className="mx-auto h-16 w-16 text-accent" aria-hidden />
          <h1 className="mt-5 font-display text-2xl font-bold">
            {t("review.sessionCompleted")}
          </h1>
          <p className="mt-2 text-ink-soft">
            {t("review.sessionSummary", {
              total: String(queue.length),
              remembered: String(queue.length - again),
            })}
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setQueue(null)
                setIndex(0)
                setResults([])
              }}
            >
              {t("review.backToReviews")}
            </Button>
            <Link href="/dashboard/learn">
              <Button>{t("review.continueStudying")}</Button>
            </Link>
          </div>
        </div>
      )
    }

    const card = queue[index]
    const face = faceFor(card, t, settings.displayMode.mode, locale)
    if (!face) {
      // Orphan card (content changed): skip it.
      setIndex((i) => i + 1)
      return null
    }

    return (
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-between text-xs text-ink-faint">
          <span>
            {index + 1} / {queue.length}
          </span>
          <Badge>
            {card.kind === "word"
              ? t("review.kindWord")
              : card.kind === "character"
                ? t("review.kindCharacter")
                : t("review.kindGrammar")}
          </Badge>
          <span>{t(masteryLabel(card.mastery))}</span>
        </div>
        <ProgressBar
          value={index}
          max={queue.length}
          className="mb-6"
          label={t("review.progress")}
        />

        <Card
          className="animate-brush-in flex min-h-72 flex-col items-center justify-center p-8"
          key={card.itemId + String(revealed)}
        >
          {!revealed ? face.front : face.back}
          {face.audio && revealed && (
            <button
              onClick={() =>
                play(
                  face.audio!,
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
              className="mt-4 cursor-pointer rounded-full border border-line p-2.5 text-ink-faint hover:text-accent disabled:opacity-50"
              aria-label={t("audio.listen")}
            >
              <Volume2 className="h-4 w-4" />
            </button>
          )}
        </Card>

        <div className="mt-6">
          {!revealed ? (
            <Button
              className="w-full"
              size="lg"
              onClick={() => {
                setRevealed(true)
                if (face.audio && settings.autoplayAudio)
                  play(
                    face.audio,
                    {
                      rate: settings.audioRate,
                      onLoadingChange: setAudioLoading,
                      onError: () => {},
                    },
                    locale,
                    settings.voiceGender
                  )
              }}
            >
              <Eye className="h-4 w-4" /> {t("review.showAnswer")}
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {GRADES.map((g) => (
                <button
                  key={g.grade}
                  onClick={() => {
                    progress.reviewCard(card.itemId, g.grade)
                    progress.logStudy(
                      1,
                      card.kind === "grammar"
                        ? "grammar"
                        : card.kind === "character"
                          ? "characters"
                          : "vocabulary",
                      g.grade === 0 ? 1 : 3
                    )
                    setResults((r) => [...r, g.grade])
                    setRevealed(false)
                    if (g.grade === 0) {
                      // Repeat forgotten cards at the end of the session.
                      setQueue((q) => (q ? [...q, card] : q))
                    }
                    setIndex((i) => i + 1)
                  }}
                  className={`cursor-pointer rounded-[var(--radius)] border bg-raised px-3 py-2.5 text-center transition-colors hover:bg-hover ${g.cls}`}
                >
                  <span className="block text-sm font-semibold">
                    {t(`review.grade.${g.key}`)}
                  </span>
                  <span className="block text-xs opacity-70">
                    {t(`review.grade.${g.key}Hint`)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ------------------------------ Overview view ----------------------------- */
  return (
    <div className="animate-fade-up">
      <SectionHeader
        title={t("nav.review")}
        subtitle={t("review.subtitle")}
        action={
          due.length > 0 && (
            <Button
              onClick={() => {
                setQueue(shuffle(due).slice(0, settings.maxReviewsPerDay))
                setIndex(0)
                setResults([])
              }}
            >
              <Brain className="h-4 w-4" />{" "}
              {t("review.startSession", {
                count: String(Math.min(due.length, settings.maxReviewsPerDay)),
              })}
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("review.dueToday")} value={due.length} />
        <StatCard label={t("review.inCollection")} value={allCards.length} />
        <StatCard
          label={t("review.mastered")}
          value={mastered}
          sub={t("review.masteryThreshold")}
        />
        <StatCard
          label={t("review.retention")}
          value={
            allCards.length > 0
              ? `${Math.round(allCards.reduce((a, c) => a + c.mastery, 0) / allCards.length)}%`
              : "—"
          }
          sub={t("review.avgMastery")}
        />
      </div>

      {allCards.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<Brain className="h-10 w-10" />}
            title={t("review.emptyTitle")}
            description={t("review.emptyDesc")}
            action={
              <Link href="/dashboard/learn">
                <Button>{t("review.goToLessons")}</Button>
              </Link>
            }
          />
        </div>
      ) : (
        due.length === 0 && (
          <Card className="mt-6 p-6 text-center">
            <p className="font-display text-lg font-semibold">
              {t("review.allDone")}
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              {t("review.allDoneDesc")}
            </p>
          </Card>
        )
      )}
    </div>
  )
}
