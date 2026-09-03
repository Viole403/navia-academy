"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { PlayCircle, Sparkles, Volume2, Loader2, RotateCcw } from "lucide-react"
import {
  useCatExam,
  catRecommendedLevel,
  type CatResume,
  type CatAnswerLog,
  type CatItemFormat,
} from "@/hooks/use-cat-exam"
import { useSettings } from "@/stores/settings"
import { useTranslation } from "@/i18n/locale-context"
import { play } from "@/lib/audio"
import { languageInfo } from "@/lib/languages"
import type { VoiceLocale } from "@navia/utils"
import { Button, ProgressBar, Badge } from "@/components/ui"
import { useMounted } from "@/lib/use-mounted"
import { cat } from "@/lib/api"
import { OptionButton } from "./option-button"

const PER_QUESTION_SECONDS = 45

/** Cap sesi per exam-type (blueprint §9.1, detik — nilai tengah level resmi). */
const CAT_CAP_SECONDS: Record<string, number> = {
  hsk: 90 * 60,
  tocfl: 120 * 60,
  jlpt: 140 * 60,
  goethe: 80 * 60,
  toefl: 116 * 60,
}
const DEFAULT_CAP_SECONDS = 20 * 60

const SESSION_KEY = "navia-cat-session-id"
const PENDING_RESULT_KEY = "navia-cat-result-pending"

interface WireAnswer {
  item_id: string
  item_elo: number
  correct: boolean
  format: string
}

interface CatSessionDTO {
  id: number
  status: string
  exam_type: string
  start_theta: number
  engine_version?: string
  answers: WireAnswer[]
  time_limit_sec?: number
  time_remaining_sec?: number
  started_at?: string
  [k: string]: unknown
}

/** Engine log → wire (`wordId/elo` → `item_id/item_elo`). */
function toWire(a: CatAnswerLog): WireAnswer {
  return {
    item_id: a.wordId,
    item_elo: a.elo,
    correct: a.correct,
    format: a.format,
  }
}

/** Wire → engine log (`item_id/item_elo` → `wordId/elo`). */
function toLog(a: WireAnswer): CatAnswerLog {
  return {
    wordId: a.item_id,
    elo: a.item_elo,
    correct: a.correct,
    format: a.format as CatItemFormat,
  }
}

function computeElapsed(s: CatSessionDTO): number {
  const tl = (s.time_limit_sec as number | undefined) ?? 0
  const rem = s.time_remaining_sec as number | undefined
  if (tl > 0 && typeof rem === "number") return Math.max(0, tl - rem)
  return 0
}

/** Queue a result payload locally; flush when back online (blueprint §8.3). */
function queueResult(payload: Record<string, unknown>) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(PENDING_RESULT_KEY, JSON.stringify(payload))
}

async function flushPendingResult(): Promise<void> {
  if (typeof window === "undefined") return
  const raw = window.localStorage.getItem(PENDING_RESULT_KEY)
  if (!raw) return
  try {
    await cat.result(JSON.parse(raw))
    window.localStorage.removeItem(PENDING_RESULT_KEY)
  } catch {
    // keep queued; retry next mount / online event
  }
}

