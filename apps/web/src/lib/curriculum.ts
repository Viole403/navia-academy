import { useEffect, useState } from "react"
import type { Course, Level, Unit, Lesson } from "@/types"
import { loadCurriculum, type CurriculumBundle } from "@/lib/data-client"
import { makeHydrator } from "@/lib/data-hydrator"

/**
 * Curriculum data sourced from the cache-first data client (R2/CDN), hydrated
 * into a small in-memory store that keeps a sync API for consumers while
 * loading from the CDN at runtime.
 *
 * Use `useCurriculum()` in React components for a guaranteed re-render once the
 * bundle arrives. Sync helpers read the current snapshot (empty until hydrated).
 */

type Listener = () => void

const listeners = new Set<Listener>()

const EMPTY: CurriculumBundle = {
  course: {} as Course,
  levels: [],
  units: [],
  lessons: [],
}

// Mutable in-place store so const bindings stay valid after CDN hydration.
export const COURSE: Course = EMPTY.course
export const LEVELS: Level[] = []
export const UNITS: Unit[] = []
export const LESSONS: Lesson[] = []

function notify() {
  for (const l of listeners) l()
}

function setData(data: CurriculumBundle | null) {
  // Handle null/missing curriculum data gracefully (for languages without curriculum yet)
  if (!data || !data.course) {
    console.warn(
      "[curriculum] No curriculum data available for current language"
    )
    return
  }
  Object.assign(COURSE, data.course)
  LEVELS.length = 0
  LEVELS.push(...(data.levels || []))
  UNITS.length = 0
  UNITS.push(...(data.units || []))
  LESSONS.length = 0
  LESSONS.push(...(data.lessons || []))
  notify()
}

/** Load curriculum for the active learning language and hydrate the store. */
export const hydrateCurriculum = makeHydrator<CurriculumBundle>(
  loadCurriculum,
  setData
)

export function getCurriculum(): CurriculumBundle {
  return { course: COURSE, levels: LEVELS, units: UNITS, lessons: LESSONS }
}

export function subscribeCurriculum(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** React hook: subscribes to the store and returns curriculum once hydrated. */
export function useCurriculum(): CurriculumBundle {
  const [snapshot, setSnapshot] = useState<CurriculumBundle>(getCurriculum())

  useEffect(() => {
    hydrateCurriculum().catch(() => {
      // non-fatal
    })
    const unsubscribe = subscribeCurriculum(() => setSnapshot(getCurriculum()))
    return unsubscribe
  }, [])

  return snapshot
}

// Auto-hydrate on the client so page renders after mount get data.
if (typeof window !== "undefined") {
  void hydrateCurriculum().catch(() => {
    // non-fatal: consumers fall back to empty state until next load
  })
}

// ─── Sync helpers (read current snapshot) ──────────────────────────────

export function lessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id)
}
export function unitById(id: string): Unit | undefined {
  return UNITS.find((u) => u.id === id)
}
export function levelById(id: string): Level | undefined {
  return LEVELS.find((l) => l.id === id)
}
export function lessonsOfUnit(unitId: string): Lesson[] {
  return LESSONS.filter((l) => l.unitId === unitId).sort(
    (a, b) => a.order - b.order
  )
}
