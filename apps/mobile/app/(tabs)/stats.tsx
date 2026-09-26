import { useMemo, useState } from "react"
import { ActivityIndicator, ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useQuery } from "@tanstack/react-query"
import { PaperCard, QuietPill, PaperStat } from "@/components/study/PaperCard"
import { PressableScale } from "@/components/study/press"
import { EmptyState } from "@/components/ui/EmptyState"
import { Motif } from "@/components/ui/Motif"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentLayout } from "@/theme/layout"
import { paperType } from "@/theme/paperType"
import { progress } from "@/api/endpoints"
import { useT } from "@/i18n"
import { motifChar } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { tap } from "@/utils/feedback"
import type { Achievement, StudySession } from "@/types/api"

/**
 * Three views of the same study record: totals, the fortnight, the badges.
 *
 * **The four headline numbers sit on a card rather than in a ruled band.** A
 * lifetime-XP figure and a current-streak figure are not the same kind of thing
 * — one only ever grows, the other resets the moment a day is missed — and a row
 * of identical columns implied they were. On the card the numbers are separated
 * by the paper rather than by hairlines, and the streak is the only one wearing
 * colour, because it is the only one that is a state rather than a total.
 *
 * The fourteen-day chart keeps its bars in the paper ink rather than the accent,
 * so a bar and a day with nothing in it are read as *amount* against *absence*
 * instead of two colours of "busy". The track behind each bar stays visible, which
 * is what makes an empty day read as a day that did not happen rather than a gap
 * in the layout.
 */
