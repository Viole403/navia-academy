import { Text, View } from "react-native"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts } from "@/theme/typography"
import { radii, spacing, studyType, surfaceFor } from "./tokens"
import type { StudySession } from "@/types/api"

/**
 * Speech bubble (coach line) — reference bubble geometry without art.
 * Width is derived by the parent (never hardcoded); tail on the left.
 */
export function SpeechBubble({ text }: { text: string }) {
  const { theme } = useTheme()
  const s = surfaceFor(theme, "word")
  return (
    <View
      style={{
        backgroundColor: s.fill,
        borderColor: s.border,
        borderWidth: 1,
        borderRadius: radii.inner,
        borderTopLeftRadius: 4,
        padding: spacing.md,
        alignSelf: "stretch",
      }}
    >
      <Text
        style={[
          studyType.bubble,
          { color: theme.text, fontFamily: fonts.sans },
        ]}
      >
        {text}
      </Text>
    </View>
  )
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/**
 * @deprecated Kept so existing imports resolve. The week strip now lives in
 * `WeekStrip.tsx`, where the three day-states are defined together.
 */
export function WeekStrip({ sessions }: { sessions: StudySession[] }) {
  const { theme } = useTheme()
  const now = new Date()
  const dow = (now.getDay() + 6) % 7 // Monday = 0
  const monday = new Date(now)
  monday.setDate(now.getDate() - dow)

  const active = new Set(
    (sessions ?? [])
      .filter((s) => (s.minutes ?? 0) > 0 || (s.xp ?? 0) > 0)
      .map((s) => (s.date ?? "").slice(0, 10))
  )
  const today = dayKey(now)
  const letters = ["M", "T", "W", "T", "F", "S", "S"]

  return (
    <View style={{ flexDirection: "row", gap: spacing.sm }}>
      {letters.map((L, i) => {
        const d = new Date(monday)
        d.setDate(monday.getDate() + i)
        const key = dayKey(d)
        const isFuture = key > today
        const done = active.has(key)
        const isToday = key === today
        return (
          <View key={i} style={{ flex: 1, alignItems: "center", gap: 6 }}>
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: done ? theme.green : "transparent",
                borderWidth: done ? 0 : 1.5,
                borderColor: isFuture
                  ? theme.textDim + "55"
                  : isToday
                    ? theme.accent
                    : theme.border,
              }}
            >
              {done && (
                <Text
                  style={{
                    color: theme.white,
                    fontSize: 13,
                    fontWeight: "800",
                  }}
                >
                  ✓
                </Text>
              )}
            </View>
            <Text
              style={[
                studyType.weekday,
                {
                  color: isToday ? theme.text : theme.textDim,
                  fontFamily: fonts.sans,
                  fontWeight: isToday ? "800" : "600",
                },
              ]}
            >
              {L}
            </Text>
          </View>
        )
      })}
    </View>
  )
}
