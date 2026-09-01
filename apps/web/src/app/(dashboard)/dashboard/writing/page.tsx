"use client"

import { useMounted } from "@/lib/use-mounted"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, PenLine, RefreshCw } from "lucide-react"
import { useCurriculum } from "@/lib/curriculum"
import { useCharacters } from "@/lib/characters"
import { useProgress } from "@/stores/progress"
import { useSettings } from "@/stores/settings"
import { isCharScript, ttsLocaleFor } from "@/lib/languages"
import { sample } from "@/lib/utils"
import { useTranslation } from "@/i18n/locale-context"
import type { Exercise, HanziChar } from "@/types"
import type { TranslationKey } from "@/i18n/keys"
import { Button, Card, SectionHeader, Tabs, Textarea } from "@/components/ui"
import { ExercisePlayer } from "@/components/dashboard/exercise-player"
import { HanziPractice } from "@/components/dashboard/hanzi-practice"

const PROMPT_KEYS: TranslationKey[] = [
  "writing.prompt1",
  "writing.prompt2",
  "writing.prompt3",
  "writing.prompt4",
  "writing.prompt5",
]

const RUBRIC_KEYS: TranslationKey[] = [
  "writing.rubric1",
  "writing.rubric2",
  "writing.rubric3",
  "writing.rubric4",
  "writing.rubric5",
]

