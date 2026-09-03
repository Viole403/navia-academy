"use client"

import { create } from "zustand"
import { API_BASE_URL, authHeaders, putWithAuthRetry } from "@/lib/api"
import type {
  AssessmentAttempt,
  LanguageCode,
  OnboardingData,
  PlacementResult,
  Skill,
  SrsCard,
  SrsGrade,
  SrsItemKind,
  StudySessionLog,
  StudyTask,
} from "@/types"
import { gradeCard, newCard } from "@/lib/srs"
import { todayISO } from "@/lib/utils"
import { ACHIEVEMENTS, hydrateAchievements } from "@/lib/achievements"
import { getLearningLanguage } from "@/lib/language-context"

export interface LessonProgress {
  lessonId: string
  step: number
  completed: boolean
  startedAt: string
  completedAt?: string
}

/**
 * Progress is scoped per learning language so switching between Chinese and
 * German/English/Japanese keeps each language's lessons, SRS cards, saved
 * words, difficult items and notes isolated.
 *
 * Maps are keyed by `LanguageCode` → item id. Legacy flat data (from before
 * multi-language) is migrated to `zh` on load.
 */
export interface ProgressState {
  xp: number
  streak: number
  bestStreak: number
  lastStudyDate: string | null
  startedAt: string | null
  onboarding: OnboardingData
  placement: PlacementResult | null
  lessons: Partial<Record<LanguageCode, Record<string, LessonProgress>>>
  srs: Partial<Record<LanguageCode, Record<string, SrsCard>>>
  sessions: Record<string, StudySessionLog>
  achievements: Record<string, string>
  tasks: StudyTask[]
  attempts: AssessmentAttempt[]
  savedWordIds: Partial<Record<LanguageCode, string[]>>
  difficultItemIds: Partial<Record<LanguageCode, string[]>>
  notes: Partial<Record<LanguageCode, Record<string, string>>>
  hydrated: boolean

  load: (data: Partial<ProgressState>) => void
  addXp: (amount: number) => void
  logStudy: (minutes: number, skill: Skill, xp?: number) => void
  setOnboarding: (patch: Partial<OnboardingData>) => void
  setPlacement: (r: PlacementResult) => void
  startLesson: (lessonId: string) => void
  setLessonStep: (lessonId: string, step: number) => void
  completeLesson: (lessonId: string, xp: number) => void
  ensureCard: (itemId: string, kind: SrsItemKind) => void
  reviewCard: (itemId: string, grade: SrsGrade) => void
  addTask: (t: StudyTask) => void
  updateTask: (id: string, patch: Partial<StudyTask>) => void
  removeTask: (id: string) => void
  addAttempt: (a: AssessmentAttempt) => void
  toggleSaved: (wordId: string) => void
  toggleDifficult: (itemId: string) => void
  setNote: (itemId: string, note: string) => void
  unlockAchievements: () => Promise<string[]>
  levelFromXp: () => number
  resetAll: () => void
}

function updateStreak(state: ProgressState): Partial<ProgressState> {
  const today = todayISO()
  if (state.lastStudyDate === today) return {}
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yISO = yesterday.toISOString().slice(0, 10)
  const streak = state.lastStudyDate === yISO ? state.streak + 1 : 1
  return {
    streak,
    bestStreak: Math.max(streak, state.bestStreak),
    lastStudyDate: today,
    startedAt: state.startedAt ?? new Date().toISOString(),
  }
}

const initialOnboarding: OnboardingData = { completed: false, step: 0 }

const LANG_CODES: LanguageCode[] = ["zh", "de", "en", "ja"]

function nestMap<T>(
  v?: Record<string, T> | Record<string, Record<string, T>>
): Record<string, Record<string, T>> {
  if (!v || typeof v !== "object") return {}
  const keys = Object.keys(v)
  if (keys.length === 0) return {}
  if (keys.some((k) => (LANG_CODES as string[]).includes(k))) {
    return v as Record<string, Record<string, T>>
  }
  return { zh: v as Record<string, T> }
}

function nestArray(
  v?: string[] | Record<string, string[]>
): Record<string, string[]> {
  if (!v) return {}
  if (Array.isArray(v)) return { zh: v }
  return v as Record<string, string[]>
}

