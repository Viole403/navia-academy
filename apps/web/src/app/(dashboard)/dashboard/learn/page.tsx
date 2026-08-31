"use client"

import Link from "next/link"
import { useMemo } from "react"
import { ArrowRight, Play } from "lucide-react"
import { useCurriculum, unitById } from "@/lib/curriculum"
import { lessonsFor, useProgress } from "@/stores/progress"
import { useSettings } from "@/stores/settings"
import { nextLesson } from "@/lib/derived"
import { Button, Card, ProgressBar, SectionHeader } from "@/components/ui"
import { useTranslation } from "@/i18n/locale-context"
import { locText } from "@/lib/content-translation"

export default function LearnPage() {
  const { t, locale } = useTranslation()
  const progress = useProgress()
  const settings = useSettings()
  const { levels: LEVELS, units: UNITS, lessons: LESSONS } = useCurriculum()

  const activeLevelIds = useMemo(
    () =>
      LEVELS.filter((l) => l.examType === settings.activeExamType).flatMap(
        (l) => l.unitIds
      ),
    [settings.activeExamType, LEVELS]
  )
  const activeUnits = useMemo(
    () => UNITS.filter((u) => activeLevelIds.includes(u.id)),
    [activeLevelIds, UNITS]
  )
  const activeLessonIds = useMemo(
    () => new Set(activeUnits.flatMap((u) => u.lessonIds)),
    [activeUnits]
  )
  const activeLessons = useMemo(
    () => LESSONS.filter((l) => activeLessonIds.has(l.id)),
    [activeLessonIds, LESSONS]
  )

  const lesson = useMemo(
    () =>
      nextLesson(
        lessonsFor(progress, settings.language),
        activeLessons,
        UNITS,
        LESSONS
      ),
    [progress, activeLessons, UNITS, LESSONS, settings.language]
  )

  // Fallback for languages without curriculum yet (show immediately, don't wait for mount)
  if (LESSONS.length === 0) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title={t("learn.title")}
          subtitle={t("learn.subtitle")}
        />
        <Card className="p-8 text-center">
          <p className="text-ink-soft">{t("learn.noCurriculum")}</p>
          <p className="mt-2 text-sm text-ink-faint">
            Curriculum for this language is coming soon. Try vocabulary or exam
            practice instead.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link href="/dashboard/vocabulary">
              <button className="rounded-lg bg-accent px-4 py-2 text-white transition-colors hover:bg-accent/90">
                Browse Vocabulary
              </button>
            </Link>
            <Link href="/dashboard/exam">
              <button className="rounded-lg border border-line px-4 py-2 transition-colors hover:bg-hover">
                Practice Exams
              </button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const langLessons = lessonsFor(progress, settings.language)
  const completedCount = Object.values(langLessons).filter(
    (l) => l.completed
  ).length
  const inProgress = Object.values(langLessons)
    .filter((l) => !l.completed)
    .map((l) => activeLessons.find((x) => x.id === l.lessonId))
    .filter(Boolean)
    .slice(0, 3)

  return (
    <div className="animate-fade-up">
      <SectionHeader
        title={t("nav.learn")}
        subtitle={t("learn.completedCount", {
          done: String(completedCount),
          total: String(activeLessons.length),
        })}
      />

      {lesson ? (
        <Card className="p-6">
          <p className="text-xs font-medium tracking-wide text-ink-faint uppercase">
            {t("learn.nextClass")}
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold">
            {lesson.title}
          </h2>
          <p className="mt-1 text-ink-soft">
            {locText(lesson, "subtitle", locale)}
          </p>
          <p className="mt-1 text-sm text-ink-faint">
            {unitById(lesson.unitId)?.title} · {lesson.durationMin} min · +
            {lesson.xp} XP
          </p>
          <Link
            href={`/dashboard/lesson/${lesson.id}`}
            className="mt-5 inline-block"
          >
            <Button size="lg">
              <Play className="h-4 w-4" />{" "}
              {langLessons[lesson.id]
                ? t("learn.continueLesson")
                : t("learn.startLesson")}
            </Button>
          </Link>
        </Card>
      ) : (
        <Card className="p-6 text-center">
          <p className="font-display text-lg font-semibold">
            {t("learn.allDone")}
          </p>
          <p className="mt-1 text-sm text-ink-soft">{t("learn.allDoneDesc")}</p>
        </Card>
      )}

      {inProgress.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-ink-soft">
            {t("learn.inProgress")}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {inProgress.map((l) => (
              <Link key={l!.id} href={`/dashboard/lesson/${l!.id}`}>
                <Card className="p-4 transition-colors hover:border-accent">
                  <p className="font-medium">{l!.title}</p>
                  <p className="text-xs text-ink-faint">
                    {unitById(l!.unitId)?.title}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <ProgressBar
                      value={(langLessons[l!.id]?.step ?? 0) + 1}
                      max={l!.steps.length}
                      className="flex-1"
                    />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-soft">
            {t("learn.currentUnits")}
          </h3>
          <Link
            href="/dashboard/program"
            className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            {t("learn.fullProgram")} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activeUnits
            .sort((a, b) => a.order - b.order)
            .map((unit) => {
              const ul = activeLessons.filter((l) => l.unitId === unit.id)
              const done = ul.filter((l) => langLessons[l.id]?.completed).length
              return (
                <Link key={unit.id} href={`/dashboard/unit/${unit.id}`}>
                  <Card className="p-4 transition-colors hover:border-accent">
                    <p className="text-xs text-ink-faint">
                      {t("learn.unit", { n: String(unit.order) })}
                    </p>
                    <p className="mt-0.5 font-medium">{unit.title}</p>
                    <p className="text-xs text-ink-faint">
                      {locText(unit, "subtitle", locale)}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <ProgressBar
                        value={done}
                        max={ul.length}
                        className="flex-1"
                      />
                      <span className="text-xs text-ink-faint">
                        {done}/{ul.length}
                      </span>
                    </div>
                  </Card>
                </Link>
              )
            })}
        </div>
      </div>
    </div>
  )
}
