import { View } from "react-native"
import { router } from "expo-router"
import { DetailShell } from "@/components/study/DetailShell"
import {
  SettingsGroup,
  SettingsRow,
  SettingsState,
} from "@/components/settings/SettingsGroup"
import { useUserSettings } from "@/hooks/useUserSettings"
import { useT } from "@/i18n"
import { examDisplayName } from "@/lib/languages"
import { setSoundPrefs } from "@/utils/sound"

/**
 * The settings hub.
 *
 * Settings used to be a section *inside* the profile screen, so reaching
 * "sound effects" meant scrolling past your streak, your tasks, your exam
 * badges and a contributor list. The profile answers *who you are*; settings
 * answer *how this app behaves*, and mixing them meant neither was findable.
 *
 * Rows are grouped by what a change affects — what you study, when the app
 * interrupts you, how much, what you see, who you are — and each shows its
 * current value on the right, so the hub doubles as a status readout and a
 * learner can confirm a change landed without opening anything.
 */
export default function SettingsHub() {
  const t = useT()
  const s = useUserSettings()
  if (s.isLoading) {
    return (
      <DetailShell title={t("set.title")} fallback="/(tabs)/profile">
        <SettingsState kind="loading" />
      </DetailShell>
    )
  }
  const d = s.data
  const mode =
    d?.mode === "dark"
      ? t("profile.modeDark")
      : d?.mode === "light"
        ? t("profile.modeLight")
        : t("profile.modeSystem")

  return (
    <DetailShell title={t("set.title")} fallback="/(tabs)/profile">
      <View style={{ gap: 22 }}>
        <SettingsGroup title={t("set.study")}>
          <SettingsRow
            first
            icon="school"
            title={t("profile.learning")}
            sub={t("set.learningHint")}
            value={
              d?.active_exam_type
                ? examDisplayName(d.active_exam_type)
                : undefined
            }
            onPress={() => router.push("/settings/learning")}
          />
          <SettingsRow
            icon="timer-outline"
            title={t("profile.dailyGoal")}
            value={d ? `${d.daily_goal_min} ${t("profile.min")}` : undefined}
            onPress={() => router.push("/settings/goal")}
          />
        </SettingsGroup>

        <SettingsGroup title={t("set.interruptions")}>
          <SettingsRow
            first
            icon="notifications"
            title={t("profile.reminder")}
            sub={t("profile.reminderHint")}
            value={
              d?.reminder_time ??
              (d?.daily_reminder ? "20:00" : t("profile.no"))
            }
            onPress={() => router.push("/settings/reminders")}
          />
        </SettingsGroup>

        {/* One row, one destination: Appearance and App language both live on
            /settings/general, and two rows pointing at the same screen read as
            two different places. */}
        <SettingsGroup title={t("set.look")}>
          <SettingsRow
            first
            icon="color-palette"
            title={t("set.appearanceAndLanguage")}
            value={mode}
            onPress={() => router.push("/settings/general")}
          />
        </SettingsGroup>

        {/* No link to Stats: it is a tab, and a second entry point only made the
            two look like different places showing the same numbers. */}
        <SettingsGroup title={t("set.you")}>
          <SettingsRow
            first
            icon="information-circle"
            title={t("profile.about")}
            onPress={() => router.push("/settings/about")}
          />
        </SettingsGroup>
      </View>
    </DetailShell>
  )
}