function normalizeProgressData(
  data: Partial<ProgressState>
): Partial<ProgressState> {
  return {
    ...data,
    lessons: nestMap(data.lessons as never),
    srs: nestMap(data.srs as never),
    notes: nestMap(data.notes as never),
    savedWordIds: nestArray(data.savedWordIds as never),
    difficultItemIds: nestArray(data.difficultItemIds as never),
  }
}

export const useProgress = create<ProgressState>()((set, get) => ({
  xp: 0,
  streak: 0,
  bestStreak: 0,
  lastStudyDate: null,
  startedAt: null,
  onboarding: initialOnboarding,
  placement: null,
  lessons: {},
  srs: {},
  sessions: {},
  achievements: {},
  tasks: [],
  attempts: [],
  savedWordIds: {},
  difficultItemIds: {},
  notes: {},
  hydrated: false,

  load: (data) => {
    suppressSync = true
    set((s) => ({
      ...s,
      ...normalizeProgressData(data),
      hydrated: true,
    }))
  },

  addXp: (amount) => set((s) => ({ xp: s.xp + amount })),

  logStudy: (minutes, skill, xp = 0) =>
    set((s) => {
      const today = todayISO()
      const existing = s.sessions[today] ?? {
        date: today,
        minutes: 0,
        xp: 0,
        skills: {},
      }
      const log: StudySessionLog = {
        ...existing,
        minutes: existing.minutes + minutes,
        xp: existing.xp + xp,
        skills: {
          ...existing.skills,
          [skill]: (existing.skills[skill] ?? 0) + minutes,
        },
      }
      return {
        sessions: { ...s.sessions, [today]: log },
        xp: s.xp + xp,
        ...updateStreak(s),
      }
    }),

  setOnboarding: (patch) =>
    set((s) => ({ onboarding: { ...s.onboarding, ...patch } })),

  setPlacement: (r) => set({ placement: r }),

  startLesson: (lessonId) =>
    set((s) => {
      const lang = getLearningLanguage()
      const bucket = s.lessons[lang] ?? {}
      return {
        lessons: {
          ...s.lessons,
          [lang]: {
            ...bucket,
            [lessonId]: bucket[lessonId] ?? {
              lessonId,
              step: 0,
              completed: false,
              startedAt: new Date().toISOString(),
            },
          },
        },
      }
    }),

  setLessonStep: (lessonId, step) =>
    set((s) => {
      const lang = getLearningLanguage()
      const bucket = s.lessons[lang] ?? {}
      return {
        lessons: {
          ...s.lessons,
          [lang]: {
            ...bucket,
            [lessonId]: {
              ...(bucket[lessonId] ?? {
                lessonId,
                completed: false,
                startedAt: new Date().toISOString(),
              }),
              step,
            },
          },
        },
      }
    }),

  completeLesson: (lessonId, xp) =>
    set((s) => {
      const lang = getLearningLanguage()
      const bucket = s.lessons[lang] ?? {}
      return {
        lessons: {
          ...s.lessons,
          [lang]: {
            ...bucket,
            [lessonId]: {
              ...(bucket[lessonId] ?? {
                lessonId,
                step: 0,
                startedAt: new Date().toISOString(),
              }),
              completed: true,
              completedAt: new Date().toISOString(),
            },
          },
        },
        xp: s.xp + xp,
        ...updateStreak(s),
      }
    }),

  ensureCard: (itemId, kind) =>
    set((s) => {
      const lang = getLearningLanguage()
      const bucket = s.srs[lang] ?? {}
      return bucket[itemId]
        ? {}
        : {
            srs: {
              ...s.srs,
              [lang]: { ...bucket, [itemId]: newCard(itemId, kind) },
            },
          }
    }),

  reviewCard: (itemId, grade) =>
    set((s) => {
      const lang = getLearningLanguage()
      const bucket = s.srs[lang] ?? {}
      const card = bucket[itemId]
      if (!card) return {}
      return {
        srs: {
          ...s.srs,
          [lang]: { ...bucket, [itemId]: gradeCard(card, grade) },
        },
      }
    }),

  addTask: (t) => set((s) => ({ tasks: [...s.tasks, t] })),
  updateTask: (id, patch) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),
  removeTask: (id) =>
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

  addAttempt: (a) => set((s) => ({ attempts: [...s.attempts, a] })),

  toggleSaved: (wordId) =>
    set((s) => {
      const lang = getLearningLanguage()
      const arr = s.savedWordIds[lang] ?? []
      return {
        savedWordIds: {
          ...s.savedWordIds,
          [lang]: arr.includes(wordId)
            ? arr.filter((w) => w !== wordId)
            : [...arr, wordId],
        },
      }
    }),

  toggleDifficult: (itemId) =>
    set((s) => {
      const lang = getLearningLanguage()
      const arr = s.difficultItemIds[lang] ?? []
      return {
        difficultItemIds: {
          ...s.difficultItemIds,
          [lang]: arr.includes(itemId)
            ? arr.filter((w) => w !== itemId)
            : [...arr, itemId],
        },
      }
    }),

  setNote: (itemId, note) =>
    set((s) => {
      const lang = getLearningLanguage()
      return {
        notes: {
          ...s.notes,
          [lang]: { ...(s.notes[lang] ?? {}), [itemId]: note },
        },
      }
    }),

  unlockAchievements: async () => {
    await hydrateAchievements()
    const s = get()
    const unlocked: string[] = []
    const totalMinutes = Object.values(s.sessions).reduce(
      (a, l) => a + l.minutes,
      0
    )
    const allSrs = Object.values(s.srs).flatMap((m) => Object.values(m))
    const allLessons = Object.values(s.lessons).flatMap((m) => Object.values(m))
    const wordsLearned = allSrs.filter(
      (c) => c.kind === "word" && c.mastery >= 30
    ).length
    const charsLearned = allSrs.filter(
      (c) => c.kind === "character" && c.mastery >= 30
    ).length
    const lessonsDone = allLessons.filter((l) => l.completed).length
    const examsPassed = s.attempts.filter((a) => a.score >= 60).length

    const metrics: Record<string, number> = {
      lessons: lessonsDone,
      streak: s.streak,
      words: wordsLearned,
      characters: charsLearned,
      hours: Math.floor(totalMinutes / 60),
      exams: examsPassed,
      xp: s.xp,
      perfectExams: s.attempts.filter((a) => a.score >= 100).length,
      examTypes: new Set(
        s.attempts
          .filter((a) => a.score >= 60)
          .map((a) => a.assessmentId.split("-")[0])
      ).size,
    }

    const next = { ...s.achievements }
    for (const a of ACHIEVEMENTS) {
      if (next[a.id]) continue
      const v = metrics[a.condition.type]
      if (v !== undefined && v >= a.condition.value) {
        next[a.id] = new Date().toISOString()
        unlocked.push(a.id)
      }
    }
    if (unlocked.length > 0) {
      const bonus = unlocked.reduce(
        (acc, id) => acc + (ACHIEVEMENTS.find((x) => x.id === id)?.xp ?? 0),
        0
      )
      set({ achievements: next, xp: s.xp + bonus })
    }
    return unlocked
  },

  levelFromXp: () => Math.floor(Math.sqrt(get().xp / 50)) + 1,

  resetAll: () =>
    set({
      xp: 0,
      streak: 0,
      bestStreak: 0,
      lastStudyDate: null,
      startedAt: null,
      onboarding: initialOnboarding,
      placement: null,
      lessons: {},
      srs: {},
      sessions: {},
      achievements: {},
      tasks: [],
      attempts: [],
      savedWordIds: {},
      difficultItemIds: {},
      notes: {},
      hydrated: true,
    }),
}))

