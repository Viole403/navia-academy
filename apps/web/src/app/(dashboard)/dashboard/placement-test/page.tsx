"use client"

import { useMounted } from "@/lib/use-mounted"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowRight,
  CheckCircle2,
  Ear,
  GraduationCap,
  Volume2,
  XCircle,
} from "lucide-react"
import { usePlacement, type PlacementQuestion } from "@/lib/placement"
import { useProgress } from "@/stores/progress"
import { useSettings } from "@/stores/settings"
import { play } from "@/lib/audio"
import { ttsLocaleFor } from "@/lib/languages"
import type { VoiceLocale } from "@navia/utils"
import { cn, shuffle } from "@/lib/utils"
import { Badge, Button, Card, ProgressBar } from "@/components/ui"
import {
  GENERAL_LEVEL_LABELS,
  HSK_TO_GENERAL,
  SKILL_LABELS,
  type HskLevel,
  type PlacementResult,
  type Skill,
  type StudyTask,
} from "@/types"
import { useTranslation } from "@/i18n/locale-context"
import type { TranslationKey } from "@/i18n/keys"
import { locText } from "@/lib/content-translation"

const MAX_QUESTIONS = 12

const BAND_TO_HSK: Record<number, HskLevel> = {
  1: 1,
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
}

function startBand(experience?: string): number {
  switch (experience) {
    case "beginner":
      return 2
    case "intermediate":
      return 4
    case "advanced":
      return 5
    default:
      return 1
  }
}

interface Answer {
  q: PlacementQuestion
  correct: boolean
}

function buildResult(answers: Answer[], skipped: boolean): PlacementResult {
  const answered = answers.length
  const correct = answers.filter((a) => a.correct).length

  // Estimated band: weighted toward the highest bands answered correctly.
  const correctBands = answers.filter((a) => a.correct).map((a) => a.q.band)
  const estBand =
    correctBands.length > 0
      ? Math.round(
          correctBands.reduce((a, b) => a + b, 0) / correctBands.length
        )
      : 1
  const estimatedHsk = BAND_TO_HSK[Math.max(1, Math.min(6, estBand))] ?? 1

  const bySkill = new Map<Skill, { c: number; t: number }>()
  for (const a of answers) {
    const s = bySkill.get(a.q.skill) ?? { c: 0, t: 0 }
    s.t += 1
    if (a.correct) s.c += 1
    bySkill.set(a.q.skill, s)
  }
  const strengths: Skill[] = []
  const weaknesses: Skill[] = []
  for (const [skill, { c, t }] of bySkill) {
    if (t >= 2 && c / t >= 0.75) strengths.push(skill)
    if (t >= 2 && c / t <= 0.4) weaknesses.push(skill)
  }
  const evaluated = new Set(answers.map((a) => a.q.skill))
  const notEvaluated = (
    [
      "speaking",
      "writing",
      "characters",
      "pronunciation",
      "listening",
      "reading",
      "vocabulary",
      "grammar",
    ] as Skill[]
  ).filter((s) => !evaluated.has(s))

  const confidence: PlacementResult["confidence"] =
    skipped || answered < 6 ? "low" : answered < 10 ? "medium" : "high"

  return {
    estimatedHsk,
    generalLevel: HSK_TO_GENERAL[estimatedHsk],
    confidence,
    strengths,
    weaknesses,
    notEvaluated,
    recommendedUnitId:
      estimatedHsk === 1
        ? correct <= 3
          ? "u-pinyin"
          : "u-greetings"
        : "u-routines",
    suggestedHoursPerWeek: Math.max(
      2,
      Math.min(14, Math.round((answered > 0 ? 4 : 3) + estimatedHsk))
    ),
    answeredCount: answered,
    correctCount: correct,
    takenAt: new Date().toISOString(),
  }
}