export default function WritingPage() {
  const progress = useProgress()
  const [tab, setTab] = useState("ordenar")
  const [promptIndex, setPromptIndex] = useState(0)
  const [charSetIds, setCharSetIds] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [text, setText] = useState("")
  const mounted = useMounted()
  const { t } = useTranslation()
  const router = useRouter()
  const settings = useSettings()
  const charScript = isCharScript(settings.language)

  useEffect(() => {
    if (mounted && !charScript) router.replace("/dashboard")
  }, [mounted, charScript, router])
  const { lessons: LESSONS } = useCurriculum()
  const CHARACTERS = useCharacters()
  const prompts = PROMPT_KEYS.map((k) => t(k))
  const rubric = RUBRIC_KEYS.map((k) => t(k))

  // Seed the character set once characters load (lazy init can't see async data).
  if (charSetIds.length === 0 && CHARACTERS.length >= 3) {
    setCharSetIds(sample(CHARACTERS, 3).map((c) => c.id))
  }
  const charSet = useMemo(
    () =>
      charSetIds
        .map((id) => CHARACTERS.find((c) => c.id === id))
        .filter((c): c is HanziChar => Boolean(c)),
    [charSetIds, CHARACTERS]
  )
  // All order-words exercises from the curriculum for structured practice.
  const orderExercises = useMemo(() => {
    const out: Exercise[] = []
    for (const l of LESSONS)
      for (const s of l.steps)
        if (s.exercise?.type === "order-words") out.push(s.exercise)
    return out
  }, [LESSONS])
  const [orderIndex, setOrderIndex] = useState(0)
  const [orderDone, setOrderDone] = useState(false)

  if (!mounted) return null

  if (
    orderExercises.length === 0 ||
    (charScript && tab === "copiar" && charSet.length === 0)
  ) {
    return (
      <div className="animate-fade-up">
        <SectionHeader
          title={t("nav.writing")}
          subtitle={t("writing.subtitle")}
        />
        <p className="text-sm text-ink-faint">Loading practice content…</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-up">
      <SectionHeader
        title={t("nav.writing")}
        subtitle={t("writing.subtitle")}
      />

      <Tabs
        tabs={[
          { id: "ordenar", label: t("writing.orderWords") },
          ...(charScript
            ? [{ id: "copiar", label: t("writing.copyChars") }]
            : []),
          { id: "redactar", label: t("writing.freeWriting") },
        ]}
        active={tab}
        onChange={setTab}
        id="writing-tabs"
        className="mb-6"
      />

      {tab === "ordenar" && (
        <div
          className="mx-auto max-w-xl"
          role="tabpanel"
          id="writing-tabs-panel-ordenar"
          aria-labelledby="writing-tabs-tab-ordenar"
          tabIndex={0}
        >
          <Card
            className="p-6"
            key={
              orderExercises[orderIndex % orderExercises.length].id +
              String(orderIndex)
            }
          >
            <ExercisePlayer
              exercise={orderExercises[orderIndex % orderExercises.length]}
              onResult={(ok) => {
                setOrderDone(true)
                progress.logStudy(1, "writing", ok ? 5 : 1)
              }}
            />
          </Card>
          {orderDone && (
            <Button
              className="mt-4 w-full"
              onClick={() => {
                setOrderIndex((i) => i + 1)
                setOrderDone(false)
              }}
            >
              {t("writing.nextPhrase")}
            </Button>
          )}
        </div>
      )}

      {tab === "copiar" && (
        <div
          role="tabpanel"
          id="writing-tabs-panel-copiar"
          aria-labelledby="writing-tabs-tab-copiar"
          tabIndex={0}
        >
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-ink-soft">{t("writing.practiceGrid")}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCharSetIds(sample(CHARACTERS, 3).map((c) => c.id))
              }
            >
              <RefreshCw className="h-4 w-4" /> {t("writing.otherThree")}
            </Button>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            {charSet.map((c) => (
              <div key={c.id} className="text-center">
                <p className="mb-2 text-sm text-ink-soft">
                  <Link
                    href={`/dashboard/characters/${c.id}`}
                    className="hanzi text-lg text-accent hover:underline"
                    lang={ttsLocaleFor(settings.language)}
                  >
                    {c.char}
                  </Link>{" "}
                  {c.pinyin} · {c.meaning}
                </p>
                <HanziPractice
                  char={c.char}
                  size={200}
                  onQuizComplete={(m) => {
                    progress.ensureCard(c.id, "character")
                    progress.reviewCard(c.id, m === 0 ? 3 : m <= 2 ? 2 : 1)
                    progress.logStudy(2, "characters", m === 0 ? 8 : 4)
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "redactar" && (
        <div
          className="mx-auto max-w-xl"
          role="tabpanel"
          id="writing-tabs-panel-redactar"
          aria-labelledby="writing-tabs-tab-redactar"
          tabIndex={0}
        >
          <Card className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium tracking-wide text-ink-faint uppercase">
                  {t("writing.prompt")}
                </p>
                <p className="mt-1 font-medium">
                  {prompts[promptIndex % prompts.length]}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPromptIndex((i) => i + 1)
                  setSubmitted(false)
                  setText("")
                }}
              >
                <RefreshCw className="h-4 w-4" /> {t("writing.another")}
              </Button>
            </div>
            <div className="mt-4">
              <Textarea
                aria-label={t("writing.yourWriting")}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("writing.writeHere")}
                className="hanzi min-h-40 text-lg"
                lang={ttsLocaleFor(settings.language)}
              />
            </div>
            {!submitted ? (
              <Button
                className="mt-4"
                disabled={text.trim().length < 4}
                onClick={() => {
                  setSubmitted(true)
                  progress.setNote(
                    `writing-${Date.now()}`,
                    `${prompts[promptIndex % prompts.length]}\n---\n${text}`
                  )
                  progress.logStudy(5, "writing", 15)
                }}
              >
                <PenLine className="h-4 w-4" /> {t("writing.submitEvaluate")}
              </Button>
            ) : (
              <div className="mt-5 rounded-[var(--radius)] border border-line bg-sunken/50 p-4">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-success">
                  <CheckCircle2 className="h-4 w-4" /> {t("writing.submitted")}
                </p>
                <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
                  {rubric.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id={`rub-${i}`}
                        className="mt-1 h-3.5 w-3.5 accent-[var(--accent)]"
                      />
                      <label htmlFor={`rub-${i}`} className="cursor-pointer">
                        {r}
                      </label>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-ink-faint">
                  {t("writing.rubricGuide")}
                </p>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
