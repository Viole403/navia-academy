"use client"

import { useMounted } from "@/lib/use-mounted"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, Bookmark, BookmarkCheck, Volume2 } from "lucide-react"
import { useVocabulary } from "@/lib/vocabulary"
import { useCharacters } from "@/lib/characters"
import type { HanziChar } from "@/types"
import { notesFor, savedFor, srsFor, useProgress } from "@/stores/progress"
import { showsTranslation, useSettings } from "@/stores/settings"
import { play } from "@/lib/audio"
import { masteryLabel } from "@/lib/srs"
import { ttsLocaleFor } from "@/lib/languages"
import type { VoiceLocale } from "@navia/utils"
import { useTranslation } from "@/i18n/locale-context"
import { translationFor } from "@/lib/content-translation"
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ExamBadge,
  PinyinText,
  Textarea,
} from "@/components/ui"

export default function WordDetailPage() {
  const { wordId } = useParams<{ wordId: string }>()
  const vocabulary = useVocabulary()
  const word = vocabulary.find((v) => v.id === wordId)
  const progress = useProgress()
  const settings = useSettings()
  const [audioLoading, setAudioLoading] = useState(false)
  const mounted = useMounted()
  const { t, locale: uiLocale } = useTranslation()
  const CHARACTERS = useCharacters()
  useEffect(() => {
    // Auto-enroll into the review deck: opening a word's detail counts as learning it.
    if (word) progress.ensureCard(word.id, "word")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word?.id])
  if (!mounted) return null

  if (!word) {
    return (
      <EmptyState
        title="Word not found"
        action={
          <Link href="/dashboard/vocabulary">
            <Button>{t("common.backTo", { page: t("nav.vocabulary") })}</Button>
          </Link>
        }
      />
    )
  }

  const locale = ttsLocaleFor(word.language) as VoiceLocale
  const card = srsFor(progress, settings.language)[word.id]
  const saved = savedFor(progress, settings.language).includes(word.id)
  const hanzi = word.hanzi ?? word.text ?? ""
  const activeExam = settings.activeExamType
  const matchedChars = CHARACTERS.filter((c) => hanzi.includes(c.char))
  const activeChars = matchedChars.filter((c) =>
    Boolean(c.examMappings?.[activeExam])
  )
  const seenChars = new Map<string, HanziChar>()
  for (const c of [...activeChars, ...matchedChars]) {
    if (!seenChars.has(c.char)) seenChars.set(c.char, c)
  }
  const chars = [...seenChars.values()]
  const related = (word.related ?? [])
    .map((r) => vocabulary.find((w) => (w.hanzi ?? w.text) === r || w.id === r))
    .filter(Boolean)

  return (
    <div className="animate-fade-up mx-auto max-w-2xl">
      <Link
        href="/dashboard/vocabulary"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Vocabulary
      </Link>

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="hanzi text-6xl" lang={locale}>
              {word.hanzi ?? word.text}
            </p>
            {word.traditional &&
              word.traditional !== (word.hanzi ?? word.text) && (
                <p className="mt-1 text-sm text-ink-faint">
                  {t("vocab.traditional")}{" "}
                  <span className="hanzi text-lg" lang="zh-TW">
                    {word.traditional}
                  </span>
                </p>
              )}
            <PinyinText
              pinyin={word.pinyin ?? word.romanization ?? ""}
              zhuyin={word.zhuyin}
              className="mt-2 block text-xl font-medium"
            />
            {showsTranslation(settings.displayMode.mode) && (
              <p className="mt-1 text-lg text-ink-soft">
                {translationFor(word, uiLocale)}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-1.5">
              <ExamBadge
                hsk={word.hsk}
                examMappings={word.examMappings}
                currentExam={settings.activeExamType}
              />
              <Badge>{word.pos}</Badge>
            </div>
            <Badge
              tone={
                card ? (card.mastery >= 60 ? "success" : "warn") : "neutral"
              }
            >
              {card
                ? `${t(masteryLabel(card.mastery))} · ${card.mastery}%`
                : t("vocab.notStudied")}
            </Badge>
            {word.register && word.register !== "neutral" && (
              <Badge tone="info">
                {word.register === "formal" ? "Formal" : "Informal"}
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              play(
                word.audio ?? word.hanzi ?? word.text ?? "",
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
          >
            <Volume2 className="h-4 w-4" /> {t("audio.listen")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              play(word.audio ?? word.hanzi ?? word.text ?? "", {
                rate: 0.55,
                onLoadingChange: setAudioLoading,
                onError: () => {},
              })
            }
            disabled={audioLoading}
          >
            <Volume2 className="h-4 w-4" /> {t("audio.slow")}
          </Button>
          <Button
            size="sm"
            variant={saved ? "secondary" : "outline"}
            onClick={() => progress.toggleSaved(word.id)}
          >
            {saved ? (
              <BookmarkCheck className="h-4 w-4" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
            {saved ? t("vocab.saved") : t("common.save")}
          </Button>
        </div>
      </Card>

      {word.meanings.length > 1 && (
        <Card className="mt-4 p-5">
          <h2 className="text-sm font-semibold">{t("vocab.meanings")}</h2>
          <ul className="mt-2 space-y-1 text-sm text-ink-soft">
            {showsTranslation(settings.displayMode.mode) &&
              word.meanings.map((m, i) => (
                <li key={i}>
                  {i + 1}. {m}
                </li>
              ))}
          </ul>
        </Card>
      )}

      <Card className="mt-4 p-5">
        <h2 className="text-sm font-semibold">{t("vocab.examples")}</h2>
        <div className="mt-3 space-y-3">
          {word.examples.map((ex, i) => (
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

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-semibold">Details</h2>
          <dl className="mt-2 space-y-1.5 text-sm">
            {word.classifier && (
              <div className="flex justify-between">
                <dt className="text-ink-faint">Classifier</dt>
                <dd className="hanzi" lang={locale}>
                  {word.classifier}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-ink-faint">{t("vocab.frequency")}</dt>
              <dd>
                {"★".repeat(word.frequency)}
                {"☆".repeat(5 - word.frequency)}
              </dd>
            </div>
            {word.synonyms && word.synonyms.length > 0 && (
              <div className="flex justify-between">
                <dt className="text-ink-faint">Synonyms</dt>
                <dd className="hanzi" lang={locale}>
                  {word.synonyms.join("、")}
                </dd>
              </div>
            )}
            {word.antonyms && word.antonyms.length > 0 && (
              <div className="flex justify-between">
                <dt className="text-ink-faint">Antonyms</dt>
                <dd className="hanzi" lang={locale}>
                  {word.antonyms.join("、")}
                </dd>
              </div>
            )}
            {word.tags.length > 0 && (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-faint">{t("vocab.tags")}</dt>
                <dd className="text-right">{word.tags.join(", ")}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold">{t("vocab.wordCharacters")}</h2>
          {chars.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {chars.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/characters/${c.id}`}
                  className="hanzi rounded-lg border border-line px-3 py-2 text-2xl hover:border-accent"
                  lang={locale}
                  title={
                    showsTranslation(settings.displayMode.mode)
                      ? `${c.pinyin} · ${c.meaning}`
                      : c.pinyin
                  }
                >
                  {c.char}
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-ink-faint">
              {t("vocab.theCharacters")}
            </p>
          )}
        </Card>
      </div>

      {related.length > 0 && (
        <Card className="mt-4 p-5">
          <h2 className="text-sm font-semibold">{t("vocab.relatedWords")}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {related.map((r) => (
              <Link
                key={r!.id}
                href={`/dashboard/vocabulary/${r!.id}`}
                className="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-accent"
              >
                <span className="hanzi" lang={locale}>
                  {r!.hanzi}
                </span>{" "}
                {showsTranslation(settings.displayMode.mode) && (
                  <span className="text-ink-faint">
                    · {translationFor(r!, uiLocale)}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Card className="mt-4 p-5">
        <Textarea
          label={t("vocab.personalNotes")}
          defaultValue={notesFor(progress, settings.language)[word.id] ?? ""}
          onBlur={(e) => progress.setNote(word.id, e.target.value)}
          placeholder={t("vocab.notesPlaceholder")}
        />
      </Card>
    </div>
  )
}