function planTasks(
  result: PlacementResult,
  minutesPerDay: number,
  t: (key: TranslationKey, params?: Record<string, string>) => string
): StudyTask[] {
  const mk = (
    dayOffset: number,
    base: Omit<StudyTask, "id" | "dueDate" | "status" | "createdAt">
  ): StudyTask => {
    const d = new Date()
    d.setDate(d.getDate() + dayOffset)
    return {
      ...base,
      id: `task-${Date.now()}-${dayOffset}-${Math.random().toString(36).slice(2, 7)}`,
      dueDate: d.toISOString().slice(0, 10),
      status: "pending",
      createdAt: new Date().toISOString(),
    }
  }
  return [
    mk(0, {
      title: t("placement.task1Title"),
      description: t("placement.task1Desc"),
      skill: "vocabulary",
      type: "lesson",
      estimatedMin: 20,
      priority: "high",
      linkedRoute: "/dashboard/learn",
    }),
    mk(1, {
      title: t("placement.task2Title"),
      description: t("placement.task2Desc"),
      skill: "vocabulary",
      type: "review",
      estimatedMin: 10,
      priority: "medium",
      linkedRoute: "/dashboard/review",
    }),
    mk(2, {
      title: t("placement.task3Title"),
      description: t("placement.task3Desc"),
      skill: "pronunciation",
      type: "listening",
      estimatedMin: Math.min(15, minutesPerDay),
      priority: "medium",
      linkedRoute: "/dashboard/speaking",
    }),
    mk(4, {
      title: t("placement.task4Title"),
      description: t("placement.task4Desc"),
      skill: "characters",
      type: "writing",
      estimatedMin: 15,
      priority: "medium",
      linkedRoute: "/dashboard/characters",
    }),
    mk(6, {
      title: t("placement.task5Title"),
      description: t("placement.task5Desc"),
      skill: "grammar",
      type: "exam",
      estimatedMin: 10,
      priority: "low",
      linkedRoute: "/dashboard/exam",
    }),
  ]
}

