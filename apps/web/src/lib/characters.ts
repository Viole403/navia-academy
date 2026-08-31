import { useEffect, useState } from "react"
import type { ExamType, HanziChar } from "@/types"
import { loadCharacters } from "@/lib/data-client"
import { makeHydrator } from "@/lib/data-hydrator"

type Listener = () => void

const listeners = new Set<Listener>()

export const CHARACTERS: HanziChar[] = []
export const CHARACTERS_BY_EXAM: Record<ExamType, HanziChar[]> = {
  hsk: [],
  tocfl: [],
  goethe: [],
  jlpt: [],
  toefl: [],
}

function notify() {
  for (const l of listeners) l()
}

function setData(data: HanziChar[]) {
  CHARACTERS.length = 0
  CHARACTERS.push(...data)
  for (const exam of Object.keys(CHARACTERS_BY_EXAM) as ExamType[]) {
    const bucket = CHARACTERS_BY_EXAM[exam]
    bucket.length = 0
    bucket.push(...data.filter((c) => Boolean(c.examMappings?.[exam])))
  }
  notify()
}

/** Load characters for the active learning language and hydrate the store. */
export const hydrateCharacters = makeHydrator<HanziChar[]>(
  loadCharacters,
  setData
)

export function getCharacters(): HanziChar[] {
  return CHARACTERS
}

export function subscribeCharacters(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useCharacters(): HanziChar[] {
  const [snapshot, setSnapshot] = useState<HanziChar[]>(CHARACTERS.slice())

  useEffect(() => {
    hydrateCharacters().catch(() => {})
    const unsubscribe = subscribeCharacters(() =>
      setSnapshot(CHARACTERS.slice())
    )
    return unsubscribe
  }, [])

  return snapshot
}

if (typeof window !== "undefined") {
  void hydrateCharacters().catch(() => {})
}

export function charById(id: string): HanziChar | undefined {
  return CHARACTERS.find((c) => c.id === id)
}

export function charByExam(examType: ExamType): HanziChar[] {
  return CHARACTERS_BY_EXAM[examType]
}
