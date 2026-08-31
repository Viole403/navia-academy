"use client"

import Link from "next/link"
import { useState } from "react"
import { Card, Button, SectionHeader, Badge } from "@/components/ui"
import {
  ClipboardList,
  BookOpen,
  Clock,
  CheckCircle2,
  Settings,
  Sparkles,
} from "lucide-react"
import {
  EXAM_BADGE_COLORS,
  EXAM_DEFINITIONS,
  useExamConfig,
} from "@/lib/exam-definitions"
import { examNameForLang } from "@/lib/data-client"
import { useExamCards } from "@/lib/exam-cards"
import { useSettings } from "@/stores/settings"
import { useTranslation } from "@/i18n/locale-context"
import type { ExamCardDef } from "@/lib/exam-cards"

function ExamCardComponent({ exam }: { exam: ExamCardDef }) {
  const { t } = useTranslation()
  const [notified, setNotified] = useState(false)
  const examColor = EXAM_BADGE_COLORS[exam.examType] || "var(--accent)"
  const muted = !exam.available

  return (
    <Card className={`flex flex-col p-4 ${muted ? "relative" : ""}`}>
      {muted && (
        <div className="absolute top-2 right-2 z-10">
          <Badge tone="neutral" className="text-xs">
            {t("exam.preview")}
          </Badge>
        </div>
      )}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${muted ? "opacity-50" : ""}`}
            style={{ backgroundColor: `${examColor}20` }}
          >
            <ClipboardList
              className="h-4 w-4"
              style={{ color: muted ? "var(--ink-faint)" : examColor }}
            />
          </div>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              muted ? "opacity-50" : ""
            }`}
            style={{
              backgroundColor: `${examColor}20`,
              color: muted ? "var(--ink-faint)" : examColor,
              borderColor: muted ? "var(--line)" : examColor,
            }}
          >
            {exam.level}
          </span>
        </div>
      </div>

      <h3 className="mb-2 font-display text-lg font-semibold">{exam.name}</h3>
      <p className="mb-3 line-clamp-2 flex-1 text-xs text-ink-soft">
        {exam.description}
      </p>

      <div className={`mb-3 space-y-1.5 text-xs ${muted ? "opacity-40" : ""}`}>
        <div className="flex items-center gap-2 text-ink-soft">
          <BookOpen className="h-3.5 w-3.5" />
          <span>{t("exam.questions", { n: String(exam.questions) })}</span>
        </div>
        <div className="flex items-center gap-2 text-ink-soft">
          <Clock className="h-3.5 w-3.5" />
          <span>{t("exam.minutes", { n: String(exam.duration) })}</span>
        </div>
        <div className="flex items-center gap-2 text-ink-soft">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>{t("exam.pass", { n: String(exam.passingScore) })}</span>
        </div>
      </div>

      {exam.available ? (
        <Link href={exam.href}>
          <Button className="w-full" size="sm">
            {t("exam.start")}
          </Button>
        </Link>
      ) : notified ? (
        <p className="rounded-[var(--radius)] border border-line bg-sunken px-3 py-2 text-center text-xs text-ink-soft">
          {t("exam.notified")}
        </p>
      ) : (
        <Button
          className="w-full"
          size="sm"
          variant="outline"
          onClick={() => {
            if (
              typeof window !== "undefined" &&
              "Notification" in window &&
              Notification.permission === "default"
            ) {
              void Notification.requestPermission()
            }
            setNotified(true)
          }}
        >
          {t("exam.notifyMe")}
        </Button>
      )}
    </Card>
  )
}

export default function ExamPage() {
  const activeExamType = useSettings((s) => s.activeExamType)
  const learningLanguage = useSettings((s) => s.language)
  const examConfig = useExamConfig()
  const { t } = useTranslation()
  const EXAM_CARDS = useExamCards()

  const def = EXAM_DEFINITIONS[activeExamType]
  const cards = EXAM_CARDS.filter((c) => c.examType === activeExamType)
  const availableCount = cards.filter((c) => c.available).length
  const totalLevels = def?.levels.length ?? 0
  const displayName = examConfig.displayNames[activeExamType] || activeExamType

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <SectionHeader title={t("exam.title")} subtitle={t("exam.subtitle")} />

      <Card className="mb-6 p-5 hover:border-line-strong">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="font-display font-semibold">{t("cat.title")}</p>
              <p className="text-xs text-ink-soft">{t("cat.subtitle")}</p>
            </div>
          </div>
          <Link href="/dashboard/exam/adaptive">
            <Button size="sm">{t("cat.start")}</Button>
          </Link>
        </div>
      </Card>

      <Card className="mb-6 bg-accent-soft p-4 hover:border-line-strong">
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 shrink-0 text-accent" />
          <div className="flex-1 text-sm">
            <span className="font-medium">{displayName}</span>
            {def && (
              <span className="text-ink-soft">
                {" — "}
                {def.description ?? ""}
                {" — "}
                {totalLevels}{" "}
                {totalLevels > 1 ? t("exam.levels") : t("exam.level")},{" "}
                {t("exam.focus", { list: def.focus.join(", ") })}
              </span>
            )}
            <span className="text-ink-soft"> {t("exam.changeProgramme")} </span>
            <Link
              href="/dashboard/settings"
              className="font-medium text-accent underline underline-offset-2 hover:text-accent-strong"
            >
              {t("nav.settings")}
            </Link>
            <span className="text-ink-soft">.</span>
          </div>
        </div>
      </Card>

      <div className="mt-8">
        {cards.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-dashed border-line p-10 text-center text-ink-soft">
            {t("exam.noCards")}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cards.map((exam) => (
              <ExamCardComponent key={exam.id} exam={exam} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-3 font-display text-lg font-semibold">
            {t("exam.about", { name: displayName })}
          </h3>
          {def && (
            <div className="space-y-3 text-sm text-ink-soft">
              <p>
                {def ? examNameForLang(def, learningLanguage) : ""} —{" "}
                {def?.region}
              </p>
              <p>
                {t("exam.availableLevels", { list: def.levels.join(", ") })}
              </p>
              <p>{t("exam.focusAreasDesc", { list: def.focus.join(", ") })}</p>
              <p>{t("exam.scriptChinese", { script: def.script })}</p>
              <p>{t("exam.levelsDesc")}</p>
            </div>
          )}
        </Card>
        <Card className="p-6 hover:border-line-strong">
          <h3 className="mb-3 font-display text-lg font-semibold">
            {t("exam.overview", { name: displayName })}
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink-soft">{t("exam.levelsLabel")}</span>
              <span className="font-medium">{totalLevels}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-soft">{t("exam.availableNow")}</span>
              <span className="font-medium">
                {availableCount}/{cards.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-soft">{t("exam.focusAreas")}</span>
              <span className="font-medium">{def?.focus.join(", ")}</span>
            </div>
            {def && (
              <div className="flex items-center justify-between">
                <span className="text-ink-soft">{t("exam.script")}</span>
                <span className="font-medium">{def.script}</span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
