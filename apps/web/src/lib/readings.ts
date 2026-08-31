import { useEffect, useState } from "react"
import type { ExamType, Reading } from "@/types"
import { loadReadings } from "@/lib/data-client"
import { makeHydrator } from "@/lib/data-hydrator"

type Listener = () => void

const listeners = new Set<Listener>()

export const READINGS: Reading[] = []
export const READINGS_BY_EXAM: Record<ExamType, Reading[]> = {
  hsk: [],
  tocfl: [],
  goethe: [],
  jlpt: [],
  toefl: [],
}

function notify() {
  for (const l of listeners) l()
}

function setData(data: Reading[]) {
  READINGS.length = 0
  READINGS.push(...data)
  for (const exam of Object.keys(READINGS_BY_EXAM) as ExamType[]) {
    const bucket = READINGS_BY_EXAM[exam]
    bucket.length = 0
    bucket.push(...data.filter((r) => Boolean(r.examMappings?.[exam])))
  }
  notify()
}

/** Load readings for the active learning language and hydrate the store. */
export const hydrateReadings = makeHydrator<Reading[]>(loadReadings, setData)

export function getReadings(): Reading[] {
  return READINGS
}

export function subscribeReadings(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useReadings(): Reading[] {
  const [snapshot, setSnapshot] = useState<Reading[]>(READINGS.slice())

  useEffect(() => {
    hydrateReadings().catch(() => {})
    const unsubscribe = subscribeReadings(() => setSnapshot(READINGS.slice()))
    return unsubscribe
  }, [])

  return snapshot
}

if (typeof window !== "undefined") {
  void hydrateReadings().catch(() => {})
}

export function readingById(id: string): Reading | undefined {
  return READINGS.find((r) => r.id === id)
}

export function readingByExam(examType: ExamType): Reading[] {
  return READINGS_BY_EXAM[examType]
}
