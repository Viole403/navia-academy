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
