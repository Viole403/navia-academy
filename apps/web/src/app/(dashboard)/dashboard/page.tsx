"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useClientSnapshot, useMounted } from "@/lib/use-mounted"
import {
  ArrowRight,
  Award,
  BookOpen,
  Brain,
  ClipboardList,
  Eye,
  EyeOff,
  Flame,
  Play,
  Target,
  Type,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { lessonsFor, srsFor, useProgress } from "@/stores/progress"
import { useSettings } from "@/stores/settings"
import {
  dueCards,
  inExamFor,
  lastDays,
  learnedCount,
  nextLesson,
  todayLog,
  xpForNextLevel,
} from "@/lib/derived"
import { useCurriculum, unitById } from "@/lib/curriculum"
import { useAchievements } from "@/lib/achievements"
import { useVocabulary } from "@/lib/vocabulary"
import { useCharacters } from "@/lib/characters"
import { useGrammar } from "@/lib/grammar"
import { EXAM_DISPLAY_NAMES, useExamConfig } from "@/lib/exam-definitions"
import { ttsLocaleFor } from "@/lib/languages"
import { GENERAL_LEVEL_LABELS, SKILL_LABELS, type Skill } from "@/types"
import { Badge, Button, Card, EmptyState, ProgressBar } from "@/components/ui"
import { cn, formatMinutes } from "@/lib/utils"
import { useTranslation } from "@/i18n/locale-context"

const WIDGETS = ["weekly", "skills", "tasks", "achievements"] as const

const CHIP_TONES = [
  "bauhaus-chip-red",
  "bauhaus-chip-blue",
  "bauhaus-chip-yellow",
  "bauhaus-chip-ink",
] as const

export default function DashboardPage() {
  const { t, locale } = useTranslation()
  const { user } = useAuth()
  const progress = useProgress()
  const settings = useSettings()
  const [customize, setCustomize] = useState(false)
  const mounted = useMounted()
  const hour = useClientSnapshot(() => new Date().getHours(), 12)
  const ACHIEVEMENTS = useAchievements()
  const { units: curriculumUnits, lessons: curriculumLessons } = useCurriculum()
  const VOCABULARY = useVocabulary()
  const CHARACTERS = useCharacters()
  const GRAMMAR_POINTS = useGrammar()
  useExamConfig()

  useEffect(() => {
    const timer = setTimeout(() => progress.unlockAchievements(), 0)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const lang = settings.language
  const langLessons = lessonsFor(progress, lang)
  const langSrs = srsFor(progress, lang)

  const lesson = useMemo(
    () =>
      nextLesson(langLessons, undefined, curriculumUnits, curriculumLessons),
    [langLessons, curriculumUnits, curriculumLessons]
  )
  const due = useMemo(() => {
    const isInExam = inExamFor(
      settings.activeExamType,
      VOCABULARY,
      CHARACTERS,
      GRAMMAR_POINTS
    )
    return dueCards(langSrs).filter(isInExam)
  }, [langSrs, settings.activeExamType, VOCABULARY, CHARACTERS, GRAMMAR_POINTS])
  const today = todayLog(progress.sessions)
  const week = useMemo(
    () => lastDays(progress.sessions, 7),
    [progress.sessions]
  )
  const level = progress.levelFromXp()
  const nextLevelXp = xpForNextLevel(level)
  const wordsLearned = learnedCount(langSrs, "word")
  const charsLearned = learnedCount(langSrs, "character")
  const pendingTasks = progress.tasks.filter((task) => task.status !== "done")
  const recentAchievements = Object.entries(progress.achievements)
    .sort((a, b) => b[1].localeCompare(a[1]))
    .slice(0, 4)
    .map(([id]) => ACHIEVEMENTS.find((a) => a.id === id))
    .filter(Boolean)

  if (!mounted) return null

  const timeKey =
    hour < 6
      ? "night"
      : hour < 13
        ? "morning"
        : hour < 21
          ? "afternoon"
          : "night"
  const firstName = user?.displayName?.split(" ")[0] ?? t("dashboard.student")
  const goalPct = Math.min(
    100,
    ((today?.minutes ?? 0) / settings.dailyGoalMin) * 100
  )
  const examLabel =
    EXAM_DISPLAY_NAMES[settings.activeExamType] ?? settings.activeExamType
  const cheerText =
    (
      {
        zh: "加油！",
        ja: "頑張って！",
        en: "Keep going!",
        de: "Weiter so!",
      } as Record<string, string>
    )[settings.language] ?? "加油！"

  const skillMinutes: [Skill, number][] = Object.entries(
    Object.values(progress.sessions).reduce<Partial<Record<Skill, number>>>(
      (acc, log) => {
        for (const [skill, min] of Object.entries(log.skills)) {
          acc[skill as Skill] = (acc[skill as Skill] ?? 0) + (min ?? 0)
        }
        return acc
      },
      {}
    )
  ).sort((a, b) => b[1] - a[1]) as [Skill, number][]

  const hidden = (id: string) => settings.hiddenWidgets.includes(id)

  const chips = [
    { label: examLabel, tone: CHIP_TONES[0] },
    ...(progress.placement
      ? [
          {
            label: GENERAL_LEVEL_LABELS[progress.placement.generalLevel],
            tone: CHIP_TONES[1],
          },
        ]
      : []),
    { label: t("dashboard.level", { n: String(level) }), tone: CHIP_TONES[2] },
  ]

  const stats = [
    {
      label: t("dashboard.streak"),
      value: t("dashboard.days", { n: String(progress.streak) }),
      sub: t("dashboard.best", { n: String(progress.bestStreak) }),
      icon: <Flame className="h-4 w-4" />,
      bar: "bg-bauhaus-red",
    },
    {
      label: t("dashboard.today"),
      value: formatMinutes(today?.minutes ?? 0),
      sub: t("dashboard.goal", { time: formatMinutes(settings.dailyGoalMin) }),
      icon: <Target className="h-4 w-4" />,
      bar: "bg-bauhaus-blue",
    },
    {
      label: t("dashboard.words"),
      value: wordsLearned,
      sub: t("dashboard.learned"),
      icon: <BookOpen className="h-4 w-4" />,
      bar: "bg-bauhaus-yellow",
    },
    {
      label: t("dashboard.characters"),
      value: charsLearned,
      sub: t("dashboard.learned"),
      icon: <Type className="h-4 w-4" />,
      bar: "bg-bauhaus-black",
    },
  ]

  return (
    <div className="animate-fade-up space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.22em] text-ink-faint uppercase">
            {t("dashboard.greeting", {
              time: t(`dashboard.greeting.${timeKey}`),
            })}
            , <span className="font-medium text-ink-soft">{firstName}</span>{" "}
            <span className="hanzi ml-1" lang={ttsLocaleFor(settings.language)}>
              {cheerText}
            </span>
          </p>
          <h1 className="text-display-lg mt-2 font-display">
            {t("features.dashboard.title")}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {chips.map((c) => (
              <span key={c.label} className={cn("bauhaus-chip", c.tone)}>
                {c.label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCustomize(!customize)}
          >
            {customize ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
            {customize ? t("dashboard.done") : t("dashboard.customize")}
          </Button>
          {lesson && (
            <Link href={`/dashboard/lesson/${lesson.id}`}>
              <Button>
                <Play className="h-4 w-4" /> {t("dashboard.continueStudying")}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {customize && (
        <Card className="p-4">
          <p className="text-sm font-medium">{t("dashboard.visibleWidgets")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {WIDGETS.map((id) => (
              <button
                key={id}
                onClick={() => settings.toggleWidget(id)}
                className={cn(
                  "cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  hidden(id)
                    ? "border-line text-ink-faint"
                    : "border-accent bg-accent-soft text-accent"
                )}
              >
                {t(`dashboard.widget.${id}`)}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div
              className="mb-3 h-1.5 w-8 rounded-[1px] bg-bauhaus-black"
              aria-hidden
            >
              <span className={cn("block h-full", s.bar)} />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium tracking-[0.18em] text-ink-faint uppercase">
                {s.label}
              </p>
              <span className="text-ink-faint">{s.icon}</span>
            </div>
            <p className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">
              {s.value}
            </p>
            {s.sub && <p className="mt-1 text-xs text-ink-faint">{s.sub}</p>}
          </Card>
        ))}
      </div>

      {/* Daily goal + XP */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{t("dashboard.dailyGoal")}</p>
            <p className="text-xs text-ink-faint">
              {t("dashboard.minutesOfGoal", {
                done: String(today?.minutes ?? 0),
                goal: String(settings.dailyGoalMin),
              })}
            </p>
          </div>
          <ProgressBar
            className="mt-3"
            value={goalPct}
            label={t("dashboard.dailyGoalProgress")}
          />
          <p className="mt-2 text-xs text-ink-faint">
            {goalPct >= 100
              ? t("dashboard.goalMet")
              : t("dashboard.streakMotivation")}
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{t("dashboard.academicXp")}</p>
            <p className="text-xs text-ink-faint">
              {progress.xp} / {nextLevelXp} XP
            </p>
          </div>
          <ProgressBar
            className="mt-3"
            value={progress.xp}
            max={nextLevelXp}
            label={t("dashboard.xpProgress")}
          />
          <p className="mt-2 text-xs text-ink-faint">
            {t("dashboard.levelRange", {
              from: String(level),
              to: String(level + 1),
            })}
          </p>
        </Card>
      </div>

      {/* Continue + reviews */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <p className="text-xs font-medium tracking-wide text-ink-faint uppercase">
            {t("dashboard.nextLesson")}
          </p>
          {lesson ? (
            <>
              <h2 className="mt-2 font-display text-lg font-semibold">
                {lesson.title}
              </h2>
              <p className="text-sm text-ink-faint">
                {unitById(lesson.unitId)?.title} · {lesson.durationMin} min · +
                {lesson.xp} XP
              </p>
              <Link
                href={`/dashboard/lesson/${lesson.id}`}
                className="mt-4 inline-block"
              >
                <Button size="sm">
                  {langLessons[lesson.id]
                    ? t("dashboard.continueLesson")
                    : t("dashboard.startLesson")}{" "}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-soft">
              {t("dashboard.allDone")}
            </p>
          )}
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium tracking-wide text-ink-faint uppercase">
            {t("dashboard.reviews")}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold">
              {due.length}
            </span>
            <span className="text-sm text-ink-faint">
              {t("dashboard.itemsToReview")}
            </span>
          </div>
          <Link href="/dashboard/review" className="mt-4 inline-block">
            <Button size="sm" variant={due.length > 0 ? "primary" : "outline"}>
              <Brain className="h-4 w-4" />{" "}
              {due.length > 0
                ? t("dashboard.reviewNow")
                : t("dashboard.goToReviews")}
            </Button>
          </Link>
        </Card>
      </div>

      {/* Weekly activity */}
      {!hidden("weekly") && (
        <Card className="p-5">
          <p className="text-sm font-medium">{t("dashboard.last7Days")}</p>
          <div
            className="mt-4 flex h-28 items-end gap-2"
            role="img"
            aria-label={t("dashboard.chartAria")}
          >
            {week.map((d, i) => {
              const max = Math.max(
                ...week.map((x) => x.minutes),
                settings.dailyGoalMin
              )
              const h = d.minutes > 0 ? Math.max(8, (d.minutes / max) * 100) : 4
              const dayName = new Date(d.date + "T12:00:00").toLocaleDateString(
                locale,
                { weekday: "short" }
              )
              return (
                <div
                  key={d.date}
                  className="flex flex-1 flex-col items-center gap-1.5"
                >
                  <span className="text-xs text-ink-faint">
                    {d.minutes > 0 ? `${d.minutes}m` : ""}
                  </span>
                  <div
                    className={cn(
                      "w-full max-w-10",
                      d.minutes > 0
                        ? i % 3 === 0
                          ? "bg-bauhaus-blue"
                          : i % 3 === 1
                            ? "bg-bauhaus-red"
                            : "bg-bauhaus-yellow"
                        : "bg-sunken"
                    )}
                    style={{ height: `${h}%` }}
                  />
                  <span className="text-xs text-ink-faint uppercase">
                    {dayName}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Skill distribution */}
        {!hidden("skills") && (
          <Card className="p-5">
            <p className="text-sm font-medium">{t("dashboard.timeBySkill")}</p>
            {skillMinutes.length === 0 ? (
              <p className="mt-3 text-sm text-ink-faint">
                {t("dashboard.skillsEmpty")}
              </p>
            ) : (
              <div className="mt-3 space-y-2.5">
                {skillMinutes.slice(0, 6).map(([skill, min]) => (
                  <div key={skill}>
                    <div className="flex justify-between text-xs">
                      <span className="text-ink-soft">
                        {SKILL_LABELS[skill]}
                      </span>
                      <span className="text-ink-faint">
                        {formatMinutes(min)}
                      </span>
                    </div>
                    <ProgressBar
                      className="mt-1"
                      value={min}
                      max={skillMinutes[0][1]}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Tasks */}
        {!hidden("tasks") && (
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {t("dashboard.pendingTasks")}
              </p>
              <Link
                href="/dashboard/tasks"
                className="text-xs font-medium text-accent hover:underline"
              >
                {t("dashboard.viewAll")}
              </Link>
            </div>
            {pendingTasks.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="h-8 w-8" />}
                title={t("dashboard.noPendingTasks")}
                description={t("dashboard.tasksEmptyDesc")}
              />
            ) : (
              <ul className="mt-3 space-y-2">
                {pendingTasks.slice(0, 4).map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center justify-between rounded-lg border border-line px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {task.title}
                      </p>
                      <p className="text-xs text-ink-faint">
                        {new Date(
                          task.dueDate + "T12:00:00"
                        ).toLocaleDateString(locale, {
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        · {task.estimatedMin} min
                      </p>
                    </div>
                    <Badge
                      tone={
                        task.priority === "high"
                          ? "danger"
                          : task.priority === "medium"
                            ? "warn"
                            : "neutral"
                      }
                    >
                      {task.priority === "high"
                        ? t("dashboard.priorityHigh")
                        : task.priority === "medium"
                          ? t("dashboard.priorityMedium")
                          : t("dashboard.priorityLow")}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>

      {/* Achievements */}
      {!hidden("achievements") && recentAchievements.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {t("dashboard.recentAchievements")}
            </p>
            <Link
              href="/dashboard/achievements"
              className="text-xs font-medium text-accent hover:underline"
            >
              {t("dashboard.viewAll")}
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            {recentAchievements.map((a) => (
              <div
                key={a!.id}
                className="flex items-center gap-2.5 rounded-lg border border-line px-3 py-2"
              >
                <Award className="h-5 w-5 shrink-0 text-gold" aria-hidden />
                <div>
                  <p className="text-sm font-medium">{a!.title}</p>
                  <p className="text-xs text-ink-faint">+{a!.xp} XP</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recommendation */}
      <Card className="flex items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <span className="bauhaus-chip bauhaus-chip-yellow" aria-hidden>
            <Award className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium">
              {t("dashboard.recommendation")}
            </p>
            <p className="text-sm text-ink-soft">
              {due.length > 5
                ? t("dashboard.recReviews", { count: String(due.length) })
                : progress.placement?.weaknesses?.[0]
                  ? t("dashboard.recWeakPoint", {
                      skill: SKILL_LABELS[progress.placement.weaknesses[0]],
                    })
                  : t("dashboard.recSpeaking")}
            </p>
          </div>
        </div>
        <Link
          href={due.length > 5 ? "/dashboard/review" : "/dashboard/speaking"}
        >
          <Button size="sm" variant="outline">
            {t("dashboard.goNow")} <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </Card>
    </div>
  )
}
