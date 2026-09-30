import { useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { settings } from "@/api/endpoints"
import { useAuthStore } from "@/store/auth"
import {
  cancelStreakReminder,
  getScheduledStreakReminder,
  hasNotificationPermission,
  scheduleDailyStreakReminder,
} from "@/utils/notifications"

/** A reboot keeps the server setting but drops the OS alarm, so re-arm on start. */
function slotToParts(slot: string | undefined): {
  hour: number
  minute: number
} {
  const [h, m] = (slot ?? "20:00").split(":")
  const hour = Number(h)
  const minute = Number(m)
  return {
    hour: Number.isFinite(hour) ? hour : 20,
    minute: Number.isFinite(minute) ? minute : 0,
  }
}

export function useReminderSync(): void {
  const user = useAuthStore((s) => s.user)
  // Same key the settings screens use, so this reads the cache they already
  // hold rather than issuing a second GET /settings on every launch.
  const query = useQuery({
    queryKey: ["settings"],
    queryFn: settings.get,
    enabled: !!user,
  })
  const running = useRef(false)

  useEffect(() => {
    if (!user) return
    const d = query.data
    if (!d) return
    // One reconcile at a time: a fast toggle in the screen and a settings refetch
    // can both land here, and two concurrent schedules would leave a duplicate.
    if (running.current) return
    running.current = true
    void (async () => {
      try {
        if (!(await hasNotificationPermission())) return
        const existing = await getScheduledStreakReminder()
        if (!d.daily_reminder) {
          if (existing) await cancelStreakReminder()
          return
        }
        const { hour, minute } = slotToParts(d.reminder_time)
        if (existing && existing.hour === hour && existing.minute === minute)
          return
        await scheduleDailyStreakReminder(hour, minute)
      } catch {
        // Nothing to do: the next start reconciles again.
      } finally {
        running.current = false
      }
    })()
  }, [user, query.data])
}
