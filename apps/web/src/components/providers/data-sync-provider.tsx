"use client"

import { useEffect, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
import {
  useProgress,
  loadProgressFromServer,
  loadProgressFromCache,
  markProgressSynced,
  retryProgressSync,
} from "@/stores/progress"
import {
  useSettings,
  loadSettingsFromServer,
  loadSettingsFromCache,
  markSettingsSynced,
  retrySettingsSync,
} from "@/stores/settings"

export function DataSyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const loadP = useProgress((s) => s.load)
  const loadS = useSettings((s) => s.load)
  const unsubRef = useRef<(() => void)[]>([])

  useEffect(() => {
    unsubRef.current.forEach((fn) => fn())
    if (!user) {
      const cachedP = loadProgressFromCache()
      if (cachedP) loadP(cachedP)
      markProgressSynced()
      const cachedS = loadSettingsFromCache()
      if (cachedS) loadS(cachedS)
      markSettingsSynced()
      return
    }

    ;(async () => {
      const cachedP = loadProgressFromCache()
      if (cachedP) loadP(cachedP)
      const serverP = await loadProgressFromServer()
      if (serverP) loadP({ ...cachedP, ...serverP })
      markProgressSynced()

      const cachedS = loadSettingsFromCache()
      if (cachedS) loadS(cachedS)
      const serverS = await loadSettingsFromServer()
      if (serverS) loadS({ ...cachedS, ...serverS })
      markSettingsSynced()

      const { subscribeProgress } = await import("@/stores/progress")
      const { subscribeSettings } = await import("@/stores/settings")
      unsubRef.current = [subscribeProgress(), subscribeSettings()]

      // When connectivity returns, flush any progress mutations that were
      // queued while offline (same contract as the mobile outbox queue).
      const onOnline = () => {
        retryProgressSync()
        retrySettingsSync()
      }
      window.addEventListener("online", onOnline)
      unsubRef.current.push(() =>
        window.removeEventListener("online", onOnline)
      )
    })()

    return () => {
      unsubRef.current.forEach((fn) => fn())
      unsubRef.current = []
    }
  }, [user, loadP, loadS])

  return children
}