export default function StatsTab() {
  const { paper } = useTheme()
  const t = useT()
  const { column } = useContentLayout()
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
        contentContainerStyle={{
          padding: 20,
          gap: 22,
          maxWidth: column,
          width: "100%",
          alignSelf: "center",
        }}
      >
        <View style={{ gap: 12 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={[paperType.label, { color: paper.inkMuted }]}>
                {t("stats.kicker")}
              </Text>
              <Text
                style={[
                  paperType.greeting,
                  { color: paper.ink, fontSize: 30, lineHeight: 34 },
                ]}
              >
                {t("stats.title")}
              </Text>
            </View>
            <Motif char={motifChar(language)} size={56} />
          </View>
          <View style={{ height: 1, backgroundColor: paper.line }} />
        </View>

        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {[
            { id: "overview" as const, label: t("stats.overview") },
            { id: "calendar" as const, label: t("stats.calendar") },
            { id: "badges" as const, label: t("stats.badges") },
          ].map((v) => {
            const sel = view === v.id
            return (
              <PressableScale
                key={v.id}
                onPress={() => {
                  tap()
                  setView(v.id)
                }}
                scale={0.96}
                wrapperStyle={{ flex: 1 }}
                style={{ alignItems: "center" }}
              >
                <View
                  style={{
                    width: "100%",
                    alignItems: "center",
                    paddingVertical: 11,
                    borderRadius: paper.radius.pill,
                    borderWidth: 1,
                    borderColor: sel ? paper.green : paper.line,
                    backgroundColor: sel ? paper.greenSoft : "transparent",
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      paperType.link,
                      { color: sel ? paper.greenDark : paper.inkMuted },
                    ]}
                  >
                    {v.label}
                  </Text>
                </View>
              </PressableScale>
            )
          })}
        </View>

        {view === "overview" ? (
          <OverviewView
            progressLoading={progressQ.isLoading}
            xp={progressQ.data?.xp ?? 0}
            streak={progressQ.data?.streak ?? 0}
            bestStreak={progressQ.data?.best_streak ?? 0}
            sessions={sessionsQ.data ?? []}
            sessionsLoading={sessionsQ.isLoading}
          />
        ) : null}
        {view === "badges" ? (
          <BadgesView
            achievements={achievementsQ.data ?? []}
            loading={achievementsQ.isLoading}
          />
        ) : null}
        {view === "calendar" ? (
          <CalendarView
            sessions={sessionsQ.data ?? []}
            loading={sessionsQ.isLoading}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

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
  const { paper } = useTheme()
  const t = useT()
  const recent = sessions.slice(0, 14)
  const totalMinutes = sessions.reduce((acc, s) => acc + s.minutes, 0)
  const totalSessionXP = sessions.reduce((acc, s) => acc + s.xp, 0)

  return (
    <View style={{ gap: 20 }}>
      {progressLoading ? (
        <ActivityIndicator color={paper.green} />
      ) : (
        <PaperCard>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <PaperStat
              value={xp.toLocaleString()}
              label={t("stats.lifetimeXp")}
              style={{ flex: 1 }}
            />
            <PaperStat
              value={streak}
              label={t("stats.streak")}
              ink={paper.gold}
              style={{ flex: 1 }}
            />
            <PaperStat
              value={bestStreak}
              label={t("stats.best")}
              ink={paper.lavender}
              style={{ flex: 1 }}
            />
            <PaperStat
              value={totalMinutes}
              label={t("stats.minStudied")}
              ink={paper.coral}
              style={{ flex: 1 }}
            />
          </View>
        </PaperCard>
      )}

      <View style={{ gap: 10 }}>
        <Text style={[paperType.label, { color: paper.inkMuted }]}>
          {t("stats.recentSessions")}
        </Text>
        {sessionsLoading ? (
          <ActivityIndicator color={paper.green} />
        ) : sessions.length === 0 ? (
          <EmptyState
            title={t("stats.noSessions")}
            message={t("stats.sessionsMsg")}
            glyph="◷"
          />
        ) : (
          <PaperCard padded>
            {recent.map((s, i) => (
              <View
                key={s.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 10,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: paper.lineSoft,
                }}
              >
                <Text style={[paperType.bodySm, { color: paper.ink }]}>
                  {s.date}
                </Text>
                <Text
                  style={[
                    paperType.statLabel,
                    { color: paper.inkMuted, fontSize: 12.5 },
                  ]}
                >
                  {s.minutes} min · +{s.xp} XP
                </Text>
              </View>
            ))}
          </PaperCard>
        )}
        {totalSessionXP > 0 ? (
          <Text style={[paperType.statLabel, { color: paper.inkMuted }]}>
            {t("stats.sessionsXp")}
            {totalSessionXP}
          </Text>
        ) : null}
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
  const { paper } = useTheme()
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
    <View style={{ gap: 10 }}>
      <Text style={[paperType.label, { color: paper.inkMuted }]}>
        {t("stats.last14")}
      </Text>
      {loading ? (
        <ActivityIndicator color={paper.green} />
      ) : (
        <PaperCard>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              gap: 6,
              paddingTop: 8,
            }}
          >
            {days.map((d) => (
              <View
                key={d.key}
                style={{ flex: 1, alignItems: "center", gap: 5 }}
              >
                <View
                  style={{
                    width: "100%",
                    height: 64,
                    justifyContent: "flex-end",
                    backgroundColor: paper.track,
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      height: Math.max(4, (d.minutes / max) * 64),
                      backgroundColor:
                        d.minutes > 0 ? paper.inkSoft : "transparent",
                      borderRadius: 3,
                    }}
                  />
                </View>
                <Text
                  style={[
                    paperType.weekday,
                    { color: d.minutes > 0 ? paper.inkSoft : paper.ring },
                  ]}
                >
                  {d.date.getDate()}
                </Text>
              </View>
            ))}
          </View>
        </PaperCard>
      )}
    </View>
  )
}

function BadgesView({
  achievements,
  loading,
}: {
  achievements: Achievement[]
  loading: boolean
}) {
  const { paper } = useTheme()
  const t = useT()
  const { tileColumns } = useContentLayout()
  if (loading) return <ActivityIndicator color={paper.green} />
  if (achievements.length === 0)
    return (
      <EmptyState
        title={t("stats.noBadges")}
        message={t("stats.badgesMsg")}
        glyph="★"
      />
    )

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {achievements.map((a) => (
        <PaperCard
          key={a.id}
          style={{
            width: `${100 / tileColumns - 2}%`,
            minWidth: 108,
          }}
        >
          <View style={{ gap: 4 }}>
            <Text
              style={[
                paperType.greeting,
                { color: paper.gold, fontSize: 34, lineHeight: 38 },
              ]}
            >
              {a.achievement_id.slice(0, 1)}
            </Text>
            <Text
              numberOfLines={1}
              style={[
                paperType.cardTitleSm,
                { color: paper.ink, fontSize: 14 },
              ]}
            >
              {a.achievement_id}
            </Text>
            <Text style={[paperType.statLabel, { color: paper.inkMuted }]}>
              {new Date(a.unlocked_at).toLocaleDateString()}
            </Text>
          </View>
        </PaperCard>
      ))}
    </View>
  )
}
