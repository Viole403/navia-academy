import { Alert, Text, View } from "react-native"
import { DetailShell } from "@/components/study/DetailShell"
import {
  SettingsGroup,
  SettingsToggle,
  SettingsChoice,
  SettingsState,
} from "@/components/settings/SettingsGroup"
import { useUserSettings } from "@/hooks/useUserSettings"
import { useTheme } from "@/theme/ThemeProvider"
import { useT } from "@/i18n"
import {
  cancelStreakReminder,
  requestPermissions,
  scheduleDailyStreakReminder,
} from "@/utils/notifications"

/**
 * Reminders.
 *
 * **The permission prompt belongs to the decision, not to this screen.** Opening
 * it fired `requestPermissionsAsync` on mount, so a learner who only came to look
 * at their reminder time was asked for notifications and, on refusal, then told
 * reminders were unavailable — for a setting they had not touched. The prompt now
 * fires inside the toggle, at the moment they turn it on, and a refusal is
 * reported as a refusal to *this setting* rather than as a broken feature.
 *
 * The time is chosen from fixed slots rather than a wheel or a text field. A
 * reminder is a coarse decision made once; a minute-accurate picker implies a
 * precision nobody uses and is a worse target on a phone than a list of eight
 * readable times.
 */
const SLOTS = [7, 8, 12, 13, 18, 19, 20, 21]

function slotToParts(slot: string) {
  const [h, m] = slot.split(":")
  return { hour: Number(h), minute: Number(m) }
}

export default function SettingsReminders() {
  const { theme, paper } = useTheme()
  const t = useT()
  const s = useUserSettings()
  if (s.isLoading) {
    return (
      <DetailShell title={t("profile.reminder")} fallback="/settings">
        <SettingsState kind="loading" />
      </DetailShell>
    )
  }
  const d = s.data
  const on = d?.daily_reminder ?? false
  const time = d?.reminder_time ?? "20:00"

  const enable = async (next: boolean) => {
    if (!next) {
      s.set({ daily_reminder: false })
      await cancelStreakReminder()
      return
    }
    const granted = await requestPermissions()
    if (!granted) {
      // Say what happened, and leave the stored preference off — a setting that
      // claims to be on while the OS has said no is a lie the user will debug.
      Alert.alert(t("set.noPermissionTitle"), t("set.noPermissionBody"), [
        { text: t("common.ok"), style: "cancel" },
      ])
      return
    }
    const { hour, minute } = slotToParts(time)
    await scheduleDailyStreakReminder(hour, minute)
    s.set({ daily_reminder: true })
  }

  const changeTime = async (slot: string) => {
    s.set({ reminder_time: `${slot}:00` })
    if (!on) return
    const { hour, minute } = slotToParts(slot)
    await scheduleDailyStreakReminder(hour, minute)
  }

  return (
    <DetailShell
      title={t("profile.reminder")}
      kicker={t("set.remindersKicker")}
      fallback="/settings"
    >
      <View style={{ gap: 22 }}>
        <SettingsGroup title={t("set.daily")}>
          <SettingsToggle
            first
            icon="notifications"
            title={t("profile.reminder")}
            sub={t("profile.reminderHint")}
            value={on}
            onChange={enable}
          />
        </SettingsGroup>

        <SettingsGroup
          title={t("profile.reminderTime")}
          hint={on ? t("set.timeHint") : t("set.timeOffHint")}
        >
          {on ? (
            <SettingsChoice
              options={SLOTS.map((h) => ({ id: `${h}:00`, label: `${h}:00` }))}
              value={time}
              onChange={changeTime}
            />
          ) : (
            <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
              <Text style={{ color: paper.inkMuted, fontSize: 13 }}>
                {t("set.timeOffHint")}
              </Text>
            </View>
          )}
        </SettingsGroup>

        <SettingsGroup title={t("set.digests")} last>
          <SettingsToggle
            first
            icon="bar-chart"
            title={t("profile.weekly")}
            sub={t("profile.weeklyHint")}
            value={d?.weekly_summary ?? true}
            onChange={(v) => s.set({ weekly_summary: v })}
          />
          <SettingsToggle
            icon="flame"
            title={t("set.streakAlerts")}
            sub={t("set.streakAlertsHint")}
            value={d?.streak_alerts ?? true}
            onChange={(v) => s.set({ streak_alerts: v })}
          />
        </SettingsGroup>
      </View>
    </DetailShell>
  )
}
