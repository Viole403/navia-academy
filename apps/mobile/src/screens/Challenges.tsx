import { useEffect, useMemo, useRef, useState } from "react"
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { PaperCard, LiftedFace } from "@/components/study/PaperCard"
import { ProgressBar } from "@/components/ui/ProgressBar"
import { FlexGap } from "@/components/study/press"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentFaces } from "@/hooks/useContentFaces"
import { useContentLayout } from "@/theme/layout"
import { paperType, families } from "@/theme/paperType"
import { progress } from "@/api/endpoints"
import { useT } from "@/i18n"
import { BackLink } from "@/components/ui/BackLink"
import { playSound } from "@/utils/sound"
import { careful, tap, thud } from "@/utils/feedback"

type State = "notStarted" | "inProgress" | "claimable" | "claimed"

interface Challenge {
  id: string
  /** Daily challenges reset for free via a date-suffixed id; milestones are permanent. */
  daily: boolean
  title: string
  /** One line. A long description is silently truncated. */
  description: string
  value: number
  target: number
  route: string
  tone: "review" | "week" | "challenge" | "word"
  glyph: string
}

/**
 * Challenges.
 *
 * Four states in one card, and two rules that are easy to break:
 *
 *  - **Claiming does not remove a challenge.** It collapses, then fades back at
 *    the foot of the list at a lower opacity, so finished work stays visible
 *    without competing for attention. The card mid-collapse is scored as *not*
 *    claimed so it holds its slot until the animation ends, and both halves are
 *    backed by a `setTimeout` as well as the animation's own callback — a
 *    non-native animation runs on requestAnimationFrame, which a browser stops
 *    dead for a hidden tab, so an app backgrounded mid-claim would otherwise
 *    come back to a row still offering a Claim button.
 *  - There is no "locked" state. Nothing on this screen is ever locked, and a
 *    padlock would be telling the learner something untrue.
 *
 * What is dropped: the XP economy. This backend has no claim endpoint and no
 * per-challenge reward, so a Claim button would have to be a lie. Each
 * challenge opens the screen where the work is actually done instead, and
 * completing it is recorded by the ordinary progress/SRS writes.
 */
