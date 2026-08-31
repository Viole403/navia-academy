import { useEffect, useState } from "react"
import type { ExamType } from "@/types"
import { loadExamCards, type ExamCardDef } from "@/lib/data-client"

export type { ExamCardDef } from "@/lib/data-client"

type Listener = () => void
const listeners = new Set<Listener>()

export const EXAM_CARDS: ExamCardDef[] = []

let hydratePromise: Promise<ExamCardDef[]> | null = null

function notify() {
  for (const l of listeners) l()
}

function setData(data: ExamCardDef[]) {
  EXAM_CARDS.length = 0
  EXAM_CARDS.push(...data)
  notify()
}

export function hydrateExamCards(): Promise<ExamCardDef[]> {
  if (hydratePromise) return hydratePromise
  hydratePromise = loadExamCards()
    .then((data) => {
      setData(data)
      return data
    })
    .catch((err) => {
      hydratePromise = null
      throw err
    })
  return hydratePromise
}

export function subscribeExamCards(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useExamCards(): ExamCardDef[] {
  const [snapshot, setSnapshot] = useState<ExamCardDef[]>(EXAM_CARDS.slice())

  useEffect(() => {
    hydrateExamCards().catch(() => {})
    const unsubscribe = subscribeExamCards(() =>
      setSnapshot(EXAM_CARDS.slice())
    )
    return unsubscribe
  }, [])

  return snapshot
}

if (typeof window !== "undefined") {
  void hydrateExamCards().catch(() => {})
}

export function examCardById(id: string): ExamCardDef | undefined {
  return EXAM_CARDS.find((c) => c.id === id)
}

export function examCardByTypeLevel(
  examType: ExamType,
  level: string
): ExamCardDef | undefined {
  return EXAM_CARDS.find((c) => c.examType === examType && c.level === level)
}

export function examCardsByType(examType: ExamType): ExamCardDef[] {
  return EXAM_CARDS.filter((c) => c.examType === examType)
}
