import { Text, View } from "react-native"
import { useTheme } from "@/theme/ThemeProvider"
import { paperType, families } from "@/theme/paperType"

/**
 * The calendar-week day strip — ported from Chinese-Easy `lib/progress.ts`
 * `currentWeekActivity`, with the distinction it insists on: a **missed** day
 * (hollow, in the track colour) is not the same as a day that has not happened
 * yet (faint ring), and a future day is drawn in the green family because it is
 * an opportunity rather than a gap.
 *
 * Monday-to-Sunday rather than a rolling window, because the strip is labelled
 * M T W T F S S and a rolling one would move Wednesday's dot overnight.
 */
export function WeekStrip({
  sessions,
}: {
  sessions: { date: string; minutes?: number; xp?: number }[]
}) {
  const { paper } = useTheme()

  const today = new Date()
  const dow = (today.getDay() + 6) % 7 // Monday = 0
  const monday = new Date(today)
  monday.setDate(today.getDate() - dow)

  const studied = new Set(
    sessions
      .filter((s) => (s.minutes ?? 0) > 0 || (s.xp ?? 0) > 0)
      .map((s) => (s.date ?? "").slice(0, 10))
  )
  const todayKey = key(today)
  const letters = ["M", "T", "W", "T", "F", "S", "S"]

  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {letters.map((L, i) => {
        const d = new Date(monday)
        d.setDate(monday.getDate() + i)
        const k = key(d)
        const future = k > todayKey
        const done = studied.has(k)
        const isToday = k === todayKey
        return (
          <View key={i} style={{ flex: 1, alignItems: "center", gap: 6 }}>
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: done ? paper.green : "transparent",
                borderWidth: done ? 0 : 1.5,
                borderColor: future
                  ? paper.ring
                  : isToday
                    ? paper.coral
                    : paper.track,
              }}
            >
              {done ? (
                <Text
                  style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "800" }}
                >
                  ✓
                </Text>
              ) : null}
            </View>
            <Text
              style={[
                paperType.weekday,
                {
                  color: isToday ? paper.ink : paper.inkMuted,
                  fontFamily: isToday
                    ? families.nunitoBold
                    : families.nunitoSemiBold,
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

function key(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