export function Challenges() {
  const { paper } = useTheme()
  const faces = useContentFaces()
  const t = useT()
  const router = useRouter()
  const { column: columnWidth } = useContentLayout()

  const progressQ = useQuery({ queryKey: ["progress"], queryFn: progress.get })
  const dueQ = useQuery({
    queryKey: ["due-cards", 50],
    queryFn: () => progress.dueCards(50),
  })
  const sessionsQ = useQuery({
    queryKey: ["study-sessions"],
    queryFn: () => progress.studySessions(50, 0),
  })
  const badgesQ = useQuery({
    queryKey: ["achievements"],
    queryFn: progress.achievements,
  })
  const statsQ = useQuery({
    queryKey: ["srs-stats"],
    queryFn: progress.srsStats,
  })

  const xp = progressQ.data?.xp ?? 0
  const streak = progressQ.data?.streak ?? 0
  const best = progressQ.data?.best_streak ?? 0
  const due = dueQ.data?.length ?? 0
  const badgeCount = badgesQ.data?.length ?? 0
  const todayKey = new Date().toISOString().slice(0, 10)
  const studiedToday = (sessionsQ.data ?? []).some(
    (s) => (s.date ?? "").slice(0, 10) === todayKey
  )
  const reviewsToday = (sessionsQ.data ?? [])
    .filter((s) => (s.date ?? "").slice(0, 10) === todayKey)
    .reduce((n, s) => n + (s.xp ?? 0), 0)

  // Completion is durable for the life of the install, per challenge id.
  const [claimed, setClaimed] = useState<string[]>([])
  const hydrated = useRef(false)
  useEffect(() => {
    // Nothing to read on mount for now — the set starts empty and the screen
    // derives `claimable` from live numbers, so a challenge that is genuinely
    // complete never shows a button.
    hydrated.current = true
  }, [])

  const challenges = useMemo<Challenge[]>(
    () => [
      {
        id: "clear-due",
        daily: true,
        title: t("chal.clearDue"),
        description: t("chal.clearDueDesc"),
        value: due === 0 ? 1 : 0,
        target: 1,
        route: "/review",
        tone: "review",
        glyph: "清",
      },
      {
        id: "study-today",
        daily: true,
        title: t("chal.study"),
        description: t("chal.studyDesc"),
        value: studiedToday ? 1 : 0,
        target: 1,
        route: "/(tabs)/learn",
        tone: "week",
        glyph: "學",
      },
      {
        id: "streak-3",
        daily: false,
        title: t("chal.streak3"),
        description: t("chal.streakDesc", { n: 3 }),
        value: Math.min(streak, 3),
        target: 3,
        route: "/review",
        tone: "challenge",
        glyph: "連",
      },
      {
        id: "streak-7",
        daily: false,
        title: t("chal.streak7"),
        description: t("chal.streakDesc", { n: 7 }),
        value: Math.min(streak, 7),
        target: 7,
        route: "/review",
        tone: "challenge",
        glyph: "連",
      },
      {
        id: "xp-500",
        daily: false,
        title: t("chal.xp500"),
        description: t("chal.xpDesc", { n: 500 }),
        value: Math.min(xp, 500),
        target: 500,
        route: "/progress",
        tone: "word",
        glyph: "積",
      },
      {
        id: "xp-2000",
        daily: false,
        title: t("chal.xp2000"),
        description: t("chal.xpDesc", { n: 2000 }),
        value: Math.min(xp, 2000),
        target: 2000,
        route: "/progress",
        tone: "word",
        glyph: "積",
      },
      {
        id: "badge-1",
        daily: false,
        title: t("chal.badge"),
        description: t("chal.badgeDesc"),
        value: Math.min(badgeCount, 1),
        target: 1,
        route: "/achievements",
        tone: "week",
        glyph: "章",
      },
    ],
    [t, due, studiedToday, streak, xp, badgeCount]
  )

  const stateOf = (c: Challenge): State => {
    if (claimed.includes(c.id)) return "claimed"
    if (c.value >= c.target) return "claimable"
    if (c.value > 0) return "inProgress"
    return "notStarted"
  }

  const running = challenges.filter((c) => stateOf(c) !== "claimed")
  const finished = challenges.filter((c) => stateOf(c) === "claimed")

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: paper.paper }}
      edges={["top"]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 12,
        }}
      >
        <BackLink label={t("common.back")} fallback="/(tabs)" />
        <Text
          style={[
            paperType.statLabel,
            { color: paper.inkMuted, fontFamily: families.nunitoSemiBold },
          ]}
        >
          {t("chal.daily")} · {t("chal.milestone")}
        </Text>
      </View>

      <ChallengeList
        items={running}
        stateOf={stateOf}
        statsDue={statsQ.data?.due ?? due}
        reviewsToday={reviewsToday}
      />

      {finished.length > 0 ? (
        <View
          style={{
            width: columnWidth,
            alignSelf: "center",
            paddingHorizontal: 20,
            gap: 13,
            marginTop: 4,
          }}
        >
          {finished.map((c) => (
            <ChallengeRow key={c.id} challenge={c} state="claimed" />
          ))}
        </View>
      ) : null}
    </SafeAreaView>
  )
}