export default function AdaptiveExamPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const mounted = useMounted()
  const settings = useSettings()
  const resumeObj = useRef<CatResume | null>(null)
  // startThetaRef captures the theta this session began with (fresh = prior
  // Elo or 550; resume = the stored start). The server recomputes the CAT
  // rating from this start, so omitting it makes resume sessions under-report.
  const startThetaRef = useRef(550)
  const { current, theta, log, done, result, start, answer } = useCatExam(
    undefined,
    resumeObj
  )
  const [picked, setPicked] = useState<string | null>(null)
  const [audioLoading, setAudioLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [tabWarnings, setTabWarnings] = useState(0)
  const [integrityFlag, setIntegrityFlag] = useState(false)
  const [pendingResume, setPendingResume] = useState<CatResume | null>(null)
  const [ready, setReady] = useState(false)
  const startedRef = useRef(false)
  const timedOutRef = useRef(false)
  const elapsedRef = useRef(0)
  const qElapsedRef = useRef(0)
  const onAnswerRef = useRef<((option: string | null) => void) | null>(null)
  const sessionIdRef = useRef<number | null>(null)
  const examTypeRef = useRef("")

  const examType = settings.activeExamType
  const maxSeconds = CAT_CAP_SECONDS[examType] ?? DEFAULT_CAP_SECONDS
  const ttsLocale = languageInfo(settings.language).ttsLocale as VoiceLocale
  useEffect(() => {
    examTypeRef.current = examType
  }, [examType])

  // On mount: look for an interrupted session and offer resume; flush queued result;
  // warm-start Elo from server history if no local estimate yet (blueprint §7.1 cold-start).
  useEffect(() => {
    if (!mounted) return
    void flushPendingResult()
    void (async () => {
      try {
        const prog = (await cat.progress()) as Array<{
          elo_estimate: number
        }>
        if (
          prog.length > 0 &&
          !window.localStorage.getItem("navia-cat-last-elo")
        ) {
          window.localStorage.setItem(
            "navia-cat-last-elo",
            String(Math.round(prog[0].elo_estimate))
          )
        }
      } catch {
        // offline: ignore, fall back to local estimate
      }
    })()
    const onOnline = () => void flushPendingResult()
    window.addEventListener("online", onOnline)
    return () => window.removeEventListener("online", onOnline)
  }, [mounted])

  useEffect(() => {
    if (!mounted) return
    const raw = window.localStorage.getItem(SESSION_KEY)
    ;(async () => {
      if (!raw) {
        setReady(true)
        return
      }
      try {
        const s = (await cat.getSession(Number(raw))) as CatSessionDTO
        sessionIdRef.current = s.id
        if (s.status === "in_progress" && s.answers.length > 0) {
          setPendingResume({
            startTheta: s.start_theta,
            answers: s.answers.map(toLog),
          })
          setElapsed(computeElapsed(s))
          elapsedRef.current = computeElapsed(s)
        }
      } catch {
        window.localStorage.removeItem(SESSION_KEY)
      }
      setReady(true)
    })()
  }, [mounted])

  useEffect(() => {
    if (!mounted || !ready || done) return
    if (!pendingResume && !startedRef.current) {
      startedRef.current = true
      start()
    }
  }, [mounted, ready, done, start, pendingResume])

  useEffect(() => {
    const iv = setInterval(() => {
      if (done) return
      elapsedRef.current += 1
      qElapsedRef.current += 1
      setElapsed(elapsedRef.current)
      if (
        !timedOutRef.current &&
        (qElapsedRef.current >= PER_QUESTION_SECONDS ||
          elapsedRef.current >= maxSeconds)
      ) {
        timedOutRef.current = true
        onAnswerRef.current?.(null)
      }
    }, 1000)
    return () => clearInterval(iv)
  }, [done, current, picked, maxSeconds])

  useEffect(() => {
    const onVis = () => {
      if (document.hidden && !done) {
        setTabWarnings((w) => {
          const next = w + 1
          if (next >= 2) setIntegrityFlag(true)
          return next
        })
      }
    }
    const onBlur = () => {
      if (!done) {
        setTabWarnings((w) => {
          const next = w + 1
          if (next >= 2) setIntegrityFlag(true)
          return next
        })
      }
    }
    document.addEventListener("visibilitychange", onVis)
    window.addEventListener("blur", onBlur)
    return () => {
      document.removeEventListener("visibilitychange", onVis)
      window.removeEventListener("blur", onBlur)
    }
  }, [done])

  const onAnswer = useCallback(
    (option: string | null) => {
      if (!current || picked) return
      setPicked(option)
      setTimeout(() => {
        answer(option ?? "")
        setPicked(null)
        qElapsedRef.current = 0
        timedOutRef.current = false
      }, 700)
    },
    [current, picked, answer]
  )
  useEffect(() => {
    onAnswerRef.current = onAnswer
  }, [onAnswer])

  // Persist per-answer (fire-and-forget). Creates the session on first answer.
  useEffect(() => {
    if (log.length === 0 || done) return
    const sid = sessionIdRef.current
    if (!sid) return
    void cat
      .saveSession(sid, {
        answers: log.map(toWire),
        elapsed_sec: elapsedRef.current,
        theta: Math.round(theta),
      })
      .catch(() => {})
  }, [log, done, theta])

  function beginSession(resumeData: CatResume | null) {
    if (resumeData) {
      resumeObj.current = resumeData
      startThetaRef.current = resumeData.startTheta
      setPendingResume(null)
      start()
      return
    }
    resumeObj.current = null
    startThetaRef.current = theta
    setPendingResume(null)
    startedRef.current = true
    sessionIdRef.current = null
    window.localStorage.removeItem(SESSION_KEY)
    setElapsed(0)
    elapsedRef.current = 0
    cat
      .session({
        exam_type: examType,
        start_theta: theta,
        time_limit_sec: maxSeconds,
      })
      .then((s: { id: number }) => {
        sessionIdRef.current = s.id
        window.localStorage.setItem(SESSION_KEY, String(s.id))
      })
      .catch(() => {})
    start()
  }

  useEffect(() => {
    const onHide = () => {
      const sid = sessionIdRef.current
      if (!sid) return
      void cat
        .saveSession(sid, {
          answers: log.map(toWire),
          elapsed_sec: elapsedRef.current,
          theta: Math.round(theta),
        })
        .catch(() => {})
    }
    // Blueprint §10.1 (wajib): confirm before leaving an in-progress session.
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (done) return
      onHide()
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("pagehide", onHide)
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => {
      window.removeEventListener("pagehide", onHide)
      window.removeEventListener("beforeunload", onBeforeUnload)
    }
  }, [log, theta, done])

  const savedRef = useRef(false)

  useEffect(() => {
    if (!done || !result || savedRef.current) return
    savedRef.current = true
    window.localStorage.removeItem(SESSION_KEY)
    sessionIdRef.current = null
    void cat
      .result({
        exam_type: examType,
        exam_level: result.cefrBand,
        start_theta: startThetaRef.current,
        elo_estimate: Math.round(result.eloEstimate),
        elo_sd: Math.round(result.eloSd),
        cefr_band: result.cefrBand,
        total_questions: result.answered,
        correct_answers: result.correct,
        time_taken: elapsedRef.current,
        integrity_flag: integrityFlag,
        answers: log.map(toWire),
        engine_version: "elo-v1",
      })
      .catch(() => {
        queueResult({
          exam_type: examType,
          exam_level: result.cefrBand,
          start_theta: startThetaRef.current,
          elo_estimate: Math.round(result.eloEstimate),
          elo_sd: Math.round(result.eloSd),
          cefr_band: result.cefrBand,
          total_questions: result.answered,
          correct_answers: result.correct,
          time_taken: elapsedRef.current,
          integrity_flag: integrityFlag,
          answers: log.map(toWire),
          engine_version: "elo-v1",
        })
        savedRef.current = false
      })
  }, [done, result, examType, integrityFlag, log])

  function abandonSession() {
    if (!window.confirm(t("cat.abandonConfirm"))) return
    sessionIdRef.current = null
    window.localStorage.removeItem(SESSION_KEY)
    router.push("/dashboard/exam")
  }

  function restart() {
    resumeObj.current = null
    setPendingResume(null)
    startedRef.current = false
    timedOutRef.current = false
    elapsedRef.current = 0
    qElapsedRef.current = 0
    setPicked(null)
    setElapsed(0)
    setTabWarnings(0)
    setIntegrityFlag(false)
    sessionIdRef.current = null
    window.localStorage.removeItem(SESSION_KEY)
    cat
      .session({
        exam_type: examType,
        start_theta: 550,
        time_limit_sec: maxSeconds,
      })
      .then((s: { id: number }) => {
        sessionIdRef.current = s.id
        window.localStorage.setItem(SESSION_KEY, String(s.id))
      })
      .catch(() => {})
    start()
  }

  if (!mounted) return null

  // Resume prompt: interrupted session detected, ask before continuing.
  if (ready && pendingResume && !done) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-10 text-center">
        <PlayCircle className="mx-auto h-14 w-14 text-accent" aria-hidden />
        <h1 className="mt-4 font-display text-2xl font-bold">
          {t("cat.resumeTitle")}
        </h1>
        <p className="mt-2 text-sm text-ink-faint">
          {t("cat.resumeDesc", { n: String(pendingResume.answers.length) })}
        </p>
        <div className="mt-6 flex gap-3">
          <Button
            className="flex-1"
            onClick={() => beginSession(pendingResume)}
          >
            {t("cat.resumeContinue")}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => beginSession(null)}
          >
            {t("cat.resumeNew")}
          </Button>
        </div>
      </main>
    )
  }

  if (done && result) {
    return (
      <main className="animate-fade-up mx-auto max-w-xl px-4 py-10">
        <div className="text-center">
          <Sparkles className="mx-auto h-14 w-14 text-accent" aria-hidden />
          <h1 className="mt-4 font-display text-2xl font-bold">
            {t("cat.yourResult")}
          </h1>
          <p className="mt-1 text-sm text-ink-faint">
            {t("cat.summary", {
              answered: String(result.answered),
              correct: String(result.correct),
            })}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-[var(--radius)] border border-line p-4 text-center">
            <p className="text-xs tracking-wide text-ink-faint uppercase">
              {t("cat.cefrBand")}
            </p>
            <p className="mt-1 font-display text-3xl font-bold text-accent">
              {result.cefrBand}
            </p>
          </div>
          <div className="rounded-[var(--radius)] border border-line p-4 text-center">
            <p className="text-xs tracking-wide text-ink-faint uppercase">
              {t("cat.eloScore")}
            </p>
            <p className="mt-1 font-display text-3xl font-bold">
              {Math.round(result.eloEstimate)}
            </p>
            <p className="mt-1 text-xs text-ink-faint">
              ±{Math.round(result.eloSd)}
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-[var(--radius)] border border-line p-4 text-center">
          <p className="text-xs tracking-wide text-ink-faint uppercase">
            {t("cat.recommendedLevel")}
          </p>
          <p className="mt-1 font-display text-2xl font-bold">
            {catRecommendedLevel(result, examType)}
          </p>
        </div>

        {result.weakBands.length > 0 && (
          <div className="mt-3 rounded-[var(--radius)] border border-line p-4">
            <p className="text-xs tracking-wide text-ink-faint uppercase">
              {t("cat.weakAreas")}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {result.weakBands.map((b) => (
                <Badge key={b} tone="warn">
                  {b}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {integrityFlag && (
          <p className="mt-4 rounded-lg bg-sunken px-4 py-3 text-xs text-ink-faint">
            {t("cat.integrityFlag")}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <Button className="flex-1" onClick={restart}>
            <RotateCcw className="mr-1 h-4 w-4" /> {t("cat.retake")}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.push("/dashboard/exam")}
          >
            {t("common.done")}
          </Button>
        </div>
      </main>
    )
  }

  const qNumber = log.length + 1

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-4 py-10">
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs text-ink-faint">
          <span>{t("cat.question", { n: String(qNumber) })}</span>
          <span className="flex items-center gap-3">
            <span>
              {formatTime(elapsed)} / {formatTime(maxSeconds)}
            </span>
            <span>Θ {Math.round(theta)}</span>
          </span>
        </div>
        <ProgressBar
          className="mt-2"
          value={log.length}
          max={Math.max(log.length, 1)}
          label={t("cat.progress")}
        />
        {tabWarnings >= 1 && (
          <p className="mt-2 text-xs text-danger">
            {t("cat.tabWarning", { n: String(tabWarnings) })}
          </p>
        )}
        <div className="mt-4 text-right">
          <Button variant="ghost" size="sm" onClick={abandonSession}>
            {t("cat.abandon")}
          </Button>
        </div>
      </div>

      {current && (
        <div
          className="animate-brush-in"
          key={`${current.word.id}-${current.format}`}
        >
          <p className="text-xs font-medium tracking-wide text-ink-faint uppercase">
            {current.format === "listening"
              ? t("cat.listening")
              : current.format === "reading"
                ? t("cat.reading")
                : t("cat.vocabulary")}
          </p>
          {current.prompt && (
            <h1 className="mt-2 font-display text-xl font-semibold">
              {current.prompt}
            </h1>
          )}

          {current.format === "listening" && (
            <button
              onClick={() =>
                play(
                  current.audioText ?? current.correctAnswer,
                  {
                    rate: settings.audioRate,
                    onLoadingChange: setAudioLoading,
                    onError: () => {},
                  },
                  ttsLocale,
                  settings.voiceGender
                )
              }
              disabled={audioLoading}
              className="mt-4 flex cursor-pointer items-center gap-2 rounded-[var(--radius)] border border-line bg-raised px-4 py-3 text-sm font-medium hover:bg-hover disabled:opacity-50"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-ink">
                <Volume2 className="h-4 w-4" />
              </span>
              {audioLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("cat.playAudio")
              )}
            </button>
          )}

          <div className="mt-6 space-y-2.5">
            {current.options.map((o) => (
              <OptionButton
                key={o}
                option={o}
                isPicked={picked === o}
                onSelect={onAnswer}
              />
            ))}
          </div>
        </div>
      )}
    </main>
  )
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, "0")}`
}
