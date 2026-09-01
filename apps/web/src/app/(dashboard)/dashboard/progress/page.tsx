"use client"

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import type { TooltipContentProps } from "recharts"
import type { ExamType, AssessmentAttempt } from "@/types"
import { EXAM_BADGE_COLORS, useExamConfig } from "@/lib/exam-definitions"
import { useProgress } from "@/stores/progress"
import { useSettings } from "@/stores/settings"
import { languageInfo } from "@/lib/languages"
import { Badge, Button, Card, SectionHeader } from "@/components/ui"
import {
  Clock,
  TrendingUp,
  CheckCircle,
  Trophy,
  BookOpen,
  Plus,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  XCircle,
  ChevronUp,
  ChevronDown,
  Flame,
  ArrowRight,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/i18n/locale-context"

const ProgressChart = dynamic(
  () =>
    import("@/components/dashboard/progress-chart").then((m) => ({
      default: m.ProgressChart,
    })),
  { ssr: false }
)

const PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 300
const ALL_EXAM_TYPES: ExamType[] = ["hsk", "tocfl", "goethe", "jlpt", "toefl"]

/** Chart/sidebar accent per exam. Falls back to the theme accent when the exam config hasn't hydrated. */
function examColor(examType: ExamType): string {
  return EXAM_BADGE_COLORS[examType] ?? "var(--accent)"
}

type SortField = "date" | "score" | "result"
type SortDir = "asc" | "desc"

function parseAttemptId(id: string): { examType?: string; level?: string } {
  const parts = id.split("-")
  if (parts.length >= 2) {
    return { examType: parts[0], level: parts[1] }
  }
  return {}
}

function createAttemptLabel(displayNames: Record<string, string>) {
  return (a: AssessmentAttempt): string => {
    const { examType, level } = parseAttemptId(a.assessmentId)
    const name = displayNames[examType as ExamType] ?? examType ?? ""
    return level ? `${name} ${level}` : name
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function isPassed(a: AssessmentAttempt): boolean {
  return a.score >= 60
}

function renderTooltip(props: TooltipContentProps) {
  const { active, payload } = props
  if (!active || !payload?.length) return null
  const d = payload[0].payload as {
    label?: string
    fullDate?: string
    score?: number
    passed?: boolean
  }
  return (
    <div className="rounded-[var(--radius)] border border-line bg-raised px-3 py-2 text-xs">
      {payload.length > 1 ? (
        <div className="space-y-1">
          <p className="mb-0.5 text-sm font-medium">{d.label}</p>
          {payload.map((entry) => (
            <p key={String(entry.name)} className="flex items-center gap-1.5">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: entry.color }}
              />
              <span className="text-ink-soft">{entry.name}</span>
              <span className="ml-auto font-semibold tabular-nums">
                {entry.value}%
              </span>
            </p>
          ))}
        </div>
      ) : (
        <div>
          <p className="mb-0.5 text-sm font-medium">{d.label}</p>
          <p className="mb-0.5 text-ink-soft">{d.fullDate}</p>
          <p
            className={cn(
              "font-semibold tabular-nums",
              d.passed ? "text-success" : "text-danger"
            )}
          >
            {d.score}%
          </p>
        </div>
      )}
    </div>
  )
}

interface SortHeaderProps {
  field: SortField
  label: string
  active: boolean
  order: SortDir
  onSort: (field: SortField) => void
  align?: "left" | "right"
}

function SortHeader({
  field,
  label,
  active,
  order,
  onSort,
  align = "left",
}: SortHeaderProps) {
  return (
    <th
      scope="col"
      aria-sort={
        active ? (order === "asc" ? "ascending" : "descending") : "none"
      }
      className={cn(
        "px-4 py-3 font-medium",
        align === "right" ? "text-right" : "text-left"
      )}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex cursor-pointer items-center gap-1 font-medium transition-colors select-none hover:text-ink"
      >
        {label}
        {active ? (
          order === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ChevronUp className="h-3 w-3 opacity-0" />
        )}
      </button>
    </th>
  )
}

export default function ProgressPage() {
  return (
    <Suspense fallback={<ProgressSkeleton />}>
      <ProgressContent />
    </Suspense>
  )
}

function ProgressSkeleton() {
  const shimmer = "bg-line animate-pulse rounded"
  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className={cn(shimmer, "mb-2 h-8 w-40")} />
      <div className={cn(shimmer, "mb-6 h-4 w-72")} />
      <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-8">
        <div>
          <div className={cn(shimmer, "mb-6 h-[220px] w-full")} />
          <Card className="p-0">
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={cn(shimmer, "h-6 w-full")} />
              ))}
            </div>
          </Card>
        </div>
        <div className="hidden space-y-6 lg:block">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={cn(shimmer, "h-5 w-full")} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ProgressContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const examConfig = useExamConfig()
  const { t } = useTranslation()
  const settingsLang = useSettings((s) => s.language)
  const langExamTypes = useMemo(
    () =>
      (languageInfo(settingsLang).examTypes.filter((et) =>
        ALL_EXAM_TYPES.includes(et as ExamType)
      ) ?? []) as ExamType[],
    [settingsLang]
  )

  const attemptLabel = useMemo(
    () => createAttemptLabel(examConfig.displayNames),
    [examConfig.displayNames]
  )

  // ── URL-derived state ──────────────────────────────────
  const urlQ = searchParams.get("q") ?? ""
  const urlPage = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const urlSort = (searchParams.get("sort") ?? "date") as SortField
  const urlOrder = (searchParams.get("order") ?? "desc") as SortDir

  // ── Store ──────────────────────────────────────────────
  const hydrated = useProgress((s) => s.hydrated)
  const streak = useProgress((s) => s.streak)
  const bestStreak = useProgress((s) => s.bestStreak)
  const attempts = useProgress((s) => s.attempts)
  const sessions = useProgress((s) => s.sessions)

  // ── Selected exam types for chart/table filter (multi-select, URL-driven) ──
  const selectedTypes = useMemo(() => {
    const raw = searchParams.get("type")
    if (!raw) return new Set<ExamType>()
    return new Set(
      raw
        .split(",")
        .filter((t): t is ExamType => langExamTypes.includes(t as ExamType))
    )
  }, [searchParams, langExamTypes])

  function toggleType(type: ExamType) {
    const next = new Set(selectedTypes)
    if (next.has(type)) next.delete(type)
    else next.add(type)
    const arr = Array.from(next)
    navigate({ type: arr.length > 0 ? arr.join(",") : null })
  }

  function clearFilter() {
    navigate({ type: null })
  }

  const hasActiveFilter = selectedTypes.size > 0

  // ── Search input (local, debounced) ────────────────────
  const [searchInput, setSearchInput] = useState(urlQ)
  const [prevUrlQ, setPrevUrlQ] = useState(urlQ)
  if (urlQ !== prevUrlQ) {
    setPrevUrlQ(urlQ)
    setSearchInput(urlQ)
  }
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const navigate = useCallback(
    (params: Record<string, string | null | undefined>) => {
      const next = new URLSearchParams(searchParams.toString())
      let resetPage = false

      for (const [key, value] of Object.entries(params)) {
        if (value === undefined) continue
        const omit =
          value === null ||
          value === "" ||
          value === "all" ||
          (key === "page" && (value === "1" || value === null))
        if (omit) next.delete(key)
        else next.set(key, value)
        if (key === "q" || key === "type") resetPage = true
      }

      if (resetPage && !("page" in params)) next.delete("page")

      const qs = next.toString()
      router.replace(`/dashboard/progress${qs ? `?${qs}` : ""}`, {
        scroll: false,
      })
    },
    [searchParams, router]
  )

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      if (searchInput !== urlQ) navigate({ q: searchInput || null })
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [searchInput, urlQ, navigate])

  // ── Derived data ─────────────────────────────────────
  const { examAttempts, unattemptedExamTypes } = useMemo(() => {
    const examAttempts = attempts.filter((a) => {
      const { examType } = parseAttemptId(a.assessmentId)
      return examType && langExamTypes.includes(examType as ExamType)
    })
    const attempted = new Set(
      examAttempts
        .map((a) => parseAttemptId(a.assessmentId).examType as ExamType)
        .filter(Boolean)
    )
    const unattempted = langExamTypes.filter((t) => !attempted.has(t))
    return { examAttempts, unattemptedExamTypes: unattempted }
  }, [attempts, langExamTypes])

  const hasAttempts = examAttempts.length > 0

  const stat = useMemo(() => {
    const total = examAttempts.length
    const passed = examAttempts.filter(isPassed).length
    const avgScore =
      total > 0
        ? Math.round(examAttempts.reduce((s, a) => s + a.score, 0) / total)
        : 0
    const totalTime = examAttempts.reduce((s, a) => s + a.timeSec, 0)
    const totalMinutes = Object.values(sessions).reduce(
      (s, ses) => s + (ses as { minutes: number }).minutes,
      0
    )
    return { total, passed, avgScore, totalTime, totalMinutes }
  }, [examAttempts, sessions])

  const { aggregateChartData, filteredChartData } = useMemo(() => {
    const agg = !hasAttempts
      ? []
      : [...examAttempts]
          .sort(
            (a, b) =>
              new Date(a.finishedAt ?? a.startedAt).getTime() -
              new Date(b.finishedAt ?? b.startedAt).getTime()
          )
          .map((a) => ({
            date: formatShortDate(a.finishedAt ?? a.startedAt),
            fullDate: formatDate(a.finishedAt ?? a.startedAt),
            score: a.score,
            label: attemptLabel(a),
            passed: isPassed(a),
          }))

    let filt: { type: ExamType; data: Record<string, unknown>[] }[] = []
    if (hasActiveFilter && hasAttempts) {
      const relevant = examAttempts.filter((a) => {
        const { examType } = parseAttemptId(a.assessmentId)
        return examType && selectedTypes.has(examType as ExamType)
      })
      if (relevant.length > 0) {
        const groups = new Map<ExamType, AssessmentAttempt[]>()
        for (const a of relevant) {
          const { examType } = parseAttemptId(a.assessmentId)
          if (examType && selectedTypes.has(examType as ExamType)) {
            const et = examType as ExamType
            if (!groups.has(et)) groups.set(et, [])
            groups.get(et)!.push(a)
          }
        }
        filt = Array.from(groups.entries()).map(([type, items]) => ({
          type,
          data: items
            .sort(
              (a, b) =>
                new Date(a.finishedAt ?? a.startedAt).getTime() -
                new Date(b.finishedAt ?? b.startedAt).getTime()
            )
            .map((a) => ({
              date: formatShortDate(a.finishedAt ?? a.startedAt),
              score: a.score,
              label: attemptLabel(a),
              fullDate: formatDate(a.finishedAt ?? a.startedAt),
              passed: isPassed(a),
              [type]: a.score,
            })),
        }))
      }
    }
    return { aggregateChartData: agg, filteredChartData: filt }
  }, [examAttempts, selectedTypes, hasActiveFilter, hasAttempts, attemptLabel])

  const byExam = useMemo(() => {
    if (!hasAttempts) return []
    const map = new Map<string, AssessmentAttempt[]>()
    for (const a of examAttempts) {
      const { examType } = parseAttemptId(a.assessmentId)
      const key = examType || "unknown"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    }
    return Array.from(map.entries())
      .map(([type, items]) => {
        const passedCount = items.filter(isPassed).length
        const avg = Math.round(
          items.reduce((s, i) => s + i.score, 0) / items.length
        )
        const best = Math.max(...items.map((i) => i.score))
        return {
          type: type as ExamType,
          passed: passedCount,
          total: items.length,
          avg,
          best,
        }
      })
      .sort((a, b) => b.total - a.total)
  }, [examAttempts, hasAttempts])

  const processedAttempts = useMemo(() => {
    let result = [...examAttempts]
    if (hasActiveFilter) {
      result = result.filter((a) => {
        const { examType } = parseAttemptId(a.assessmentId)
        return examType && selectedTypes.has(examType as ExamType)
      })
    }
    if (urlQ) {
      const lower = urlQ.toLowerCase()
      result = result.filter((a) =>
        attemptLabel(a).toLowerCase().includes(lower)
      )
    }
    const dir = urlOrder === "asc" ? 1 : -1
    result.sort((a, b) => {
      const aDate = new Date(a.finishedAt ?? a.startedAt).getTime()
      const bDate = new Date(b.finishedAt ?? b.startedAt).getTime()
      switch (urlSort) {
        case "score":
          return dir * (a.score - b.score)
        case "result":
          return dir * ((isPassed(a) ? 1 : 0) - (isPassed(b) ? 1 : 0))
        default:
          return dir * (bDate - aDate)
      }
    })
    return result
  }, [
    examAttempts,
    selectedTypes,
    hasActiveFilter,
    urlQ,
    urlSort,
    urlOrder,
    attemptLabel,
  ])

  const totalCount = processedAttempts.length
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const currentPage = Math.min(urlPage, totalPages)
  const pageAttempts = useMemo(
    () =>
      processedAttempts.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
      ),
    [processedAttempts, currentPage]
  )

  const weakAreas = useMemo(() => {
    if (!hasAttempts) return []
    const byLevel = new Map<string, AssessmentAttempt[]>()
    for (const a of examAttempts) {
      const { examType, level } = parseAttemptId(a.assessmentId)
      if (examType && level) {
        const key = `${examType}-${level}`
        if (!byLevel.has(key)) byLevel.set(key, [])
        byLevel.get(key)!.push(a)
      }
    }
    const areas: { label: string; score: number; href: string }[] = []
    for (const [key, items] of byLevel) {
      const avg = Math.round(
        items.reduce((s, i) => s + i.score, 0) / items.length
      )
      if (avg < 70) {
        const [examType, level] = key.split("-")
        areas.push({
          label: `${examConfig.displayNames[examType as ExamType] || examType} Level ${level}`,
          score: avg,
          href: `/dashboard/exam/${examType}/${level}`,
        })
      }
    }
    return areas.sort((a, b) => a.score - b.score).slice(0, 5)
  }, [examAttempts, hasAttempts, examConfig.displayNames])

  function handleSort(field: SortField) {
    if (urlSort === field) {
      navigate({ order: urlOrder === "asc" ? "desc" : "asc" })
    } else {
      navigate({ sort: field, order: "desc" })
    }
  }

  if (!hydrated) return <ProgressSkeleton />

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <SectionHeader
        title={t("nav.progress")}
        subtitle={t("progress.subtitle")}
      />

      {/* Stat cards (mobile/tablet only, <lg) */}
      {hasAttempts && (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:hidden">
          <StatCard
            label={t("progress.examsTaken")}
            value={stat.total}
            icon={<BookOpen className="h-4 w-4" />}
          />
          <StatCard
            label={t("progress.passed")}
            value={stat.passed}
            icon={<CheckCircle className="h-4 w-4" />}
          />
          <StatCard
            label={t("progress.avgScore")}
            value={stat.total > 0 ? `${stat.avgScore}%` : "-"}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <StatCard
            label={t("progress.studyTime")}
            value={`${Math.floor((stat.totalMinutes + Math.floor(stat.totalTime / 60)) / 60)}h`}
            icon={<Clock className="h-4 w-4" />}
          />
          <StatCard
            label={t("dashboard.streak")}
            value={streak}
            icon={<Flame className="h-4 w-4" />}
          />
          <StatCard
            label={t("progress.bestStreak")}
            value={bestStreak}
            icon={<Trophy className="h-4 w-4" />}
          />
        </div>
      )}

      {hasAttempts ? (
        <>
          {/* 2-column layout (desktop) */}
          <div className="mt-6 lg:mt-10 lg:grid lg:grid-cols-[1fr_280px] lg:gap-8">
            {/* ══ MAIN COLUMN ══ */}
            <div className="space-y-10">
              {/* Score Trend Chart */}
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-lg font-semibold">
                    {t("progress.scoreTrend")}
                  </h2>
                  <div className="hidden items-baseline gap-1.5 text-sm sm:flex">
                    <span className="text-ink-soft">
                      {t("progress.average")}
                    </span>
                    <span
                      className={cn(
                        "text-xl font-bold",
                        stat.avgScore >= 60 ? "text-success" : "text-danger"
                      )}
                    >
                      {stat.avgScore}%
                    </span>
                  </div>
                </div>
                <Card className="p-4 sm:p-6">
                  <ProgressChart
                    hasActiveFilter={hasActiveFilter}
                    filteredChartData={filteredChartData}
                    aggregateChartData={aggregateChartData}
                    displayNames={examConfig.displayNames}
                    examColor={(type) => examColor(type as ExamType)}
                    renderTooltip={renderTooltip}
                  />
                </Card>
              </section>

              {/* Recent Exam Attempts */}
              <section>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-lg font-semibold">
                    {t("progress.recentAttempts")}
                    <span className="ml-2 text-sm font-normal text-ink-soft">
                      ({t("progress.total", { n: String(totalCount) })})
                    </span>
                  </h2>
                  <div className="relative h-8 w-56">
                    <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft" />
                    <input
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder={t("progress.searchPlaceholder")}
                      className="h-full w-full rounded-md border bg-raised pr-7 pl-7 text-xs text-ink transition-colors outline-none placeholder:text-ink-faint focus:border-accent"
                    />
                    {searchInput && (
                      <button
                        onClick={() => {
                          setSearchInput("")
                          navigate({ q: null })
                        }}
                        className="absolute top-1/2 right-1.5 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded transition-colors hover:bg-hover"
                      >
                        <X className="h-3 w-3 text-ink-soft" />
                      </button>
                    )}
                  </div>
                </div>

                {pageAttempts.length > 0 ? (
                  <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-ink-soft [&_th]:sticky [&_th]:top-0 [&_th]:bg-sunken">
                            <th className="px-4 py-3 font-medium">
                              {t("progress.exam")}
                            </th>
                            <SortHeader
                              field="date"
                              label={t("progress.date")}
                              active={urlSort === "date"}
                              order={urlOrder}
                              onSort={handleSort}
                            />
                            <SortHeader
                              field="score"
                              label={t("progress.score")}
                              active={urlSort === "score"}
                              order={urlOrder}
                              onSort={handleSort}
                              align="right"
                            />
                            <th className="px-4 py-3 text-right font-medium">
                              {t("progress.time")}
                            </th>
                            <SortHeader
                              field="result"
                              label={t("progress.result")}
                              active={urlSort === "result"}
                              order={urlOrder}
                              onSort={handleSort}
                            />
                            <th className="px-4 py-3 font-medium"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageAttempts.map((a) => {
                            const { examType, level } = parseAttemptId(
                              a.assessmentId
                            )
                            const passed = isPassed(a)
                            return (
                              <tr
                                key={a.id}
                                className="border-b transition-colors last:border-0 hover:bg-hover/50"
                              >
                                <td className="px-4 py-3">
                                  <span className="font-medium">
                                    {examType?.toUpperCase()}
                                  </span>
                                  {level && (
                                    <span className="ml-1 text-ink-soft">
                                      {level}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-ink-soft">
                                  {formatDate(a.finishedAt ?? a.startedAt)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span
                                    className={cn(
                                      "font-medium tabular-nums",
                                      passed ? "text-success" : "text-danger"
                                    )}
                                  >
                                    {a.score}%
                                  </span>
                                  <span className="ml-1 text-xs text-ink-soft">
                                    ({a.correct}/{a.total})
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right whitespace-nowrap text-ink-soft tabular-nums">
                                  {formatTime(a.timeSec)}
                                </td>
                                <td className="px-4 py-3">
                                  <Badge tone={passed ? "success" : "danger"}>
                                    <span className="inline-flex items-center gap-1">
                                      {passed ? (
                                        <CheckCircle className="h-3 w-3" />
                                      ) : (
                                        <XCircle className="h-3 w-3" />
                                      )}
                                      {passed
                                        ? t("progress.passed")
                                        : t("progress.failed")}
                                    </span>
                                  </Badge>
                                </td>
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() =>
                                      router.push(
                                        `/dashboard/exam/${examType}/${level}`
                                      )
                                    }
                                    className="text-xs font-medium text-accent hover:text-accent-strong"
                                  >
                                    {t("progress.retake")}
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                ) : (
                  <Card className="p-8 text-center text-sm text-ink-soft">
                    {urlQ ? (
                      <>
                        {t("progress.noResults", { q: urlQ })}
                        <br />
                        <button
                          onClick={() => {
                            setSearchInput("")
                            navigate({ q: null })
                          }}
                          className="mt-2 text-accent underline underline-offset-2"
                        >
                          {t("progress.clear")}
                        </button>
                      </>
                    ) : (
                      t("progress.empty")
                    )}
                  </Card>
                )}

                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <button
                      disabled={currentPage <= 1}
                      onClick={() =>
                        navigate({ page: String(currentPage - 1) })
                      }
                      className={cn(
                        "inline-flex items-center gap-1 rounded border px-2.5 py-1.5 text-xs font-medium transition-colors",
                        currentPage <= 1
                          ? "cursor-not-allowed border-line text-ink-faint"
                          : "border-line hover:bg-hover"
                      )}
                    >
                      <ChevronLeft className="h-3 w-3" />
                      {t("progress.prev")}
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (p) => (
                        <button
                          key={p}
                          onClick={() => navigate({ page: String(p) })}
                          className={cn(
                            "rounded border px-2.5 py-1.5 text-xs font-medium transition-colors",
                            p === currentPage
                              ? "border-accent bg-accent text-accent-ink"
                              : "border-line hover:bg-hover"
                          )}
                        >
                          {p}
                        </button>
                      )
                    )}
                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() =>
                        navigate({ page: String(currentPage + 1) })
                      }
                      className={cn(
                        "inline-flex items-center gap-1 rounded border px-2.5 py-1.5 text-xs font-medium transition-colors",
                        currentPage >= totalPages
                          ? "cursor-not-allowed border-line text-ink-faint"
                          : "border-line hover:bg-hover"
                      )}
                    >
                      {t("progress.next")}
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </section>
            </div>

            {/* ══ SIDEBAR (desktop only, lg+) ══ */}
            <aside className="hidden space-y-3 lg:block">
              {/* Stats */}
              <Card className="p-4">
                <div className="grid grid-cols-2 gap-2">
                  <StatTile
                    label={t("progress.examsTaken")}
                    value={stat.total}
                  />
                  <StatTile label={t("progress.passed")} value={stat.passed} />
                  <StatTile
                    label={t("progress.passRate")}
                    value={
                      stat.total > 0
                        ? `${Math.round((stat.passed / stat.total) * 100)}%`
                        : "-"
                    }
                  />
                  <StatTile
                    label={t("progress.studyTime")}
                    value={`${Math.floor((stat.totalMinutes + Math.floor(stat.totalTime / 60)) / 60)}h`}
                  />
                  <StatTile
                    label={t("dashboard.streak")}
                    value={t("progress.days", { n: String(streak) })}
                  />
                  <StatTile
                    label={t("progress.bestStreak")}
                    value={t("progress.days", { n: String(bestStreak) })}
                  />
                </div>
              </Card>

              {/* Performance */}
              {byExam.length > 0 && (
                <Card className="p-4">
                  <h3 className="mb-2.5 text-xs font-semibold tracking-wider text-ink-soft uppercase">
                    {t("progress.performance")}
                  </h3>
                  <div className="space-y-0.5">
                    {hasActiveFilter && (
                      <button
                        onClick={clearFilter}
                        className="flex w-full items-center gap-1 py-1 text-left text-xs text-accent hover:underline"
                      >
                        {t("progress.showAllTypes")}
                      </button>
                    )}
                    {byExam.map(({ type, passed, total, avg }) => {
                      const active = !hasActiveFilter || selectedTypes.has(type)
                      return (
                        <button
                          key={type}
                          onClick={() => toggleType(type)}
                          className={cn(
                            "-mx-2 flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition-colors",
                            active
                              ? "opacity-100"
                              : "opacity-40 hover:opacity-70",
                            "hover:bg-hover/60"
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span
                              className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ background: examColor(type) }}
                            />
                            <span
                              className={cn(
                                "truncate text-xs",
                                active ? "font-medium" : "font-normal"
                              )}
                            >
                              {examConfig.displayNames[type]}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span
                              className={cn(
                                "text-xs tabular-nums",
                                passed > 0 ? "text-success" : "text-ink-soft"
                              )}
                            >
                              {passed}/{total}
                            </span>
                            <span className="w-8 text-right text-xs font-semibold tabular-nums">
                              {avg}%
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </Card>
              )}

              {/* Explore Other Exams */}
              {unattemptedExamTypes.length > 0 && (
                <Card className="p-4">
                  <h3 className="mb-2.5 text-xs font-semibold tracking-wider text-ink-soft uppercase">
                    {t("progress.exploreOtherExams")}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {unattemptedExamTypes.map((t) => (
                      <button
                        key={t}
                        onClick={() => router.push(`/dashboard/exam/${t}`)}
                        className="inline-flex items-center gap-1 rounded-full border border-dashed border-line-strong px-2.5 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-accent hover:text-ink"
                      >
                        <Plus className="h-3 w-3" />
                        {examConfig.displayNames[t]}
                      </button>
                    ))}
                  </div>
                </Card>
              )}

              {/* Areas to Improve */}
              {weakAreas.length > 0 && (
                <Card className="p-4">
                  <h3 className="mb-2.5 text-xs font-semibold tracking-wider text-ink-soft uppercase">
                    {t("progress.areasToImprove")}
                  </h3>
                  <div className="space-y-1.5">
                    {weakAreas.slice(0, 3).map((area) => (
                      <button
                        key={area.label}
                        onClick={() => router.push(area.href)}
                        className="group flex w-full cursor-pointer items-center gap-2 rounded-lg bg-sunken px-3 py-2 text-left transition-colors hover:bg-hover/70"
                      >
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warn" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">
                            {area.label}
                          </p>
                          <div className="mt-1.5 h-1 rounded-full bg-line">
                            <div
                              className={cn(
                                "h-1 rounded-full transition-all",
                                area.score < 50 ? "bg-danger" : "bg-warn"
                              )}
                              style={{ width: `${Math.max(4, area.score)}%` }}
                            />
                          </div>
                        </div>
                        <ArrowRight className="h-3 w-3 shrink-0 text-ink-soft/50 transition-colors group-hover:text-ink-soft" />
                      </button>
                    ))}
                    {weakAreas.length > 3 && (
                      <p className="pt-0.5 text-center text-xs text-accent">
                        {t("progress.moreAreas", {
                          n: String(weakAreas.length - 3),
                        })}
                      </p>
                    )}
                  </div>
                </Card>
              )}

              {/* Next Goals */}
              <Card className="p-4">
                <h3 className="mb-2.5 text-xs font-semibold tracking-wider text-ink-soft uppercase">
                  {t("progress.nextGoals")}
                </h3>
                <div className="space-y-2">
                  <GoalItem
                    label={t("progress.goalMoreExams")}
                    current={Math.min(examAttempts.length, 10)}
                    target={10}
                    unit={t("progress.goalExamsUnit")}
                  />
                  <GoalItem
                    label={t("progress.goalImproveScore")}
                    current={Math.min(stat.avgScore, 100)}
                    target={80}
                    unit="%"
                  />
                  <div className="flex items-center gap-3 rounded-lg bg-sunken px-3 py-2.5">
                    <Flame className="h-5 w-5 shrink-0 text-warn" />
                    <div>
                      <p className="text-xs font-medium text-ink-soft">
                        {t("progress.studyStreak")}
                      </p>
                      <p className="text-base font-bold text-warn">
                        {t("progress.days", { n: String(streak) })}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </aside>
          </div>
        </>
      ) : (
        <div className="mt-12 flex flex-col items-center text-center">
          <BookOpen className="mb-4 h-12 w-12 text-ink-soft/40" />
          <h2 className="mb-2 text-xl font-semibold">
            {t("progress.emptyTitle")}
          </h2>
          <p className="mb-6 max-w-md text-sm text-ink-soft">
            {t("progress.emptyDesc")}
          </p>
          <Button onClick={() => router.push("/dashboard/exam")}>
            {t("progress.emptyCta")}
          </Button>
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="truncate text-xs text-ink-soft">{label}</div>
        <div className="font-display text-lg font-semibold">{value}</div>
      </div>
    </Card>
  )
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[var(--radius)] bg-sunken px-3 py-2.5">
      <p className="text-xs text-ink-faint">{label}</p>
      <p className="mt-0.5 text-base font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function GoalItem({
  label,
  current,
  target,
  unit,
}: {
  label: string
  current: number
  target: number
  unit: string
}) {
  const { t } = useTranslation()
  const progress = Math.min(100, Math.round((current / target) * 100))
  const done = current >= target
  return (
    <div className="rounded-lg bg-sunken px-3 py-2.5">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        {done ? (
          <span className="flex items-center gap-1 text-xs font-medium text-success">
            <CheckCircle className="h-3 w-3" />
            {t("progress.goalReached")}
          </span>
        ) : (
          <span className="text-xs text-ink-soft">
            {current}/{target} {unit}
          </span>
        )}
      </div>
      <div className="h-1.5 rounded-full bg-line">
        <div
          className={cn(
            "h-1.5 rounded-full transition-all",
            done ? "bg-success" : "bg-accent"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
