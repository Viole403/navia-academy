import { useMemo } from "react"
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { ReviewHero } from "@/components/study/ReviewHero"
import { PaperCard } from "@/components/study/PaperCard"
import { DrillBadge } from "@/components/study/dashboardCards"
import { FlexGap } from "@/components/study/press"
import { useEntranceRun, useReveal } from "@/components/study/Reveal"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentLayout } from "@/theme/layout"
import { paperType, families } from "@/theme/paperType"
import { progress } from "@/api/endpoints"
import { useT } from "@/i18n"
import { BackLink } from "@/components/ui/BackLink"
import { playSound } from "@/utils/sound"
import { tap } from "@/utils/feedback"
import type { SrsCard } from "@/types/api"

/**
 * The Review hub.
 *
 * The hub and the session are separate screens on purpose: the hub is counters
 * and cards, and each drill is pushed on top of it, so reopening a drill does
 * not stack duplicate hubs behind the back arrow.
 *
 * The three drills map onto what this backend actually knows:
 *  - **Flashcards** — every due card, graded 0–3 (SM-2).
 *  - **Listening** — the same cards, heard rather than seen, graded on answer.
 *  - **Mistakes** — cards the learner has been getting wrong. There is no lapse
 *    counter on the server, so it is `difficult_item_ids` plus low mastery: the
 *    same population, measured by what the backend actually keeps.
 */
export function ReviewHub() {
  const { paper } = useTheme()
  const t = useT()
  const router = useRouter()
  const { column: columnWidth } = useContentLayout()

  const dueQ = useQuery({
    queryKey: ["due-cards", 50],
    queryFn: () => progress.dueCards(50),
  })
  const statsQ = useQuery({
    queryKey: ["srs-stats"],
    queryFn: progress.srsStats,
  })
  const progressQ = useQuery({ queryKey: ["progress"], queryFn: progress.get })

  const due = dueQ.data ?? []
  const difficult = useMemo(
    () => new Set(progressQ.data?.difficult_item_ids ?? []),
    [progressQ.data]
  )
  const mistakes = due.filter(
    (c) => difficult.has(c.item_id) || c.mastery < 40
  ).length

  const run = useEntranceRun()
  const beats = [0, 1, 2].map((i) =>
    useReveal({ at: 260 + i * 90, duration: 440, run, distance: 26 })
  )

  const drills: {
    key: "flashcards" | "listening" | "mistakes"
    count: number | null
    title: string
    body: string
    tone: "review" | "week" | "challenge"
  }[] = [
    {
      key: "flashcards",
      count: due.length,
      title: t("rev.dFlashcards"),
      body: t("rev.bFlashcards"),
      tone: "review",
    },
    {
      key: "listening",
      count: due.length,
      title: t("rev.dListening"),
      body: t("rev.bListening"),
      tone: "week",
    },
    {
      key: "mistakes",
      // A dash reads as "nothing here"; a zero reads as a broken counter.
      count: mistakes > 0 ? mistakes : null,
      title: t("rev.dMistakes"),
      body: mistakes > 0 ? t("rev.bMistakes") : t("rev.bMistakesNone"),
      tone: "challenge",
    },
  ]

  const loading = dueQ.isLoading

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
        <BackLink label={t("common.back")} fallback="/(tabs)/learn" />
        <Text
          style={[
            paperType.statLabel,
            { color: paper.inkMuted, fontFamily: families.nunitoSemiBold },
          ]}
        >
          {t("learn.srs")}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: 40,
          flexGrow: 1,
          alignItems: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: columnWidth, gap: 13, paddingHorizontal: 20 }}>
          <ReviewHero
            headline={t("learn.review")}
            body={
              due.length > 0
                ? t("rev.heroDue", { n: due.length })
                : t("rev.heroClear")
            }
            run={run}
          />

          {loading ? (
            <View style={{ paddingVertical: 32 }}>
              <ActivityIndicator color={paper.coral} />
            </View>
          ) : (
            drills.map((d, i) => {
              const r = beats[i]
              return (
                <Animated.View
                  key={d.key}
                  style={{
                    opacity: r.opacity,
                    transform: [{ translateY: r.translate }],
                  }}
                >
                  <PaperCard
                    tone={d.tone}
                    onPress={() => {
                      tap()
                      playSound("tap")
                      router.push({
                        pathname: "/review-session",
                        params: { mode: d.key },
                      })
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 14,
                      }}
                    >
                      <DrillBadge source={d.key} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text
                          style={[
                            paperType.cardTitle,
                            {
                              color: paper.ink,
                              fontFamily: families.nunitoExtraBold,
                            },
                          ]}
                        >
                          {d.title}
                        </Text>
                        <Text
                          style={[
                            paperType.cardBody,
                            {
                              color: paper.inkSoft,
                              fontFamily: families.nunitoSemiBold,
                            },
                          ]}
                        >
                          {d.body}
                        </Text>
                      </View>
                      <Text
                        style={[
                          paperType.statValue,
                          {
                            color:
                              d.key === "flashcards"
                                ? paper.coral
                                : d.key === "listening"
                                  ? paper.green
                                  : paper.lavender,
                            fontFamily: families.nunitoExtraBold,
                          },
                        ]}
                      >
                        {d.count ?? "—"}
                      </Text>
                    </View>
                  </PaperCard>
                </Animated.View>
              )
            })
          )}

          <PaperCard
            tone="word"
            title={t("learn.listening")}
            body={t("learn.listeningDesc")}
            onPress={() => {
              tap()
              router.push("/listening-drill")
            }}
          />

          <FlexGap min={0} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export type ReviewDrill = SrsCard
