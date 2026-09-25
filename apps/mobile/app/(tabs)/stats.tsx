import { useMemo, useState } from "react"
import { ActivityIndicator, ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useQuery } from "@tanstack/react-query"
import { Card } from "@/components/ui/Card"
import { Chip } from "@/components/ui/Chip"
import { EmptyState } from "@/components/ui/EmptyState"
import { Motif } from "@/components/ui/Motif"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"
import { progress } from "@/api/endpoints"
import { useT } from "@/i18n"
import { motifChar } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import type { Achievement, StudySession } from "@/types/api"

export default function StatsTab() {
  const { theme, paper } = useTheme()
  const t = useT()
  const language = useOnboardingStore((s) => s.language)
  const [view, setView] = useState<"overview" | "badges" | "calendar">(
    "overview"
  )

  const progressQ = useQuery({ queryKey: ["progress"], queryFn: progress.get })
  const achievementsQ = useQuery({
    queryKey: ["achievements"],
    queryFn: progress.achievements,
    enabled: view === "badges",
  })
  const sessionsQ = useQuery({
    queryKey: ["study-sessions"],
    queryFn: () => progress.studySessions(50, 0),
    enabled: view === "overview" || view === "calendar",
  })

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: paper.paper }}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={{ padding: 24, gap: 28, paddingBottom: 48 }}
      >
        {/* Masthead */}
        <View style={{ gap: 12 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={[type.labelSm, { color: theme.textMuted }]}>
                {t("stats.kicker")}
              </Text>
              <Text style={[type.display, { color: theme.text, fontSize: 36 }]}>
                {t("stats.title")}
              </Text>
            </View>
            <Motif char={motifChar(language)} size={56} />
          </View>
          <View style={{ height: 1, backgroundColor: theme.border }} />
        </View>

        {/* View switcher */}
        <View
          style={{
            flexDirection: "row",
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: theme.border,
          }}
        >
          {[
            { id: "overview" as const, label: t("stats.overview") },
            { id: "calendar" as const, label: t("stats.calendar") },
            { id: "badges" as const, label: t("stats.badges") },
          ].map((v) => {
            const sel = view === v.id
            return (
              <View
                key={v.id}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  alignItems: "center",
                  borderBottomWidth: 2,
                  borderBottomColor: sel ? theme.accent : "transparent",
                }}
                onTouchEnd={() => setView(v.id)}
              >
                <Text
                  style={{
                    fontFamily: fonts.serif,
                    fontSize: 18,
                    color: sel ? theme.text : theme.textMuted,
                    fontWeight: sel ? "500" : "400",
                  }}
                >
                  {v.label}
                </Text>
              </View>
            )
          })}
        </View>

        {view === "overview" && (
          <OverviewView
            progressLoading={progressQ.isLoading}
            xp={progressQ.data?.xp ?? 0}
            streak={progressQ.data?.streak ?? 0}
            bestStreak={progressQ.data?.best_streak ?? 0}
            sessions={sessionsQ.data ?? []}
            sessionsLoading={sessionsQ.isLoading}
          />
        )}
        {view === "badges" && (
          <BadgesView
            achievements={achievementsQ.data ?? []}
            loading={achievementsQ.isLoading}
          />
        )}
        {view === "calendar" && (
          <CalendarView
            sessions={sessionsQ.data ?? []}
            loading={sessionsQ.isLoading}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Overview ──────────────────────────────────────────────────────────────
function OverviewView({
  progressLoading,
  xp,
  streak,
  bestStreak,
  sessions,
  sessionsLoading,
}: {
  progressLoading: boolean
  xp: number
  streak: number
  bestStreak: number
  sessions: StudySession[]
  sessionsLoading: boolean
}) {
  const { theme, paper } = useTheme()
  const t = useT()
  const language = useOnboardingStore((s) => s.language)
  const totalMinutes = sessions.reduce((acc, s) => acc + s.minutes, 0)
  const totalSessionXP = sessions.reduce((acc, s) => acc + s.xp, 0)

  return (
    <View style={{ gap: 20 }}>
      <View
        style={{
          flexDirection: "row",
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: theme.border,
          paddingVertical: 20,
        }}
      >
        <Stat label={t("stats.lifetimeXp")} value={xp} accent={theme.accent} />
        <Divider color={theme.border} />
        <Stat label={t("stats.streak")} value={streak} accent={theme.gold} />
        <Divider color={theme.border} />
        <Stat label={t("stats.best")} value={bestStreak} accent={theme.mint} />
        <Divider color={theme.border} />
        <Stat
          label={t("stats.minStudied")}
          value={totalMinutes}
          accent={theme.accent2}
        />
      </View>

      <View style={{ gap: 12 }}>
        <Text style={[type.labelSm, { color: theme.textMuted }]}>
          {t("stats.recentSessions")}
        </Text>
        {sessionsLoading ? (
          <ActivityIndicator color={theme.accent} />
        ) : sessions.length === 0 ? (
          <EmptyState
            title={t("stats.noSessions")}
            message={t("stats.sessionsMsg")}
            glyph="◷"
          />
        ) : (
          <View style={{ borderTopWidth: 1, borderTopColor: theme.border }}>
            {sessions.slice(0, 14).map((s, i) => (
              <View
                key={s.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 10,
                  borderBottomWidth:
                    i === sessions.slice(0, 14).length - 1 ? 1 : 0,
                  borderBottomColor: theme.border,
                }}
              >
                <Text style={[type.bodySm, { color: theme.text }]}>
                  {s.date}
                </Text>
                <Text style={[type.bodySm, { color: theme.textMuted }]}>
                  {s.minutes} min · +{s.xp} XP
                </Text>
              </View>
            ))}
          </View>
        )}
        {totalSessionXP > 0 && (
          <Text style={[type.caption, { color: theme.textDim }]}>
            {t("stats.sessionsXp")}
            {totalSessionXP}
          </Text>
        )}
      </View>
    </View>
  )
}

function CalendarView({
  sessions,
  loading,
}: {
  sessions: StudySession[]
  loading: boolean
}) {
  const { theme, paper } = useTheme()
  const t = useT()
  const days = useMemo(() => {
    const byDate = new Map<string, number>()
    for (const s of sessions)
      byDate.set(s.date, (byDate.get(s.date) ?? 0) + s.minutes)
    const out: { date: Date; key: string; minutes: number }[] = []
    const today = new Date()
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      out.push({ date: d, key, minutes: byDate.get(key) ?? 0 })
    }
    return out
  }, [sessions])
  const max = Math.max(1, ...days.map((d) => d.minutes))

  return (
    <View style={{ gap: 12 }}>
      <Text style={[type.labelSm, { color: theme.textMuted }]}>
        {t("stats.last14")}
      </Text>
      {loading ? (
        <ActivityIndicator color={theme.accent} />
      ) : (
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 6,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: theme.border,
            paddingVertical: 16,
          }}
        >
          {days.map((d) => (
            <View key={d.key} style={{ flex: 1, alignItems: "center", gap: 4 }}>
              <View
                style={{
                  width: "100%",
                  height: 64,
                  justifyContent: "flex-end",
                }}
              >
                <View
                  style={{
                    height: Math.max(4, (d.minutes / max) * 64),
                    backgroundColor:
                      d.minutes > 0 ? theme.accent : theme.textDim + "55",
                    borderRadius: 2,
                  }}
                />
              </View>
              <Text style={[type.caption, { color: theme.textDim }]}>
                {d.date.getDate()}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

// ─── Achievements ──────────────────────────────────────────────────────────
function BadgesView({
  achievements,
  loading,
}: {
  achievements: Achievement[]
  loading: boolean
}) {
  const { theme, paper } = useTheme()
  const t = useT()
  const language = useOnboardingStore((s) => s.language)
  if (loading) return <ActivityIndicator color={theme.accent} />
  if (achievements.length === 0)
    return (
      <EmptyState
        title={t("stats.noBadges")}
        message={t("stats.badgesMsg")}
        glyph="★"
      />
    )

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {achievements.map((a) => (
        <Card key={a.id} padded>
          <View style={{ width: 120, gap: 6 }}>
            <Text
              style={{
                fontFamily: fonts.serif,
                fontSize: 40,
                color: theme.accent,
                fontWeight: "500",
              }}
            >
              {a.achievement_id.slice(0, 1)}
            </Text>
            <Text
              style={[type.labelSm, { color: theme.text }]}
              numberOfLines={1}
            >
              {a.achievement_id}
            </Text>
            <Text style={[type.caption, { color: theme.textMuted }]}>
              {new Date(a.unlocked_at).toLocaleDateString()}
            </Text>
          </View>
        </Card>
      ))}
    </View>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent: string
}) {
  const { theme, paper } = useTheme()
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text
        style={{
          fontFamily: fonts.serif,
          fontSize: 28,
          color: accent,
          fontWeight: "500",
        }}
      >
        {value.toLocaleString()}
      </Text>
      <Text style={[type.labelSm, { color: theme.textMuted }]}>{label}</Text>
    </View>
  )
}

function Divider({ color }: { color: string }) {
  return (
    <View style={{ width: 1, backgroundColor: color, marginHorizontal: 12 }} />
  )
}
