"use client"

import { useMounted } from "@/lib/use-mounted"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, ArrowRight, Check, Volume2, X } from "lucide-react"
import { useGrammar, grammarById } from "@/lib/grammar"
import { notesFor, srsFor, useProgress } from "@/stores/progress"
import { showsTranslation, useSettings } from "@/stores/settings"
import { play } from "@/lib/audio"
import { masteryLabel } from "@/lib/srs"
import { ttsLocaleFor } from "@/lib/languages"
import type { VoiceLocale } from "@navia/utils"
import { useTranslation } from "@/i18n/locale-context"
import { locArray, locText, translationFor } from "@/lib/content-translation"
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ExamBadge,
  PinyinText,
  Tabs,
  TabPanel,
  Textarea,
} from "@/components/ui"

export default function GrammarDetailPage() {
  const { pointId } = useParams<{ pointId: string }>()
  const point = grammarById(pointId)
  const progress = useProgress()
  const settings = useSettings()
  const [tab, setTab] = useState("simple")
  const [audioLoading, setAudioLoading] = useState(false)
  const mounted = useMounted()
  const { t, locale: uiLocale } = useTranslation()
  const GRAMMAR_POINTS = useGrammar()
  useEffect(() => {
    // Auto-enroll into the review deck: opening a grammar point counts as learning it.
    if (point) progress.ensureCard(point.id, "grammar")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [point?.id])
  if (!mounted) return null

  if (!point) {
    return (
      <EmptyState
        title="Grammar point not found"
        action={
          <Link href="/dashboard/grammar">
            <Button>{t("common.backTo", { page: t("nav.grammar") })}</Button>
          </Link>
        }
      />
    )
  }

  const locale = ttsLocaleFor(settings.language) as VoiceLocale
  const card = srsFor(progress, settings.language)[point.id]
  const dependencies = (point.dependsOn ?? []).map(grammarById).filter(Boolean)
  const dependents = GRAMMAR_POINTS.filter((g) =>
    g.dependsOn?.includes(point.id)
  )

  return (
    <div className="animate-fade-up mx-auto max-w-2xl">
      <Link
        href="/dashboard/grammar"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Grammar
      </Link>

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">
              {locText(point, "title", uiLocale)}
            </h1>
            <p className="hanzi mt-1 text-lg text-accent" lang={locale}>
              {point.pattern}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-1.5">
              <ExamBadge
                hsk={point.hsk}
                examMappings={point.examMappings}
                currentExam={settings.activeExamType}
              />
              <Badge tone="gold">{"◆".repeat(point.difficulty)}</Badge>
            </div>
            <Badge
              tone={
                card ? (card.mastery >= 60 ? "success" : "warn") : "neutral"
              }
            >
              {card ? t(masteryLabel(card.mastery)) : t("grammar.notStudied")}
            </Badge>
          </div>
        </div>
      </Card>

      <Card className="mt-4 p-5">
        <Tabs
          tabs={[
            { id: "simple", label: t("grammar.simpleExplanation") },
            { id: "technical", label: t("grammar.technicalExplanation") },
          ]}
          active={tab}
          onChange={setTab}
          id="grammar-tabs"
        />
        <TabPanel baseId="grammar-tabs" tabId={tab} className="mt-4">
          <p className="text-sm leading-relaxed text-ink-soft">
            {tab === "simple"
              ? locText(point, "simpleExplanation", uiLocale)
              : locText(
                  point,
                  ["technicalExplanation", "detailedExplanation"],
                  uiLocale
                )}
          </p>
        </TabPanel>
      </Card>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-success">
            <Check className="h-4 w-4" /> {t("grammar.whenUsed")}
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            {locText(point, "usage", uiLocale)}
          </p>
        </Card>
        <Card className="p-5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-danger">
            <X className="h-4 w-4" /> {t("grammar.whenNotUsed")}
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            {locText(point, "avoidWhen", uiLocale)}
          </p>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <h2 className="text-sm font-semibold">{t("grammar.examples")}</h2>
        <div className="mt-3 space-y-3">
          {point.examples.map((ex, i) => (
            <div key={i} className="rounded-lg border border-line p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="hanzi text-lg" lang={locale}>
                  {ex.hanzi ?? ex.text ?? ""}
                </p>
                <button
                  onClick={() =>
                    play(
                      ex.audio ?? ex.hanzi ?? ex.text ?? "",
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
                  className="cursor-pointer rounded p-1 text-ink-faint hover:text-accent disabled:opacity-50"
                  aria-label="Play example"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              </div>
              <PinyinText
                pinyin={ex.pinyin ?? ex.romanization ?? ""}
                zhuyin={ex.zhuyin}
                className="text-xs"
              />
              {showsTranslation(settings.displayMode.mode) && (
                <p className="mt-0.5 text-xs text-ink-faint">
                  {translationFor(ex, uiLocale)}
                </p>
              )}
            </div>
          ))}
        </div>
      </Card>

      {point.negativeExamples.length > 0 && (
        <Card className="mt-4 p-5">
          <h2 className="text-sm font-semibold text-danger">
            {t("grammar.negativeExamples")}
          </h2>
          <div className="mt-3 space-y-2">
            {point.negativeExamples.map((ex, i) => (
              <div
                key={i}
                className="rounded-lg border border-danger/30 bg-sunken/60 p-3"
              >
                <p
                  className="hanzi text-base line-through decoration-danger/60"
                  lang={locale}
                >
                  {ex.hanzi}
                </p>
                <p className="mt-1 text-xs text-ink-soft">
                  {locText(ex, "note", uiLocale)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {point.commonMistakes.length > 0 && (
        <Card className="mt-4 p-5">
          <h2 className="text-sm font-semibold">
            {t("grammar.commonMistakes")}
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-ink-soft">
            {locArray(point, "commonMistakes", uiLocale).map((m, i) => (
              <li key={i}>· {m}</li>
            ))}
          </ul>
        </Card>
      )}

      {(dependencies.length > 0 || dependents.length > 0) && (
        <Card className="mt-4 p-5">
          <h2 className="text-sm font-semibold">
            {t("grammar.dependencyMap")}
          </h2>
          {dependencies.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-ink-faint">
                {t("grammar.prereqHint")}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {dependencies.map((d) => (
                  <Link
                    key={d!.id}
                    href={`/dashboard/grammar/${d!.id}`}
                    className="flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-sm hover:border-accent"
                  >
                    <ArrowLeft className="h-3 w-3 text-ink-faint" /> {d!.title}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {dependents.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-ink-faint">
                {t("grammar.unlocksAfter")}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {dependents.map((d) => (
                  <Link
                    key={d.id}
                    href={`/dashboard/grammar/${d.id}`}
                    className="flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-sm hover:border-accent"
                  >
                    {d.title} <ArrowRight className="h-3 w-3 text-ink-faint" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      <Card className="mt-4 p-5">
        <Textarea
          label={t("vocab.personalNotes")}
          defaultValue={notesFor(progress, settings.language)[point.id] ?? ""}
          onBlur={(e) => progress.setNote(point.id, e.target.value)}
          placeholder={t("vocab.notesPlaceholder")}
        />
      </Card>
    </div>
  )
}
