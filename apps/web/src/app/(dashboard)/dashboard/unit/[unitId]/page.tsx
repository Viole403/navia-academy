"use client"

import { useMounted } from "@/lib/use-mounted"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, CheckCircle2, Circle, Clock, Play } from "lucide-react"
import {
  useCurriculum,
  lessonsOfUnit,
  levelById,
  unitById,
} from "@/lib/curriculum"
import { lessonsFor, useProgress } from "@/stores/progress"
import { useSettings } from "@/stores/settings"
import { SKILL_LABELS } from "@/types"
import { Badge, Button, Card, EmptyState, SectionHeader } from "@/components/ui"
import { useTranslation } from "@/i18n/locale-context"

export default function UnitPage() {
  const { t } = useTranslation()
  const { unitId } = useParams<{ unitId: string }>()
  useCurriculum()
  const unit = unitById(unitId)
  const settings = useSettings()
  const lessons = useProgress((s) => lessonsFor(s, settings.language))
  const mounted = useMounted()
  if (!mounted) return null

  if (!unit) {
    return (
      <EmptyState
        title={t("unit.notFound")}
        action={
          <Link href="/dashboard/program">
            <Button>{t("unit.backToProgram")}</Button>
          </Link>
        }
      />
    )
  }

  const level = levelById(unit.levelId)
  const unitLessons = lessonsOfUnit(unit.id)
  const next = unitLessons.find((l) => !lessons[l.id]?.completed)

  return (
    <div className="animate-fade-up">
      <Link
        href="/dashboard/program"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> {level?.title}
      </Link>
      <SectionHeader
        title={unit.title}
        subtitle={unit.description}
        action={
          next && (
            <Link href={`/dashboard/lesson/${next.id}`}>
              <Button>
                <Play className="h-4 w-4" />{" "}
                {lessons[next.id] ? t("lesson.continue") : t("unit.start")}
              </Button>
            </Link>
          )
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {unit.skills?.map((s) => (
          <Badge key={s}>{SKILL_LABELS[s]}</Badge>
        ))}
      </div>

      <div className="space-y-3">
        {unitLessons.map((lesson) => {
          const state = lessons[lesson.id]
          const completed = state?.completed
          const inProgress = state && !completed
          return (
            <Link key={lesson.id} href={`/dashboard/lesson/${lesson.id}`}>
              <Card className="mb-3 flex items-center gap-4 p-4 transition-colors hover:border-accent">
                {completed ? (
                  <CheckCircle2
                    className="h-6 w-6 shrink-0 text-success"
                    aria-label={t("unit.completed")}
                  />
                ) : (
                  <Circle
                    className="h-6 w-6 shrink-0 text-ink-faint"
                    aria-label={t("unit.pending")}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {lesson.order}. {lesson.title}
                  </p>
                  <p className="text-sm text-ink-faint">{lesson.subtitle}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs text-ink-faint">
                  {inProgress && (
                    <Badge tone="warn">{t("unit.inProgress")}</Badge>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />{" "}
                    {t("unit.minutes", { n: String(lesson.durationMin) })}
                  </span>
                  <span>{t("unit.xp", { n: String(lesson.xp) })}</span>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