export default function PlacementTestPage() {
  const router = useRouter()
  const progress = useProgress()
  const completed = useProgress((s) => s.onboarding.completed)
  const hydrated = useProgress((s) => s.hydrated)
  const audioRate = useSettings((s) => s.audioRate)
  const voiceGender = useSettings((s) => s.voiceGender)
  const language = useSettings((s) => s.language)
  const { t, locale } = useTranslation()

  // Once onboarding is done the placement test can't be retaken (even via manual URL).
  useEffect(() => {
    if (hydrated && completed) router.replace("/dashboard")
  }, [hydrated, completed, router])

  const [answers, setAnswers] = useState<Answer[]>([])
  const [band, setBand] = useState(() =>
    startBand(progress.onboarding.experience)
  )
  const [current, setCurrent] = useState<PlacementQuestion | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)
  const [result, setResult] = useState<PlacementResult | null>(null)
  const [audioLoading, setAudioLoading] = useState(false)
  const usedIds = useRef(new Set<string>())
  const mounted = useMounted()
  const PLACEMENT_BANK = usePlacement()

  const options = useMemo(
    () => (current ? shuffle(current.options ?? []) : []),
    [current]
  )

  // Pick next question from the closest available band.
  useEffect(() => {
    if (finished || current) return
    if (answers.length >= MAX_QUESTIONS) {
      finish(false)
      return
    }
    for (let dist = 0; dist <= 5; dist++) {
      for (const b of [band - dist, band + dist]) {
        if (b < 1 || b > 6) continue
        const candidates = PLACEMENT_BANK.filter(
          (q) => q.band === b && !usedIds.current.has(q.id)
        )
        if (candidates.length > 0) {
          const q = shuffle(candidates)[0]
          usedIds.current.add(q.id)
          setCurrent(q)
          return
        }
      }
    }
    finish(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, answers.length, band, finished, PLACEMENT_BANK.length])

  function finish(skipped: boolean) {
    const r = buildResult(answers, skipped)
    setResult(r)
    setFinished(true)
  }

  function answer(optionId: string) {
    if (!current || picked) return
    setPicked(optionId)
    const correct = optionId === current.correct
    setAnswers((a) => [...a, { q: current, correct }])
    setBand((b) => Math.max(1, Math.min(6, b + (correct ? 1 : -1))))
    setTimeout(() => {
      setPicked(null)
      setCurrent(null)
    }, 900)
  }

  function acceptResult() {
    if (!result) return
    progress.setPlacement(result)
    progress.setOnboarding({ completed: true })
    if (progress.tasks.length === 0) {
      for (const task of planTasks(
        result,
        progress.onboarding.minutesPerDay ?? 30,
        t
      )) {
        progress.addTask(task)
      }
    }
    router.push("/dashboard")
  }

  if (!mounted) return null

  if (PLACEMENT_BANK.length === 0) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10 text-center">
        <h1 className="font-display text-2xl font-bold">
          {t("placement.title")}
        </h1>
        <p className="mt-2 text-sm text-ink-faint">
          {t("placement.unavailable")}
        </p>
        <Button className="mt-6" onClick={() => router.push("/dashboard")}>
          {t("placement.skipForNow")}
        </Button>
      </main>
    )
  }

  /* -------------------------------- Results -------------------------------- */
  if (finished && result) {
    return (
      <main className="animate-fade-up mx-auto max-w-xl px-4 py-10">
        <div className="text-center">
          <GraduationCap
            className="mx-auto h-14 w-14 text-accent"
            aria-hidden
          />
          <h1 className="mt-4 font-display text-2xl font-bold">
            {t("placement.yourResult")}
          </h1>
          <p className="mt-1 text-sm text-ink-faint">
            {t("placement.summary", {
              answered: String(result.answeredCount),
              correct: String(result.correctCount),
            })}
          </p>
        </div>

        <Card className="mt-6 p-6 text-center">
          <p className="text-xs font-medium tracking-wide text-ink-faint uppercase">
            {t("placement.estimatedLevel")}
          </p>
          <p className="mt-2 font-display text-4xl font-bold text-accent">
            Level {result.estimatedHsk === 7 ? "7-9" : result.estimatedHsk}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {GENERAL_LEVEL_LABELS[result.generalLevel]}
          </p>
          <div className="mt-3 flex justify-center">
            <Badge
              tone={
                result.confidence === "high"
                  ? "success"
                  : result.confidence === "medium"
                    ? "warn"
                    : "neutral"
              }
            >
              {t(
                result.confidence === "high"
                  ? "placement.confidenceHigh"
                  : result.confidence === "medium"
                    ? "placement.confidenceMedium"
                    : "placement.confidenceLow"
              )}
            </Badge>
          </div>
          {result.confidence !== "high" && (
            <p className="mt-3 text-xs text-ink-faint">
              {t("placement.indicative")}
            </p>
          )}
        </Card>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Card className="p-5">
            <p className="flex items-center gap-1.5 text-sm font-medium text-success">
              <CheckCircle2 className="h-4 w-4" /> {t("placement.strengths")}
            </p>
            {result.strengths.length > 0 ? (
              <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                {result.strengths.map((s) => (
                  <li key={s}>· {SKILL_LABELS[s]}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-faint">
                {t("placement.notEnoughData")}
              </p>
            )}
          </Card>
          <Card className="p-5">
            <p className="flex items-center gap-1.5 text-sm font-medium text-danger">
              <XCircle className="h-4 w-4" /> {t("placement.toImprove")}
            </p>
            {result.weaknesses.length > 0 ? (
              <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                {result.weaknesses.map((s) => (
                  <li key={s}>· {SKILL_LABELS[s]}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-faint">
                {t("placement.noWeakPoints")}
              </p>
            )}
          </Card>
        </div>

        {result.notEvaluated.length > 0 && (
          <p className="mt-4 rounded-lg bg-sunken px-4 py-3 text-xs text-ink-faint">
            {t("placement.notEvaluated", {
              list: result.notEvaluated.map((s) => SKILL_LABELS[s]).join(", "),
            })}{" "}
            {t("placement.measuredDuringStudy")}
          </p>
        )}

        <Card className="mt-4 p-5">
          <p className="text-sm font-medium">{t("placement.yourPlan")}</p>
          <ul className="mt-2 space-y-1 text-sm text-ink-soft">
            <li>
              ·{" "}
              {t("placement.startingUnit", {
                unit:
                  result.recommendedUnitId === "u-pinyin"
                    ? t("placement.unitPinyin")
                    : result.recommendedUnitId === "u-greetings"
                      ? t("placement.unitGreetings")
                      : t("placement.unitDailyLife"),
              })}
            </li>
            <li>
              ·{" "}
              {t("placement.suggestedDedication", {
                n: String(result.suggestedHoursPerWeek),
              })}
            </li>
            <li>· {t("placement.autoTasks")}</li>
          </ul>
        </Card>

        <Button className="mt-6 w-full" size="lg" onClick={acceptResult}>
          {t("placement.createPlan")} <ArrowRight className="h-4 w-4" />
        </Button>
      </main>
    )
  }

  /* -------------------------------- Question ------------------------------- */
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-4 py-10">
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs text-ink-faint">
          <span>
            {t("placement.question", {
              n: String(Math.min(answers.length + 1, MAX_QUESTIONS)),
              total: String(MAX_QUESTIONS),
            })}
          </span>
          <button
            onClick={() => finish(true)}
            className="cursor-pointer font-medium text-accent hover:underline"
          >
            {t("placement.finishNow")}
          </button>
        </div>
        <ProgressBar
          className="mt-2"
          value={answers.length}
          max={MAX_QUESTIONS}
          label={t("placement.testProgress")}
        />
      </div>

      {current && (
        <div className="animate-brush-in" key={current.id}>
          <p className="text-xs font-medium tracking-wide text-ink-faint uppercase">
            {SKILL_LABELS[current.skill]}
          </p>
          <h1 className="mt-2 font-display text-xl font-semibold">
            {locText(current, "prompt", locale)}
          </h1>

          {current.audioText && (
            <button
              onClick={() =>
                play(
                  current.audioText!,
                  {
                    rate: audioRate,
                    onLoadingChange: setAudioLoading,
                    onError: () => {},
                  },
                  ttsLocaleFor(language) as VoiceLocale,
                  voiceGender
                )
              }
              disabled={audioLoading}
              className="mt-4 flex cursor-pointer items-center gap-2 rounded-[var(--radius)] border border-line bg-raised px-4 py-3 text-sm font-medium hover:bg-hover disabled:opacity-50"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-ink">
                <Volume2 className="h-4 w-4" />
              </span>
              {t("placement.playAudio")}
              <Ear className="h-4 w-4 text-ink-faint" />
            </button>
          )}

          <div className="mt-6 space-y-2.5">
            {options.map((o) => {
              const isPicked = picked === o.id
              const showResult = picked !== null
              const isCorrect = o.id === current.correct
              return (
                <button
                  key={o.id}
                  disabled={showResult}
                  onClick={() => answer(o.id)}
                  className={cn(
                    "w-full cursor-pointer rounded-[var(--radius)] border px-4 py-3 text-left transition-colors disabled:cursor-default",
                    showResult && isCorrect && "border-success bg-accent-soft",
                    showResult && isPicked && !isCorrect && "border-danger",
                    !showResult &&
                      "border-line bg-raised hover:border-line-strong hover:bg-hover"
                  )}
                >
                  <span
                    className="hanzi text-base font-medium"
                    lang={ttsLocaleFor(language)}
                  >
                    {o.label}
                  </span>
                  {o.sublabel && (
                    <span className="mt-0.5 block text-xs text-ink-faint">
                      {o.sublabel}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </main>
  )
}
