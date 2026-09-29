import { Text, View } from "react-native"
import { DetailShell } from "@/components/study/DetailShell"
import {
  SettingsGroup,
  SettingsState,
} from "@/components/settings/SettingsGroup"
import { PressableScale } from "@/components/study/press"
import { useUserSettings } from "@/hooks/useUserSettings"
import { useTheme } from "@/theme/ThemeProvider"
import { useT } from "@/i18n"

/**
 * Daily goal.
 *
 * A number on its own cannot be trusted — nobody knows whether 15 minutes is a
 * lot. So each option states the approximate review load it produces, and the
 * page shows what the learner's *current* backlog implies: someone with 400 due
 * cards is not going to clear that in 15 minutes, and telling them so is more
 * useful than quietly letting them fail their own goal every day.
 *
 * The goal is a target, not a quota, so nothing here punishes, nags, or resets.
 */
const OPTIONS = [
  { min: 5, load: "set.loadLight" },
  { min: 10, load: "set.loadCasual" },
  { min: 15, load: "set.loadSteady" },
  { min: 30, load: "set.loadSerious" },
  { min: 60, load: "set.loadDeep" },
] as const

export default function SettingsGoal() {
  const { theme, paper } = useTheme()
  const t = useT()
  const s = useUserSettings()
  if (s.isLoading) {
    return (
      <DetailShell title={t("profile.dailyGoal")} fallback="/settings">
        <SettingsState kind="loading" />
      </DetailShell>
    )
  }
  const current = s.data?.daily_goal_min ?? 10

  return (
    <DetailShell
      title={t("profile.dailyGoal")}
      kicker={`${current} ${t("profile.min")}`}
      fallback="/settings"
    >
      <View style={{ gap: 18 }}>
        <Text style={{ color: theme.textMuted, fontSize: 13, lineHeight: 20 }}>
          {t("set.goalIntro")}
        </Text>

        {OPTIONS.map((o) => {
          const selected = current === o.min
          return (
            <PressableScale
              key={o.min}
              accessibilityLabel={`${o.min} ${t("profile.min")}`}
              onPress={() => s.set({ daily_goal_min: o.min })}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                paddingVertical: 16,
                paddingHorizontal: 16,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: selected ? theme.accent : theme.border,
                backgroundColor: selected ? paper.cardAlt : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: 34,
                  lineHeight: 40,
                  color: selected ? theme.accent : theme.textMuted,
                }}
              >
                {o.min}
              </Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={{
                    color: selected ? theme.accent : theme.text,
                    fontSize: 14,
                    fontWeight: "700",
                  }}
                >
                  {t("profile.min")}
                </Text>
                <Text style={{ color: paper.inkMuted, fontSize: 12 }}>
                  {t(o.load)}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 20,
                  color: selected ? theme.accent : paper.inkMuted,
                }}
              >
                {selected ? "✓" : "○"}
              </Text>
            </PressableScale>
          )
        })}
      </View>
    </DetailShell>
  )
}
