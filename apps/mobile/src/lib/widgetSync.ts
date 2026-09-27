/**
 * What a widget shows, as pure functions: dates in, flags out. Kept out of the hook
 * so the logic is testable without a theme, a store or the network.
 */

import { buildWidgetPayload, type WidgetPayload } from "./widget"

const WEEK_DAYS = 7

export function localDateKey(d: Date): string {
  // Local, not UTC: a UTC day key flips "did I study today" for half the planet.
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/**
 * The last seven days as booleans, oldest first.
 *
 * A day counts as studied when any session falls on it, which is why this reads
 * the session list rather than inferring from the streak: the streak is a
 * running total that survives a missed day, and the strip has to show the miss.
 */
export function buildRecentWeek(
  sessions: { date: string; minutes: number }[],
  now: Date = new Date()
): boolean[] {
  const byDay = new Set<string>()
  for (const s of sessions) {
    if (s.minutes > 0) byDay.add(s.date.slice(0, 10))
  }
  const out: boolean[] = []
  for (let i = WEEK_DAYS - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    out.push(byDay.has(localDateKey(d)))
  }
  return out
}

/** Minutes studied today, by the learner's own calendar. */
export function minutesToday(
  sessions: { date: string; minutes: number }[],
  now: Date = new Date()
): number {
  const today = localDateKey(now)
  return sessions
    .filter((s) => s.date.slice(0, 10) === today)
    .reduce((sum, s) => sum + (s.minutes || 0), 0)
}

/** Whether anything was studied today, which is what protects the streak. */
export function studiedToday(
  sessions: { date: string; minutes: number }[],
  now: Date = new Date()
): boolean {
  return minutesToday(sessions, now) > 0
}

export interface WidgetSyncInput {
  streak: number
  bestStreak: number
  sessions: { date: string; minutes: number }[]
  due: number | null
  dailyGoalMinutes: number
  locale: string
  themeId: string
  colors: { bg: string; text: string; accent: string; textMuted: string }
  now?: number
}

export function assembleWidgetPayload(input: WidgetSyncInput): WidgetPayload {
  const now = input.now ? new Date(input.now) : new Date()
  return buildWidgetPayload({
    streak: input.streak,
    bestStreak: input.bestStreak,
    studiedToday: studiedToday(input.sessions, now),
    due: input.due,
    minutesToday: minutesToday(input.sessions, now),
    dailyGoalMinutes: input.dailyGoalMinutes,
    recent: buildRecentWeek(input.sessions, now),
    locale: input.locale,
    themeId: input.themeId,
    colors: input.colors,
    now: input.now,
  })
}
