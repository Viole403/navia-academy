"use client"

import Link from "next/link"
import { Lock } from "lucide-react"
import { useCurriculum } from "@/lib/curriculum"
import { lessonsFor, useProgress } from "@/stores/progress"
import { useSettings } from "@/stores/settings"
import { useExamConfig } from "@/lib/exam-definitions"
import { Badge, Card, ProgressBar, SectionHeader } from "@/components/ui"
import { useTranslation } from "@/i18n/locale-context"
import { locText } from "@/lib/content-translation"

export default function ProgramPage() {
  const { t, locale } = useTranslation()
  const language = useSettings((s) => s.language)
  const lessons = useProgress((s) => lessonsFor(s, language))
  const activeExamType = useSettings((s) => s.activeExamType)
  const {
    course: COURSE,
    levels: LEVELS,
    units: UNITS,
    lessons: LESSONS,
  } = useCurriculum()
  const { displayNames: EXAM_DISPLAY_NAMES } = useExamConfig()

  // Fallback for languages without curriculum yet (show immediately, don't wait for mount)
  if (!COURSE || LEVELS.length === 0) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title={t("program.title", {
            name: EXAM_DISPLAY_NAMES[activeExamType] || "Program",
          })}
          subtitle="Structured learning path"
        />
        <Card className="p-8 text-center">
          <p className="text-ink-soft">
            Curriculum for this exam type is coming soon.
          </p>
          <p className="mt-2 text-sm text-ink-faint">
            Try vocabulary practice or exam tests while we prepare the full
            program.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link href="/dashboard/vocabulary">
              <button className="rounded-lg bg-accent px-4 py-2 text-white">
                Browse Vocabulary
              </button>
            </Link>
            <Link href="/dashboard/exam">
              <button className="rounded-lg border border-line px-4 py-2">
                Practice Exams
              </button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const activeLevels = LEVELS.filter((l) => l.examType === activeExamType)

  return (
    <div className="animate-fade-up">
      <SectionHeader
        title={t("program.title", { name: EXAM_DISPLAY_NAMES[activeExamType] })}
        subtitle={locText(COURSE, "description", locale)}
      />
      <div className="space-y-4">
        {activeLevels.map((level, i) => {
          const units = UNITS.filter((u) => u.levelId === level.id)
          const levelLessons = LESSONS.filter((l) =>
            units.some((u) => u.id === l.unitId)
          )
          const done = levelLessons.filter(
            (l) => lessons[l.id]?.completed
          ).length
          const hasContent = units.length > 0
          return (
            <Card key={level.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-4">
                  <span className="bg-surface flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius)] border border-line font-display text-xl text-accent">
                    {i + 1}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-semibold">
                        {level.title}
                      </h2>
                      <Badge tone="accent">
                        {locText(level, "subtitle", locale)}
                      </Badge>
                      {!hasContent && (
                        <Badge>
                          <Lock className="h-3 w-3" />{" "}
                          {t("program.inPreparation")}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 max-w-2xl text-sm text-ink-soft">
                      {locText(level, "description", locale)}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-ink-faint">
                  ≈ {level.estimatedHours} h
                </p>
              </div>

              <details className="group mt-3">
                <summary className="cursor-pointer text-xs font-medium text-accent hover:underline">
                  {t("program.levelObjectives")}
                </summary>
                <ul className="mt-2 grid gap-1 text-sm text-ink-soft sm:grid-cols-2">
                  {(level.objectives ?? []).map((o) => (
                    <li key={o}>· {o}</li>
                  ))}
                </ul>
              </details>

              {hasContent && (
                <>
                  <div className="mt-4 flex items-center gap-3">
                    <ProgressBar
                      value={done}
                      max={levelLessons.length}
                      className="flex-1"
                      label={t("program.levelProgress", { name: level.title })}
                    />
                    <span className="text-xs text-ink-faint">
                      {t("program.lessonsCount", {
                        done: String(done),
                        total: String(levelLessons.length),
                      })}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {units
                      .sort((a, b) => a.order - b.order)
                      .map((unit) => {
                        const ul = LESSONS.filter((l) => l.unitId === unit.id)
                        const ud = ul.filter(
                          (l) => lessons[l.id]?.completed
                        ).length
                        return (
                          <Link
                            key={unit.id}
                            href={`/dashboard/unit/${unit.id}`}
                            className="rounded-[var(--radius)] border border-line bg-sunken/40 p-4 transition-colors hover:border-accent"
                          >
                            <p className="text-xs text-ink-faint">
                              {t("program.unit", { n: String(unit.order) })}
                            </p>
                            <p className="mt-0.5 font-medium">{unit.title}</p>
                            <p className="text-xs text-ink-faint">
                              {locText(unit, "subtitle", locale)}
                            </p>
                            <div className="mt-3 flex items-center gap-2">
                              <ProgressBar
                                value={ud}
                                max={ul.length}
                                className="flex-1"
                              />
                              <span className="text-xs text-ink-faint">
                                {ud}/{ul.length}
                              </span>
                            </div>
                          </Link>
                        )
                      })}
                  </div>
                </>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
