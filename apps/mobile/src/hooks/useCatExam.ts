import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  DEFAULT_ELO,
  MAX_QUESTIONS,
  MIN_QUESTIONS,
  cefrBandOf,
  eloOf,
  eloSd,
  eloUpdate,
  pickLeastUsedFormat,
  pickNext,
  recommendedLevel,
  shouldStop,
  weakBandsOf,
} from "@navia/utils"
import type { CatItemFormat } from "@navia/utils"

import { storage } from "@/utils/storage"
import type { VocabWord } from "@/types/api"

/**
 * The adaptive exam, running the same engine the web session runs.
 *
 * This replaces a band walk that stepped through placement bands 1→6 and
 * submitted `band * 100` as the rating under the `elo-v1` engine version. The
 * field names matched and nothing else did: the same answers produced a
 * different rating depending on which device gave them, and the label claimed an
 * engine that was not there.
 *
 * The maths lives in `@navia/utils` rather than here, because the web session
 * and the Go backend that recomputes the rating have to agree with it exactly.
 */

export type { CatItemFormat }

export interface CatItem {
  word: VocabWord
  elo: number
  prompt: string
  romanization: string
  options: string[]
  correctAnswer: string
  stimulusType: "text" | "audio"
  audioText?: string
  format: CatItemFormat
}

export interface CatAnswerLog {
  wordId: string
  elo: number
  correct: boolean
  /** Format at answer time, so a resumed session replays the same rotation. */
  format: CatItemFormat
}

export interface CatResult {
  eloEstimate: number
  eloSd: number
  cefrBand: string
  answered: number
  correct: number
  recommendedLevel: string
  weakBands: string[]
}

export interface CatResume {
  startTheta: number
  answers: CatAnswerLog[]
}

const LAST_ELO_KEY = "navia-cat-last-elo"

/**
 * The learner's last rating, so a new session warm-starts near where they left
 * off instead of at the default and re-earning twenty questions to get back.
 */