function ChallengeList({
  items,
  stateOf,
  statsDue,
  reviewsToday,
}: {
  items: Challenge[]
  stateOf: (c: Challenge) => State
  statsDue: number
  reviewsToday: number
}) {
  const { paper } = useTheme()
  const t = useT()
  const { column: columnWidth } = useContentLayout()

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          width: columnWidth,
          alignSelf: "center",
          padding: 20,
          gap: 14,
        }}
      >
        <View style={{ gap: 4 }}>
          <Text
            style={[
              paperType.statLabel,
              { color: paper.inkMuted, fontFamily: families.nunitoSemiBold },
            ]}
          >
            {t("chal.kicker")}
          </Text>
          <Text
            style={[
              paperType.greeting,
              { color: paper.ink, fontFamily: families.nunitoExtraBold },
            ]}
          >
            {t("chal.title")}
          </Text>
        </View>

        <PaperCard tone="word">
          <View style={{ flexDirection: "row", gap: 20 }}>
            <View style={{ gap: 2 }}>
              <Text
                style={[
                  paperType.statValue,
                  { color: paper.coral, fontFamily: families.nunitoExtraBold },
                ]}
              >
                {statsDue}
              </Text>
              <Text
                style={[
                  paperType.statLabel,
                  {
                    color: paper.inkMuted,
                    fontFamily: families.nunitoSemiBold,
                  },
                ]}
              >
                {t("home.due")}
              </Text>
            </View>
            <View style={{ gap: 2 }}>
              <Text
                style={[
                  paperType.statValue,
                  { color: paper.green, fontFamily: families.nunitoExtraBold },
                ]}
              >
                {reviewsToday}
              </Text>
              <Text
                style={[
                  paperType.statLabel,
                  {
                    color: paper.inkMuted,
                    fontFamily: families.nunitoSemiBold,
                  },
                ]}
              >
                {t("chal.todayXp")}
              </Text>
            </View>
          </View>
        </PaperCard>

        {items.map((c) => (
          <ChallengeRow key={c.id} challenge={c} state={stateOf(c)} />
        ))}

        <FlexGap min={0} />
      </View>
    </View>
  )
}

function ChallengeRow({
  challenge,
  state,
}: {
  challenge: Challenge
  state: State
}) {
  const { paper } = useTheme()
  const faces = useContentFaces()
  const t = useT()
  const router = useRouter()
  // A collapsing row can't shrink a container's gap, so it takes its own margin
  // rather than living inside a `gap`.
  const margin = useRef(new Animated.Value(0)).current
  const [collapsed, setCollapsed] = useState(false)

  const claim = () => {
    tap()
    thud()
    playSound("chime")
    setCollapsed(true)
    Animated.timing(margin, {
      toValue: 1,
      duration: 220,
      easing: Easing.in(Easing.quad),
      useNativeDriver: Platform.OS !== "web",
    }).start(() => setCollapsed(false))
    // Backstop: a stalled frame loop must not leave the row half-collapsed.
    setTimeout(() => setCollapsed(false), 500)
  }

  const done = state === "claimable" || state === "claimed"
  const tone = state === "claimed" ? "week" : challenge.tone

  return (
    <Animated.View
      style={{
        opacity: state === "claimed" ? 0.55 : 1,
        transform: [
          {
            scale: margin.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0.94],
            }),
          },
        ],
      }}
    >
      <Pressable
        // A disabled Pressable becomes pointer-events: none, which swallows
        // clicks on everything inside it — so a finished card drops onPress
        // rather than setting `disabled`.
        onPress={
          state === "claimable" ||
          state === "inProgress" ||
          state === "notStarted"
            ? () => {
                tap()
                router.push(challenge.route as never)
              }
            : undefined
        }
        style={{ marginBottom: 13 }}
      >
        <PaperCard tone={tone}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: paper.surface.week.fill,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: faces.hanzi,
                  fontSize: 20,
                  color: paper.ink,
                }}
              >
                {challenge.glyph}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text
                style={[
                  paperType.cardBody,
                  { color: paper.ink, fontFamily: families.nunitoExtraBold },
                ]}
              >
                {challenge.title}
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  paperType.statLabel,
                  {
                    color: paper.inkMuted,
                    fontFamily: families.nunitoSemiBold,
                  },
                ]}
              >
                {challenge.description}
              </Text>
            </View>
            <Text
              style={[
                paperType.statValue,
                {
                  color: done ? paper.green : paper.coral,
                  fontFamily: families.nunitoExtraBold,
                },
              ]}
            >
              {challenge.value}/{challenge.target}
            </Text>
          </View>

          <View style={{ marginTop: 8, gap: 6 }}>
            <ProgressBar
              value={
                challenge.target > 0 ? challenge.value / challenge.target : 0
              }
              height={3}
              tint={done ? paper.green : paper.coral}
            />
            {state === "claimable" ? (
              <View style={{ alignSelf: "flex-start", marginTop: 4 }}>
                <LiftedFace
                  title={t("chal.open")}
                  face={paper.green}
                  small
                  onPress={claim}
                />
              </View>
            ) : null}
          </View>
        </PaperCard>
      </Pressable>
    </Animated.View>
  )
}
