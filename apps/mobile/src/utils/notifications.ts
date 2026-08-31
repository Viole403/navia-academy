import * as Notifications from "expo-notifications"
import { Platform } from "react-native"

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export async function requestPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync()
  return status === "granted"
}

export async function scheduleDailyStreakReminder(
  hour = 20,
  minute = 0
): Promise<void> {
  await cancelStreakReminder()
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("streak", {
      name: "Streak reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Don't break your streak",
      body: "A quick 5-minute review keeps the chain alive.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      ...(Platform.OS === "android" ? { channelId: "streak" } : {}),
    },
  })
}

export async function cancelStreakReminder(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  await Promise.all(
    scheduled.map((s) =>
      Notifications.cancelScheduledNotificationAsync(s.identifier)
    )
  )
}
