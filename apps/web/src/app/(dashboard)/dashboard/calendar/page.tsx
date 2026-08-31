"use client"

import { useMounted } from "@/lib/use-mounted"
import Link from "next/link"
import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useProgress } from "@/stores/progress"
import { useSettings } from "@/stores/settings"
import { cn, todayISO } from "@/lib/utils"
import { Badge, Card, SectionHeader } from "@/components/ui"
import { useTranslation } from "@/i18n/locale-context"

const MONTH_KEYS = [
  "calendar.month.january",
  "calendar.month.february",
  "calendar.month.march",
  "calendar.month.april",
  "calendar.month.may",
  "calendar.month.june",
  "calendar.month.july",
  "calendar.month.august",
  "calendar.month.september",
  "calendar.month.october",
  "calendar.month.november",
  "calendar.month.december",
]
const WEEKDAY_KEYS = [
  "calendar.weekday.mon",
  "calendar.weekday.tue",
  "calendar.weekday.wed",
  "calendar.weekday.thu",
  "calendar.weekday.fri",
  "calendar.weekday.sat",
  "calendar.weekday.sun",
]

export default function CalendarPage() {
  const { t, locale } = useTranslation()
  const progress = useProgress()
  const dailyGoal = useSettings((s) => s.dailyGoalMin)
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState<string>(todayISO())
  const mounted = useMounted()

  const days = useMemo(() => {
    const first = new Date(year, month, 1)
    const startOffset = (first.getDay() + 6) % 7 // Monday-first
    const total = new Date(year, month + 1, 0).getDate()
    const cells: (string | null)[] = Array(startOffset).fill(null)
    for (let d = 1; d <= total; d++) {
      cells.push(
        `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      )
    }
    return cells
  }, [year, month])

  if (!mounted) return null

  const selectedLog = progress.sessions[selected]
  const selectedTasks = progress.tasks.filter((t) => t.dueDate === selected)
  const today = todayISO()

  function navigate(delta: number) {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  return (
    <div className="animate-fade-up">
      <SectionHeader
        title={t("nav.calendar")}
        subtitle={t("calendar.subtitle")}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              aria-label={t("calendar.prevMonth")}
              className="cursor-pointer rounded-lg p-2 hover:bg-hover"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="font-display font-semibold capitalize">
              {t(MONTH_KEYS[month])} {year}
            </h2>
            <button
              onClick={() => navigate(1)}
              aria-label={t("calendar.nextMonth")}
              className="cursor-pointer rounded-lg p-2 hover:bg-hover"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {WEEKDAY_KEYS.map((k) => (
              <span key={k} className="pb-1 text-xs font-medium text-ink-faint">
                {t(k)}
              </span>
            ))}
            {days.map((date, i) =>
              date === null ? (
                <span key={`empty-${i}`} />
              ) : (
                (() => {
                  const log = progress.sessions[date]
                  const hasTasks = progress.tasks.some(
                    (t) => t.dueDate === date && t.status !== "done"
                  )
                  const intensity = log
                    ? Math.min(1, log.minutes / dailyGoal)
                    : 0
                  return (
                    <button
                      key={date}
                      onClick={() => setSelected(date)}
                      aria-label={`${t("calendar.day", { date })}${log ? `, ${t("calendar.minutesStudied", { n: String(log.minutes) })}` : ""}`}
                      className={cn(
                        "relative aspect-square cursor-pointer rounded-lg border text-sm transition-colors",
                        selected === date
                          ? "border-accent"
                          : "border-transparent hover:border-line-strong",
                        date === today && "font-bold"
                      )}
                      style={{
                        backgroundColor:
                          intensity > 0
                            ? `color-mix(in srgb, var(--accent) ${20 + intensity * 60}%, var(--bg-raised))`
                            : undefined,
                        color:
                          intensity > 0.5 ? "var(--accent-ink)" : undefined,
                      }}
                    >
                      {Number(date.slice(-2))}
                      {hasTasks && (
                        <span
                          className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-gold"
                          aria-hidden
                        />
                      )}
                    </button>
                  )
                })()
              )
            )}
          </div>
          <p className="mt-3 text-xs text-ink-faint">
            {t("calendar.intensityHint")}
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold">
            {new Date(selected + "T12:00:00").toLocaleDateString(
              locale === "id" ? "id-ID" : "en-US",
              { weekday: "long", day: "numeric", month: "long" }
            )}
          </h2>
          {selectedLog ? (
            <div className="mt-3 space-y-1 text-sm text-ink-soft">
              <p>
                ·{" "}
                {t("calendar.minutesStudied", {
                  n: String(selectedLog.minutes),
                })}
              </p>
              <p>· {t("calendar.xpEarned", { n: String(selectedLog.xp) })}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-faint">
              {selected <= today
                ? t("calendar.noActivity")
                : t("calendar.futureDay")}
            </p>
          )}
          <h3 className="mt-5 text-sm font-semibold">
            {t("calendar.tasksTitle")}
          </h3>
          {selectedTasks.length === 0 ? (
            <p className="mt-2 text-sm text-ink-faint">
              {t("calendar.noTasks")}
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {selectedTasks.map((task) => (
                <li
                  key={task.id}
                  className="rounded-lg border border-line px-3 py-2 text-sm"
                >
                  <span
                    className={
                      task.status === "done"
                        ? "text-ink-faint line-through"
                        : ""
                    }
                  >
                    {task.title}
                  </span>
                  <Badge
                    className="ml-2"
                    tone={task.status === "done" ? "success" : "warn"}
                  >
                    {task.status === "done"
                      ? t("calendar.done")
                      : t("calendar.minutes", { n: String(task.estimatedMin) })}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/dashboard/tasks"
            className="mt-4 inline-block text-xs font-medium text-accent hover:underline"
          >
            {t("calendar.manageTasks")}
          </Link>
        </Card>
      </div>
    </div>
  )
}
