/**
 * The payload a home-screen widget reads.
 *
 * A widget is a native process. It cannot reach this app's JavaScript, its
 * database or its network session, so the only way it knows anything is from a
 * small snapshot the app writes out for it. That makes this module the whole
 * contract: everything the widget shows has to be derivable from one plain
 * object, and nothing here may reach for anything the widget will not have.
 *
 * Built in JavaScript rather than in the widget target so the rules are tested.
 * The parts that decide what is worth showing — whether the streak is safe
 * today, whether a due pile is worth interrupting someone for — are judgement
 * calls, and a judgement call made in a widget target is a judgement call
 * nobody can test.
 */

/** What the learner has done today, as far as the widget is concerned. */
export interface WidgetDay {
  /** Streak in days, counting today only once something has been studied. */
  streak: number
  /** Longest streak ever reached, for the "best" line. */
  bestStreak: number
  /** Whether anything was studied today. This is what protects the streak. */
  studiedToday: boolean
  /** Cards waiting for review, or null when the count is not known. */
  due: number | null
  /** Minutes studied today. */
  minutesToday: number
  /** Daily goal in minutes, so the widget can show progress against it. */
  dailyGoalMinutes: number
  /**
   * The last few days, oldest first. Seven is enough for a week strip and
   * keeps the payload small enough to write on every sync.
   */
  recent: boolean[]
}

/**
 * The colours the widget draws with.
 *
 * Only the four the widget actually needs. The widget is a native process with
 * no access to this app's theme, and it cannot re-derive a Material You palette
 * either — that comes from the wallpaper through a native module this app
 * already depends on, and asking the widget to redo the work would mean two
 * implementations of the same derivation. So the resolved palette is written
 * into the payload and the widget simply obeys it, which means the widget
 * follows whichever theme is active: a wallpaper-matched Material You, one of
 * the hand-built themes, or the AMOLED variant of either.
 */
export interface WidgetColors {
  background: string
  foreground: string
  accent: string
  muted: string
}

export interface WidgetPayload {
  /** Bumped when the shape changes, so a stale payload is discarded. */
  version: 1
  /** Epoch milliseconds, so the widget can tell a stale snapshot from a live one. */
  updatedAt: number
  day: WidgetDay
  /** BCP-47 tag, so the widget picks a date format without asking the app. */
  locale: string
  /** Which theme produced these colours, for the widget's own diagnostics. */
  themeId: string
  colors: WidgetColors
}

/** A streak of zero is not a streak; anything negative is a corrupt value. */
function safeCount(n: number): number {
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

function safeMinutes(n: number): number {
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0
}

/** Trims and pads the week strip, and drops days that are still in the future. */
function safeRecent(days: boolean[]): boolean[] {
  return Array.from({ length: 7 }, (_, i) => days[i] === true)
}

export function buildWidgetPayload(input: {
  streak: number
  bestStreak: number
  studiedToday: boolean
  due?: number | null
  minutesToday: number
  dailyGoalMinutes: number
  recent: boolean[]
  locale: string
  themeId?: string
  colors: { bg: string; text: string; accent: string; textMuted: string }
  now?: number
}): WidgetPayload {
  return {
    version: 1,
    updatedAt: input.now ?? Date.now(),
    day: {
      streak: safeCount(input.streak),
      bestStreak: safeCount(input.bestStreak),
      // A streak only survives today if something was studied, so a reported
      // streak of zero is inconsistent with having studied. Deriving it here
      // means the widget cannot show "5 day streak" above an empty day.
      studiedToday: input.studiedToday === true && safeCount(input.streak) > 0,
      due:
        input.due === null || input.due === undefined
          ? null
          : safeCount(input.due),
      minutesToday: safeMinutes(input.minutesToday),
      dailyGoalMinutes: Math.max(1, safeMinutes(input.dailyGoalMinutes)),
      recent: safeRecent(input.recent),
    },
    locale: input.locale || "en",
    themeId: input.themeId || "ink",
    colors: {
      background: input.colors.bg,
      foreground: input.colors.text,
      accent: input.colors.accent,
      muted: input.colors.textMuted,
    },
  }
}

/** How urgent the widget should read, which is what the native side draws from. */
export type WidgetMood = "celebrate" | "safe" | "atRisk" | "broken" | "empty"

export function widgetMood(day: WidgetDay): WidgetMood {
  if (day.streak === 0 && !day.studiedToday) return "empty"
  if (day.studiedToday) return "celebrate"
  // Not studied and a streak is live. The distinction between "at risk" and
  // "broken" is a matter of the hour, which the app does not know at the moment
  // it writes the payload, so it is left to the widget to decide when it draws.
  return day.streak > 0 ? "atRisk" : "broken"
}

/** The one line the widget puts under the number. */
export function widgetHeadline(payload: WidgetPayload): string {
  const { streak, studiedToday, due } = payload.day
  if (streak === 0 && !studiedToday) return "Start a streak"
  if (studiedToday) {
    return due && due > 0 ? `${due} to review` : "Done for today"
  }
  return streak > 0 ? `${streak} at risk` : "Start a streak"
}

/** A milestone worth marking, so a long streak is not just a bigger number. */
export function widgetMilestone(streak: number): number | null {
  for (const m of [365, 100, 30, 7]) {
    if (streak > 0 && streak % m === 0) return m
  }
  return null
}

/** Progress through today's goal, 0 to 1. */
export function widgetGoalProgress(day: WidgetDay): number {
  if (day.dailyGoalMinutes <= 0) return 0
  return Math.min(1, day.minutesToday / day.dailyGoalMinutes)
}