const SYNC_DELAY = 2000
const CACHE_KEY = "navia-progress"
const PENDING_KEY = "navia-progress-pending"
let syncTimer: ReturnType<typeof setTimeout> | null = null
let suppressSync = false
let lastSynced: string | null = null
let pendingSync = false
const syncListeners = new Set<() => void>()

// Restore the pending flag across reloads so a queued sync isn't forgotten
// if the tab closes mid-offline.
try {
  if (localStorage.getItem(PENDING_KEY)) pendingSync = true
} catch {
  /* storage unavailable — start clean */
}

function notifySyncListeners() {
  syncListeners.forEach((fn) => fn())
}

function setPendingSync(value: boolean) {
  if (pendingSync === value) return
  pendingSync = value
  try {
    if (value) localStorage.setItem(PENDING_KEY, "1")
    else localStorage.removeItem(PENDING_KEY)
  } catch {
    /* storage unavailable — memory flag is enough */
  }
  notifySyncListeners()
}

/** Whether progress changes are queued locally waiting to reach the server. */
export function hasPendingSync(): boolean {
  return pendingSync
}

/** Subscribe to pending-sync changes (returns an unsubscribe function). */
export function subscribePendingSync(fn: () => void): () => void {
  syncListeners.add(fn)
  return () => syncListeners.delete(fn)
}

