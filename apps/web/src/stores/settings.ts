"use client"

import { create } from "zustand"
import { API_BASE_URL, authHeaders } from "@/lib/api"
import type {
  DisplayMode,
  DisplayModeMode,
  ExamType,
  LanguageCode,
  ThemeId,
} from "@/types"
import type { VoiceGender } from "@navia/utils"

export interface SettingsState {
  activeExamType: ExamType
  language: LanguageCode
  theme: ThemeId
  mode: "light" | "dark"
  locale: "en" | "id"
  fontSize: "sm" | "md" | "lg" | "xl"
  hanziSize: "md" | "lg" | "xl"
  displayMode: DisplayMode
  audioRate: number
  autoplayAudio: boolean
  soundEffects: boolean
  dailyGoalMin: number
  newWordsPerDay: number
  maxReviewsPerDay: number
  reduceMotion: boolean
  highContrast: boolean
  density: "comfortable" | "compact"
  focusMode: boolean
  dailyReminder: boolean
  reminderTime: string
  weeklySummary: boolean
  streakAlerts: boolean
  publicProfile: boolean
  showStats: boolean
  hiddenWidgets: string[]
  voiceGender: VoiceGender
  hydrated: boolean

  load: (data: Partial<SettingsState>) => void
  set: (
    patch: Partial<
      Omit<
        SettingsState,
        "set" | "toggleWidget" | "setDisplayMode" | "load" | "hydrated"
      >
    >
  ) => void
  toggleWidget: (id: string) => void
  setDisplayMode: (patch: Partial<DisplayMode>) => void
}

export function detectMode(): "light" | "dark" {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

export const showsPinyin = (mode: DisplayModeMode): boolean =>
  mode === "hanyu" || mode === "hanyu+trans" || mode === "all"

export const showsZhuyin = (mode: DisplayModeMode): boolean =>
  mode === "zhuyin" || mode === "zhuyin+trans" || mode === "all"

export const showsTranslation = (mode: DisplayModeMode): boolean =>
  mode === "hanyu+trans" || mode === "zhuyin+trans" || mode === "all"

export const DISPLAY_MODES: DisplayModeMode[] = [
  "hanyu+trans",
  "zhuyin+trans",
  "hanyu",
  "zhuyin",
  "all",
  "none",
]

/**
 * Display-mode options for pickers: "all" is pinned first, the rest are
 * sorted alphabetically by their localized label.
 */
export function orderedDisplayModes(
  label: (mode: DisplayModeMode) => string,
  locale: string
): DisplayModeMode[] {
  return [...DISPLAY_MODES].sort((a, b) => {
    if (a === "all") return -1
    if (b === "all") return 1
    return label(a).localeCompare(label(b), locale)
  })
}

export const THEMES: { id: ThemeId }[] = [
  { id: "bauhaus" },
  { id: "scholar" },
  { id: "ink" },
  { id: "jade" },
  { id: "midnight" },
  { id: "paper" },
  { id: "dusk" },
  { id: "focus" },
]

export const useSettings = create<SettingsState>()((set) => ({
  activeExamType: "hsk",
  language: "zh",
  theme: "bauhaus",
  mode: "light",
  locale: "en",
  fontSize: "md",
  hanziSize: "lg",
  displayMode: {
    script: "simplified",
    mode: "hanyu+trans",
    adaptiveByLevel: false,
    levelOverrides: {},
  },
  audioRate: 0.85,
  autoplayAudio: true,
  soundEffects: true,
  dailyGoalMin: 30,
  newWordsPerDay: 8,
  maxReviewsPerDay: 60,
  reduceMotion: false,
  highContrast: false,
  density: "comfortable",
  focusMode: false,
  dailyReminder: true,
  reminderTime: "19:00",
  weeklySummary: true,
  streakAlerts: true,
  publicProfile: false,
  showStats: true,
  hiddenWidgets: [],
  voiceGender: "female",
  hydrated: false,

  load: (data) => {
    suppressSync = true
    set((s) => ({
      ...s,
      ...data,
      hydrated: true,
    }))
  },

  set: (patch) => set(patch),

  toggleWidget: (id) =>
    set((s) => ({
      hiddenWidgets: s.hiddenWidgets.includes(id)
        ? s.hiddenWidgets.filter((w) => w !== id)
        : [...s.hiddenWidgets, id],
    })),

  setDisplayMode: (patch) =>
    set((s) => ({ displayMode: { ...s.displayMode, ...patch } })),
}))

const SYNC_DELAY = 2000
const CACHE_KEY = "navia-settings"
let syncTimer: ReturnType<typeof setTimeout> | null = null
let suppressSync = false
let lastSynced: string | null = null

function extractData(state: SettingsState) {
  const { hydrated: _, load: _l, ...data } = state
  return data
}

export function syncSettingsToServer(state: SettingsState) {
  if (!state.hydrated || suppressSync) return
  const data = extractData(state)
  const serialized = JSON.stringify(data)
  if (serialized === lastSynced) return
  lastSynced = serialized
  localStorage.setItem(CACHE_KEY, serialized)
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    fetch(`${API_BASE_URL}/api/v1/settings`, {
      method: "PUT",
      headers: authHeaders(),
      body: serialized,
    }).catch(() => {})
  }, SYNC_DELAY)
}

/** Re-arm syncing after a load and record the loaded state as the baseline. */
export function markSettingsSynced() {
  suppressSync = false
  lastSynced = JSON.stringify(extractData(useSettings.getState()))
}

export async function loadSettingsFromServer(): Promise<Partial<SettingsState> | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/settings`, {
      headers: authHeaders(),
    })
    if (!res.ok) return null
    const body = (await res.json()) as {
      data?: Partial<SettingsState> | null
      success?: boolean
    }
    return body.data ?? null
  } catch {
    return null
  }
}

export function loadSettingsFromCache(): Partial<SettingsState> | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null
    return JSON.parse(cached)
  } catch {
    return null
  }
}

export function clearSettingsCache() {
  localStorage.removeItem(CACHE_KEY)
}

export function subscribeSettings() {
  return useSettings.subscribe((state) => syncSettingsToServer(state))
}
