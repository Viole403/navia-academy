import { Platform } from "react-native"
import { translate, useLocaleStore } from "@/i18n"
// eslint-disable-next-line @typescript-eslint/no-require-imports
let Notifications: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Notifications = require("expo-notifications")
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })
} catch {
  Notifications = null
}

/**
 * Tag on the request so this module can find — and only find — the alarm it owns.
 * `cancelStreakReminder` used to cancel *every* scheduled notification on the
 * device, which was only harmless while this was the only one.
 */
const REMINDER_KIND = "streak-reminder"

export async function requestPermissions(): Promise<boolean> {
  if (!Notifications) return false
  const { status } = await Notifications.requestPermissionsAsync()
  return status === "granted"
}

/** Already granted? The reconcile must never prompt — see useReminderSync. */
export async function hasNotificationPermission(): Promise<boolean> {
  if (!Notifications) return false
  const { status } = await Notifications.getPermissionsAsync()
  return status === "granted"
}

function locale() {
  return useLocaleStore.getState().locale
}

export async function scheduleDailyStreakReminder(
  hour = 20,
  minute = 0
): Promise<void> {
  if (!Notifications) return
  await cancelStreakReminder()
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("streak", {
      name: "Streak reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      // A notification is the one string that reaches someone with the app
      // closed, so it cannot fall back to a hardcoded English literal — the
      // learner's chosen locale has to be read at schedule time.
      title: translate(locale(), "notif.streakTitle"),
      body: translate(locale(), "notif.streakBody"),
      data: { kind: REMINDER_KIND },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      ...(Platform.OS === "android" ? { channelId: "streak" } : {}),
    },
  })
}

/** What the OS currently holds for this alarm, or null if it holds nothing. */
export interface ScheduledReminder {
  identifier: string
  hour: number
  minute: number
}

/**
 * Read the alarm back out of the scheduler.
 *
 * Android answers a DAILY trigger with `{type:'daily', hour, minute}`; iOS
 * answers with a calendar trigger, so both shapes are read. A trigger with no
 * readable time is reported as hour/minute -1, which never compares equal to a
 * real slot and so forces a re-schedule rather than silently matching.
 */
export async function getScheduledStreakReminder(): Promise<ScheduledReminder | null> {
  if (!Notifications) return null
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  const mine = scheduled.find(
    (s: any) => s?.content?.data?.kind === REMINDER_KIND
  )
  if (!mine) return null
  const trigger = mine.trigger ?? {}
  const components = trigger.dateComponents ?? {}
  const hour = trigger.hour ?? components.hour ?? -1
  const minute = trigger.minute ?? components.minute ?? -1
  return { identifier: mine.identifier, hour, minute }
}

export async function cancelStreakReminder(): Promise<void> {
  const existing = await getScheduledStreakReminder()
  if (!existing || !Notifications) return
  await Notifications.cancelScheduledNotificationAsync(existing.identifier)
}