function extractData(state: ProgressState) {
  const { hydrated: _, load: _l, ...data } = state
  return data
}

export function syncProgressToServer(state: ProgressState) {
  if (!state.hydrated || suppressSync) return
  const data = extractData(state)
  const serialized = JSON.stringify(data)
  if (serialized === lastSynced) return
  lastSynced = serialized
  localStorage.setItem(CACHE_KEY, serialized)
  setPendingSync(true)
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(async () => {
    if (await putWithAuthRetry("/api/v1/progress", serialized))
      setPendingSync(false)
  }, SYNC_DELAY)
}

/** Force a sync attempt regardless of whether the serialized state changed. */
export function retryProgressSync() {
  if (!pendingSync) return
  const state = useProgress.getState()
  if (!state.hydrated || suppressSync) return
  const serialized = JSON.stringify(extractData(state))
  putWithAuthRetry("/api/v1/progress", serialized).then((ok) => {
    if (ok) {
      setPendingSync(false)
      lastSynced = serialized
    }
  })
}

/** Re-arm syncing after a load and record the loaded state as the baseline. */
export function markProgressSynced() {
  suppressSync = false
  lastSynced = JSON.stringify(extractData(useProgress.getState()))
  setPendingSync(false)
}

export async function loadProgressFromServer(): Promise<Partial<ProgressState> | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/progress`, {
      headers: authHeaders(),
    })
    if (!res.ok) return null
    const body = (await res.json()) as {
      data?: Partial<ProgressState> | null
      success?: boolean
    }
    return body.data ?? null
  } catch {
    return null
  }
}

export function loadProgressFromCache(): Partial<ProgressState> | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null
    return JSON.parse(cached)
  } catch {
    return null
  }
}

export function clearProgressCache() {
  localStorage.removeItem(CACHE_KEY)
}

export function subscribeProgress() {
  return useProgress.subscribe((state) => syncProgressToServer(state))
}

// Language-scoped accessors
// Pages read the active language's slice so aggregates never mix languages.

// Stable empty references so `getSnapshot` selectors stay referentially
// stable while a language key is absent — Zustand v5 warns/crashes with
// "Maximum update depth exceeded" when a selector returns a fresh reference
// on every snapshot (e.g. `savedWordIds[lang] ?? []`).
const EMPTY_LESSONS: Record<string, LessonProgress> = Object.freeze({})
const EMPTY_SRS: Record<string, SrsCard> = Object.freeze({})
const EMPTY_IDS: readonly string[] = Object.freeze([])
const EMPTY_NOTES: Record<string, string> = Object.freeze({})

export function lessonsFor(
  state: ProgressState,
  lang: LanguageCode
): Record<string, LessonProgress> {
  return state.lessons[lang] ?? EMPTY_LESSONS
}

export function srsFor(
  state: ProgressState,
  lang: LanguageCode
): Record<string, SrsCard> {
  return state.srs[lang] ?? EMPTY_SRS
}

export function savedFor(
  state: ProgressState,
  lang: LanguageCode
): readonly string[] {
  return state.savedWordIds[lang] ?? EMPTY_IDS
}

export function difficultFor(
  state: ProgressState,
  lang: LanguageCode
): readonly string[] {
  return state.difficultItemIds[lang] ?? EMPTY_IDS
}

export function notesFor(
  state: ProgressState,
  lang: LanguageCode
): Record<string, string> {
  return state.notes[lang] ?? EMPTY_NOTES
}
