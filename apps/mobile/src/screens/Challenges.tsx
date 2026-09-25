import { ActivityIndicator, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { Screen } from "@/components/ui/Screen"
import { ProgressBar } from "@/components/ui/ProgressBar"
import { StudyCard, SectionHeader } from "@/components/study/StudyCard"
import { CONTENT_MAX, spacing, studyType } from "@/components/study/tokens"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts } from "@/theme/typography"
import { progress } from "@/api/endpoints"
import { useT } from "@/i18n"
import { tap } from "@/utils/feedback"

interface Tile {
  id: string
  title: string
  detail: string
  value: number
  target: number
  route: string
}

/**
 * Challenges — ported from Chinese-Easy `Challenges.tsx` minus the claim
 * economy: Navia's backend has no challenge-claim endpoint, so tiles are
 * progress-only (done tiles stay visible at the foot, like the reference).
 */
export function Challenges() {
  const { theme } = useTheme()
  const t = useT()
  const router = useRouter()

  const progressQ = useQuery({ queryKey: ["progress"], queryFn: progress.get })
  const dueQ = useQuery({
    queryKey: ["due-cards"],
    queryFn: () => progress.dueCards(),
  })
  const sessionsQ = useQuery({
    queryKey: ["study-sessions"],
    queryFn: () => progress.studySessions(50, 0),
  })
  const badgesQ = useQuery({
    queryKey: ["achievements"],
    queryFn: progress.achievements,
  })

  const xp = progressQ.data?.xp ?? 0
  const streak = progressQ.data?.streak ?? 0
  const due = dueQ.data?.length ?? 0
  const todayKey = new Date().toISOString().slice(0, 10)
  const studiedToday = (sessionsQ.data ?? []).some(
    (s) => (s.date ?? "").slice(0, 10) === todayKey
  )
  const badgeCount = badgesQ.data?.length ?? 0

  const daily: Tile[] = [
    {
      id: "clear-due",
      title: t("home.reviewTitle"),
      detail: `${due} ${t("home.waiting")}`,
      value: due === 0 ? 1 : 0,
      target: 1,
      route: "/review",
    },
    {
      id: "study-today",
      title: t("home.dailyGoal"),
      detail: studiedToday ? t("chal.done") : t("learn.comeBack"),
      value: studiedToday ? 1 : 0,
      target: 1,
      route: "/(tabs)/learn",
    },
  ]
  const milestones: Tile[] = [
    {
      id: "streak-3",
      title: `${t("home.streak")} 3`,
      detail: `${streak} / 3`,
      value: Math.min(streak, 3),
      target: 3,
      route: "/progress",
    },
    {
      id: "streak-7",
      title: `${t("home.streak")} 7`,
      detail: `${streak} / 7`,
      value: Math.min(streak, 7),
      target: 7,
      route: "/progress",
    },
    {
      id: "xp-500",
      title: `${t("home.xp")} 500`,
      detail: `${xp} / 500`,
      value: Math.min(xp, 500),
      target: 500,
      route: "/progress",
    },
    {
      id: "xp-2000",
      title: `${t("home.xp")} 2000`,
      detail: `${xp} / 2000`,
      value: Math.min(xp, 2000),
      target: 2000,
      route: "/progress",
    },
    {
      id: "badges-1",
      title: `${t("stats.badges")} 1`,
      detail: `${badgeCount} / 1`,
      value: Math.min(badgeCount, 1),
      target: 1,
      route: "/achievements",
    },
  ]

  const loading = progressQ.isLoading || dueQ.isLoading

  return (
    <Screen>
      <View
        style={{
          width: "100%",
          maxWidth: CONTENT_MAX,
          alignSelf: "center",
          gap: spacing.lg,
        }}
      >
        <SectionHeader kicker={t("chal.kicker")} title={t("chal.title")} />
        {loading ? (
          <ActivityIndicator color={theme.accent} />
        ) : (
          <>
            <Text
              style={[
                studyType.cardTitleSm,
                {
                  color: theme.textMuted,
                  fontFamily: fonts.sans,
                  fontWeight: "800",
                },
              ]}
            >
              {t("chal.daily")}
            </Text>
            {daily.map((c) => (
              <TileRow
                key={c.id}
                tile={c}
                doneLabel={t("chal.done")}
                openLabel={t("chal.open")}
                onOpen={(r) => router.push(r as never)}
              />
            ))}
            <Text
              style={[
                studyType.cardTitleSm,
                {
                  color: theme.textMuted,
                  fontFamily: fonts.sans,
                  fontWeight: "800",
                  marginTop: spacing.sm,
                },
              ]}
            >
              {t("chal.milestone")}
            </Text>
            {milestones.map((c) => (
              <TileRow
                key={c.id}
                tile={c}
                doneLabel={t("chal.done")}
                openLabel={t("chal.open")}
                onOpen={(r) => router.push(r as never)}
              />
            ))}
          </>
        )}
      </View>
    </Screen>
  )
}

function TileRow({
  tile,
  doneLabel,
  openLabel,
  onOpen,
}: {
  tile: Tile
  doneLabel: string
  openLabel: string
  onOpen: (route: string) => void
}) {
  const { theme } = useTheme()
  const done = tile.value >= tile.target
  return (
    <StudyCard
      tone={done ? "week" : "challenge"}
      title={tile.title}
      body={tile.detail}
      tag={done ? doneLabel.toUpperCase() : undefined}
      onPress={
        done
          ? undefined
          : () => {
              tap()
              onOpen(tile.route)
            }
      }
    >
      <ProgressBar
        value={tile.target > 0 ? tile.value / tile.target : 0}
        height={3}
        tint={done ? theme.green : theme.accent2}
      />
      {!done && (
        <Text
          style={[
            studyType.link,
            { color: theme.accent2, fontFamily: fonts.sans, fontWeight: "700" },
          ]}
        >
          {openLabel} →
        </Text>
      )}
    </StudyCard>
  )
}
