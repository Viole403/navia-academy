import { useCallback, useEffect, useRef, useState } from "react"
import { AppState } from "react-native"
import type { AppStateStatus } from "react-native"

import { nextWarning, WARNING_LIMIT } from "@/lib/integrity"

/**
 * Counts the learner leaving the app during an exam.
 *
 * The server cannot see this — tab visibility exists only on the client — so it
 * is reported. What the server does provide is a place to keep the tally, which
 * is the part that was missing: while it lived in component state a reload reset
 * it, so leaving five times across five app launches recorded nothing while
 * leaving twice in a row did.
 *
 * Two warnings raises the flag. The count is sent as a delta and added
 * server-side, so a dropped request lowers nothing and a late one only adds.
 *
 * The arithmetic lives in `nextWarning` rather than inline so it can be tested
 * without a renderer; this package has no DOM and no testing-library.
 */

export interface IntegrityTracking {
  /** Total warnings known to the client, mirroring the server's tally. */
  warnings: number
  /** True once the tally has reached the limit. */
  flagged: boolean
  /** Report a warning now. No-op once already flagged. */
  report: () => void
  /** Adopt a tally loaded from the server, e.g. on resume. */
  seed: (n: number | undefined) => void
  /** Forget everything — a new session starts clean. */
  reset: () => void
}

export function useIntegrityTracking(
  onReport?: (total: number) => void
): IntegrityTracking {
  const [warnings, setWarnings] = useState(0)
  const warningsRef = useRef(0)
  // Held in a ref so the subscription identity stays stable; swapping the
  // callback every render would re-register the listener on every render.
  const reportRef = useRef(onReport)
  reportRef.current = onReport

  const seed = useCallback((n: number | undefined) => {
    warningsRef.current = n ?? 0
    setWarnings(warningsRef.current)
  }, [])

  const reset = useCallback(() => {
    warningsRef.current = 0
    setWarnings(0)
  }, [])

  const report = useCallback(() => {
    const { total, changed } = nextWarning(warningsRef.current)
    if (!changed) return
    warningsRef.current = total
    setWarnings(total)
    reportRef.current?.(total)
  }, [])

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      // Both transitions count. A swipe-away lands on "background" on iOS and
      // passes through "inactive" during the switch; a notification banner is
      // "inactive" on Android without the app really being left. The server
      // holds the consequence — this only counts the event.
      if (next === "background" || next === "inactive") report()
    }
    const sub = AppState.addEventListener("change", onChange)
    return () => sub.remove()
  }, [report])

  return {
    warnings,
    flagged: warnings >= WARNING_LIMIT,
    report,
    seed,
    reset,
  }
}
