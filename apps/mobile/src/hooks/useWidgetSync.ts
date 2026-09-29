/**
 * Decides when to rewrite the widget snapshot. Requests are ones the app already
 * makes, and an unchanged payload is not written at all.
 */

import { useCallback, useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import AsyncStorage from "@react-native-async-storage/async-storage"

import {
  progress as progressApi,
  settings as settingsApi,
} from "@/api/endpoints"
import {
  clearWidgetPayload,
  pushWidgetPayload,
  widgetsAvailable,
} from "@/lib/nativeWidgets"
import { buildWidgetPayload, type WidgetPayload } from "@/lib/widget"
import {
  assembleWidgetPayload,
  buildRecentWeek,
  minutesToday,
  studiedToday,
} from "@/lib/widgetSync"
import { useAppTheme } from "@/theme/useMaterialYou"
import { useAuthStore } from "@/store/auth"
import { useLocaleStore } from "@/i18n"

const LAST_SENT_KEY = "navia:last_widget_payload"
const SYNC_INTERVAL_MS = 30 * 60 * 1000

export interface UseWidgetSyncResult {
  /** False on platforms with no native widget yet, or in Expo Go. */
  available: boolean
  /** Resolves true when a snapshot was actually written. */
  sync: () => Promise<boolean>
}

/** Syncs when the drawn data changes; the interval is only a backstop for a closed app. */
export function useWidgetSync(): UseWidgetSyncResult {
  const { theme, themeDef, ready } = useAppTheme()
  const user = useAuthStore((s) => s.user)
  const locale = useLocaleStore((s) => s.locale)
  const lastSent = useRef<string | null>(null)
  const inFlight = useRef(false)

  // Every endpoint below is behind auth, and a widget that renders the last
  // signed-in learner's streak to whoever holds the phone next is worse than one
  // that renders nothing.
  const signedIn = !!user

  const progressQ = useQuery({
    queryKey: ["progress"],
    queryFn: progressApi.get,
    enabled: signedIn,
  })
  const sessionsQ = useQuery({
    queryKey: ["study-sessions"],
    queryFn: () => progressApi.studySessions(50, 0),
    enabled: signedIn,
  })
  const srsQ = useQuery({
    queryKey: ["srs-stats"],
    queryFn: progressApi.srsStats,
    enabled: signedIn,
  })
  const settingsQ = useQuery({
    queryKey: ["settings"],
    queryFn: settingsApi.get,
    enabled: signedIn,
  })

  const available = widgetsAvailable()

  const sync = useCallback(async (): Promise<boolean> => {
    if (!available || !signedIn) return false
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
      // A missing `due` key means "not counted", not "zero" — those look identical
      // as a digit and mean opposite things.
      due: typeof stats?.due === "number" ? stats.due : null,
      dailyGoalMinutes: settingsQ.data?.daily_goal_min ?? 20,
      locale,
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

  // Signing out leaves the last learner's streak on the home screen until the
  // next launch. Clearing on the way out, not only on the way in.
  const wasSignedIn = useRef(false)
  useEffect(() => {
    if (wasSignedIn.current && !signedIn) {
      lastSent.current = null
      void clearWidgetPayload()
      void AsyncStorage.removeItem(LAST_SENT_KEY)
    }
    wasSignedIn.current = signedIn
  }, [signedIn])

  return { available, sync }
}
