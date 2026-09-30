import { useState } from "react"
import { Alert, Text, View } from "react-native"
import { DetailShell } from "@/components/study/DetailShell"
import {
  SettingsGroup,
  SettingsToggle,
  SettingsRow,
  SettingsState,
  GROUP_INSET,
} from "@/components/settings/SettingsGroup"
import { TimePickerSheet } from "@/components/ui/TimePickerSheet"
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
 * The time is a real picker, not the eight fixed slots this used to offer. Those
 * slots did not fit the width available — eight pills in a 292dp row either
 * overflowed or left the row lopsided — and they were a guess at the hours a
 * learner picks. The minute wheel still steps by quarters, which keeps the
 * decision coarse; the hour is now theirs.
 */
function slotToParts(slot: string) {
  const [h, m] = slot.split(":")
  return { hour: Number(h), minute: Number(m) }
}

export default function SettingsReminders() {
  const { theme, paper } = useTheme()
  const t = useT()
  const s = useUserSettings()
  // Above the loading return: React rejects a hook count that changes per render.
  const [picking, setPicking] = useState(false)
  if (s.isLoading) {
    return (
      <DetailShell title={t("profile.reminder")} fallback="/settings">
        <SettingsState kind="loading" />
      </DetailShell>
    )
  }
  const d = s.data
  const on = d?.daily_reminder ?? false
  const time = d?.reminder_time || "20:00"

  const enable = async (next: boolean) => {
    // Flip first, then do the slow parts. The permission prompt and the schedule
    // call are native round trips that took seconds, and the switch used to sit
    // still through all of it.
    s.set({ daily_reminder: next })
    try {
      if (!next) {
        await cancelStreakReminder()
        return
      }
      const granted = await requestPermissions()
      if (!granted) {
        // The switch already reads on, so put it back: a setting that claims to be
        // on while the OS has said no is a lie the user will debug.
        s.set({ daily_reminder: false })
        Alert.alert(t("set.noPermissionTitle"), t("set.noPermissionBody"), [
          { text: t("common.ok"), style: "cancel" },
        ])
        return
      }
      const { hour, minute } = slotToParts(time)
      await scheduleDailyStreakReminder(hour, minute)
    } catch {
      s.set({ daily_reminder: !next })
    }
  }

  const changeTime = async (next: string) => {
    s.set({ reminder_time: next })
    if (!on) return
    const { hour, minute } = slotToParts(next)
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

        {/* A real time picker replaced the eight fixed slots: the row of pills was
            a control that could not hold eight values in the width available, and
            a wheel asks for the hour the learner actually wants. */}
        <SettingsGroup
          title={t("profile.reminderTime")}
          hint={on ? t("set.timeHint") : undefined}
        >
          {on ? (
            <SettingsRow
              first
              icon="time-outline"
              title={time}
              onPress={() => setPicking(true)}
            />
          ) : (
            <View
              style={{
                paddingHorizontal: GROUP_INSET,
                paddingTop: GROUP_INSET,
                paddingBottom: GROUP_INSET,
              }}
            >
              <Text style={{ color: paper.inkMuted, fontSize: 13 }}>
                {t("set.timeOffHint")}
              </Text>
            </View>
          )}
        </SettingsGroup>
        <TimePickerSheet
          visible={picking}
          value={time}
          onCancel={() => setPicking(false)}
          onConfirm={async (next) => {
            setPicking(false)
            await changeTime(next)
          }}
        />

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
