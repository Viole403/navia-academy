/**
 * Keeping the home-screen widget in step with the app.
 *
 * A widget is a separate native process, so it only ever sees the last snapshot
 * the app wrote for it. That makes this the one place where the app decides when
 * that snapshot is worth rewriting, and the decision is deliberate: the widget is
 * decoration, so nothing here may block, throw into a screen, or cost a request
 * the study flow was going to make anyway.
 *
 * The requests below are the ones the app is already making for the home screen
 * and the progress tab, so a sync costs no extra traffic. A sync is skipped
 * entirely when the payload has not changed, because most state changes in a
 * session — a theme toggle, a re-render, a background refresh — do not alter
 * anything the widget draws.
 */

import { useCallback, useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import AsyncStorage from "@react-native-async-storage/async-storage"

import { progress as progressApi } from "@/api/endpoints"
import { pushWidgetPayload, widgetsAvailable } from "@/lib/nativeWidgets"
import { buildWidgetPayload, type WidgetPayload } from "@/lib/widget"
import {
  assembleWidgetPayload,
  buildRecentWeek,
  minutesToday,
  studiedToday,
} from "@/lib/widgetSync"
import { useAppTheme } from "@/theme/useMaterialYou"

/** Written next to the streak so a cold start has something to draw. */
const LAST_SENT_KEY = "navia:last_widget_payload"
const SYNC_INTERVAL_MS = 30 * 60 * 1000

export interface UseWidgetSyncResult {
  /** False on platforms with no native widget yet, or in Expo Go. */
  available: boolean
  /** Resolves true when a snapshot was actually written. */
  sync: () => Promise<boolean>
}

/**
 * Syncs the widget whenever the data it draws actually changes.
 *
 * The 30 minute interval is a backstop rather than the main trigger: the app is
 * usually open when the learner studies, so the reactive path does the work. The
 * interval exists for the case where it is not — the payload would otherwise go
 * stale for as long as the app stayed closed.
 */
export function useWidgetSync(): UseWidgetSyncResult {
  const { theme, themeDef, ready } = useAppTheme()
  const lastSent = useRef<string | null>(null)
  const inFlight = useRef(false)

  const progressQ = useQuery({
    queryKey: ["progress"],
    queryFn: progressApi.get,
  })
  const sessionsQ = useQuery({
    queryKey: ["study-sessions"],
    queryFn: () => progressApi.studySessions(50, 0),
  })
  const srsQ = useQuery({
    queryKey: ["srs-stats"],
    queryFn: progressApi.srsStats,
  })

  const available = widgetsAvailable()

  const sync = useCallback(async (): Promise<boolean> => {
    if (!available) return false
    // A sync already running means the data has not changed since it started, so
    // a second concurrent one would write the same bytes.
    if (inFlight.current) return false
    if (!progressQ.data) return false

    const sessions = sessionsQ.data ?? []
    const stats = srsQ.data
    const payload = assembleWidgetPayload({
      streak: progressQ.data.streak ?? 0,
      bestStreak: progressQ.data.best_streak ?? 0,
      sessions,
      // The SRS endpoint returns a flat count map; `due` is its own key. A
      // missing key means "not counted", not "zero reviews waiting", and showing
      // zero would claim the deck is clear.
      due: typeof stats?.due === "number" ? stats.due : null,
      dailyGoalMinutes: 20,
      locale: "id",
      themeId: themeDef.id,
      colors: {
        bg: theme.bg,
        text: theme.text,
        accent: theme.accent,
        textMuted: theme.textMuted,
      },
    })

    const serialised = JSON.stringify(payload)
    if (serialised === lastSent.current) return false

    inFlight.current = true
    try {
      const written = await pushWidgetPayload(payload)
      if (written) {
        lastSent.current = serialised
        // Remembered so a cold start does not rewrite an identical payload on the
        // first render, before any of this has run.
        AsyncStorage.setItem(LAST_SENT_KEY, serialised).catch(() => {})
      }
      return written
    } finally {
      inFlight.current = false
    }
  }, [available, progressQ.data, sessionsQ.data, srsQ.data, theme, themeDef.id])

  // Restore the last payload so the first sync is a no-op when nothing moved.
  useEffect(() => {
    AsyncStorage.getItem(LAST_SENT_KEY)
      .then((v) => {
        lastSent.current = v
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!ready || !available) return
    void sync()
  }, [ready, sync])

  useEffect(() => {
    if (!available) return
    const id = setInterval(() => void sync(), SYNC_INTERVAL_MS)
    return () => clearInterval(id)
  }, [available, sync])

  return { available, sync }
}