async function readLastElo(): Promise<number | undefined> {
  const raw = await storage.getItem(LAST_ELO_KEY)
  if (raw === null) return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

const romanOf = (w: VocabWord): string =>
  w.pinyin ?? w.pronunciation?.[0] ?? w.translation
const scriptOf = (w: VocabWord): string => w.hanzi ?? w.text ?? ""

/**
 * The three formats all derive from the same item; rotating the format measures
 * recognition, listening and reading rather than twenty meaning questions.
 *
 * - meaning:   reading shown, pick the script
 * - listening: audio only, pick the script
 * - reading:   script shown, pick the reading
 */
function buildItem(
  word: VocabWord,
  elo: number,
  format: CatItemFormat,
  wrong: VocabWord[],
  shuffle: <T>(a: T[]) => T[]
): CatItem {
  const script = scriptOf(word)
  const roman = romanOf(word)
  const wrongScript = wrong.map(scriptOf)
  const wrongRoman = wrong.map(romanOf)

  if (format === "reading") {
    return {
      word,
      elo,
      prompt: script,
      romanization: roman,
      stimulusType: "text",
      options: shuffle([roman, ...wrongRoman]),
      correctAnswer: roman,
      format,
    }
  }
  if (format === "listening") {
    return {
      word,
      elo,
      prompt: "",
      romanization: roman,
      stimulusType: "audio",
      audioText: script,
      options: shuffle([script, ...wrongScript]),
      correctAnswer: script,
      format,
    }
  }
  return {
    word,
    elo,
    prompt: roman,
    romanization: roman,
    stimulusType: "text",
    options: shuffle([script, ...wrongScript]),
    correctAnswer: script,
    format,
  }
}

function makeResult(
  theta: number,
  log: CatAnswerLog[],
  answered: number,
  examType: string
): CatResult {
  return {
    eloEstimate: theta,
    eloSd: eloSd(answered),
    cefrBand: cefrBandOf(theta).name,
    answered,
    correct: log.filter((a) => a.correct).length,
    recommendedLevel: recommendedLevel(examType, theta),
    weakBands: weakBandsOf(log),
  }
}

function shuffleOf<T>(array: T[]): T[] {
  const out = [...array]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function useCatExam(
  words: VocabWord[],
  examType: string,
  priorElo?: number,
  resumeRef?: { current: CatResume | null }
) {
  // The stored rating is read asynchronously, so it cannot seed this directly.
  // It arrives below and is applied only while the learner has not started, or
  // the estimate would move under them mid-question.
  const [theta, setTheta] = useState(priorElo ?? DEFAULT_ELO)
  const [storedElo, setStoredElo] = useState<number | undefined>(undefined)
  const [current, setCurrent] = useState<CatItem | null>(null)
  const [log, setLog] = useState<CatAnswerLog[]>([])
  const [done, setDone] = useState(false)
  const [result, setResult] = useState<CatResult | null>(null)

  const usedIds = useRef(new Set<string>())
  useEffect(() => {
    let cancelled = false
    readLastElo().then((stored) => {
      if (!cancelled) setStoredElo(stored)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const thetaRef = useRef(theta)
  const logRef = useRef<CatAnswerLog[]>([])
  const formatHistoryRef = useRef<CatItemFormat[]>([])
  const resumeStateRef = useRef(resumeRef)
  const examTypeRef = useRef(examType)
  examTypeRef.current = examType

  const items = useMemo(
    () =>
      words
        .map((w) => ({ id: w.id, word: w, elo: eloOf(w) }))
        .sort((a, b) => a.elo - b.elo),
    [words]
  )

  const finish = useCallback((finalTheta: number, logRef2: CatAnswerLog[]) => {
    setResult(
      makeResult(finalTheta, logRef2, logRef2.length, examTypeRef.current)
    )
    setDone(true)
  }, [])

  const pick = useCallback(
    (t: number) => {
      const item = pickNext(
        items.map((i) => ({ id: i.id, elo: i.elo })),
        t,
        usedIds.current
      )
      if (!item) {
        finish(t, logRef.current)
        return
      }
      const full = items.find((i) => i.id === item.id)
      if (!full) {
        finish(t, logRef.current)
        return
      }
      usedIds.current.add(item.id)
      const format = pickLeastUsedFormat(formatHistoryRef.current)
      formatHistoryRef.current.push(format)
      const wrong = shuffleOf(items.filter((i) => i.id !== item.id))
        .slice(0, 3)
        .map((i) => i.word)
      setCurrent(buildItem(full.word, item.elo, format, wrong, shuffleOf))
    },
    [items, finish]
  )

  // Applied once the stored value lands, and only before the first question.
  useEffect(() => {
    if (storedElo === undefined) return
    if (priorElo !== undefined) return
    if (logRef.current.length > 0) return
    thetaRef.current = storedElo
    setTheta(storedElo)
  }, [storedElo, priorElo])

  const start = useCallback(() => {
    usedIds.current.clear()
    formatHistoryRef.current = []
    const r = resumeStateRef.current?.current
    let t: number
    if (r && r.answers.length > 0) {
      // Replay rather than trust a snapshot: re-deriving from the start theta
      // and the answer log means a resume is correct under any later change to
      // the engine.
      t = r.startTheta
      for (let i = 0; i < r.answers.length; i++) {
        const a = r.answers[i]
        t = eloUpdate(t, a.elo, a.correct, i)
        usedIds.current.add(a.wordId)
        formatHistoryRef.current.push(a.format)
      }
      logRef.current = r.answers
      setLog(r.answers)
    } else {
      // The stored rating is already in state by the time a learner can press
      // start; reading it again here would mean awaiting inside a sync callback.
      t = priorElo ?? storedElo ?? DEFAULT_ELO
      logRef.current = []
      setLog([])
    }
    thetaRef.current = t
    setTheta(t)
    setDone(false)
    setResult(null)
    pick(t)
  }, [priorElo, pick, storedElo])

  const answer = useCallback(
    (option: string) => {
      if (!current || done) return
      const correct = option === current.correctAnswer
      const nextTheta = eloUpdate(
        thetaRef.current,
        current.elo,
        correct,
        logRef.current.length
      )
      const newLog = [
        ...logRef.current,
        {
          wordId: current.word.id,
          elo: current.elo,
          correct,
          format: current.format,
        },
      ]
      logRef.current = newLog
      void storage.setItem(LAST_ELO_KEY, String(Math.round(nextTheta)))
      thetaRef.current = nextTheta
      setLog(newLog)
      setTheta(nextTheta)
      setCurrent(null)

      if (shouldStop(newLog.length, usedIds.current.size >= items.length)) {
        finish(nextTheta, newLog)
      } else {
        pick(nextTheta)
      }
    },
    [current, done, items.length, finish, pick]
  )

  return {
    current,
    theta,
    log,
    done,
    result,
    start,
    answer,
    minQuestions: MIN_QUESTIONS,
    maxQuestions: MAX_QUESTIONS,
  }
}
