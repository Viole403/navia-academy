"use client"

import { useSyncExternalStore } from "react"
import { CloudOff, RefreshCw } from "lucide-react"
import { useTranslation } from "@/i18n/locale-context"
import { hasPendingSync, subscribePendingSync } from "@/stores/progress"

function subscribe(callback: () => void) {
  window.addEventListener("online", callback)
  window.addEventListener("offline", callback)
  return () => {
    window.removeEventListener("online", callback)
    window.removeEventListener("offline", callback)
  }
}

export function OfflineBanner() {
  const { t } = useTranslation()
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true
  )
  const pending = useSyncExternalStore(
    subscribePendingSync,
    hasPendingSync,
    () => false
  )

  // Offline → show warning banner
  if (!online) {
    return (
      <div
        role="status"
        className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-warn px-4 py-1.5 text-xs font-medium text-white"
      >
        <CloudOff className="h-3.5 w-3.5" /> {t("offline.banner")}
      </div>
    )
  }

  // Online but pending → show pending sync indicator
  if (pending) {
    return (
      <div
        role="status"
        className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-info px-4 py-1.5 text-xs font-medium text-white"
      >
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />{" "}
        {t("offline.pending")}
      </div>
    )
  }

  return null
}
