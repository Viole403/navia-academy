/**
 * The rule for counting exam-integrity warnings, separate from the mechanism
 * that observes them.
 *
 * Kept apart because this is the part with a wrong answer in it, and it is the
 * part worth testing: react-native cannot be parsed outside a native host, so a
 * test that imported the hook could not run at all.
 */

/** Matches the threshold the server and the web client use. */
export const WARNING_LIMIT = 2

/**
 * The next tally, given the current one.
 *
 * Stops at the limit — past it, further warnings change nothing, so the count
 * cannot be inflated by leaving repeatedly — and never goes below zero, so a
 * bad value from the server cannot become extra warnings on the next leave.
 *
 * Reports whether it moved, so a caller can skip sending once the limit is
 * reached rather than reporting a number the server will discard.
 */
export function nextWarning(
  current: number,
  limit: number = WARNING_LIMIT
): { total: number; changed: boolean } {
  const safe = current > 0 ? current : 0
  if (safe >= limit) return { total: safe, changed: false }
  return { total: safe + 1, changed: true }
}

/**
 * The app states that can arrive, as react-native reports them.
 *
 * Duplicated as a string union rather than imported from react-native, because
 * the module under test cannot be parsed outside a native host. The union is
 * checked against the real one in the hook, so a new state cannot slip in
 * unnoticed.
 */
export type AppStateName =
  "active" | "background" | "inactive" | "unknown" | "extension"

/**
 * Whether a transition into `next` is the learner leaving.
 *
 * Only entering the background counts, and only from a state that was not
 * already the background.
 *
 * Leaving once is not one event, it is a sequence: on iOS a swipe runs
 * `active → inactive → background`, and counting both steps meant a single
 * interruption reached the limit on its own and flagged a learner who had done
 * nothing. The fix is to count the transition into the background and treat the
 * approach to it as part of the same departure.
 *
 * `extension` is an iOS share sheet or widget, which is not a departure either
 * and is not counted.
 *
 * `inactive` on its own is not a departure and is not counted. A notification
 * banner produces it on Android without the app being left at all, so counting
 * it punished the learner for someone else getting in touch.
 *
 * Some devices emit the background state more than once for one departure, so
 * re-entering the same state is ignored.
 */
export function isLeaving(previous: AppStateName, next: AppStateName): boolean {
  return next === "background" && previous !== "background"
}

/** A tally adopted from the server, held inside the range the rule allows. */
export function safeTally(n: number | undefined): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0
  return n > 0 ? Math.floor(n) : 0
}
