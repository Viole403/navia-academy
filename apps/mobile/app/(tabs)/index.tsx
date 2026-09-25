import { useMemo, useState } from "react"
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Motif } from "@/components/ui/Motif"
import { EmptyState } from "@/components/ui/EmptyState"
import { ProgressBar } from "@/components/ui/ProgressBar"
import { StudyCard } from "@/components/study/StudyCard"
import { LiftedButton } from "@/components/study/LiftedButton"
import { SpeechBubble, WeekStrip } from "@/components/study/StudyBits"
import {
  useEntranceRun,
  useReveal,
  useTypewriter,
} from "@/components/study/Reveal"
import {
  CONTENT_MAX,
  entranceScore,
  spacing,
  studyType,
} from "@/components/study/tokens"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"
import { exam, progress } from "@/api/endpoints"
import { loadVocabulary } from "@/lib/content-data"
import { useAuthStore } from "@/store/auth"
import { useOnboardingStore } from "@/store/onboarding"
import { headword, motifChar, reading } from "@/lib/languages"
import { useLocaleStore, useT } from "@/i18n"
import { tap } from "@/utils/feedback"

/**
 * Today — composed like Chinese-Easy's Dashboard: a hero (greeting +
 * coach bubble) over pure-presentation cards (Review / New word /
 * Challenges / This week), each a function of numbers fetched above.
 * The whole column caps at CONTENT_MAX and centres on wider screens.
 */
export default function HomeTab() {
  const { theme } = useTheme()
  const router = useRouter()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const language = useOnboardingStore((s) => s.language)
  const { width } = useWindowDimensions()
  const columnWidth = Math.min(width, CONTENT_MAX)

  const progressQ = useQuery({ queryKey: ["progress"], queryFn: progress.get })
  const dueCardsQ = useQuery({
    queryKey: ["due-cards"],
    queryFn: () => progress.dueCards(),
  })
  const srsStatsQ = useQuery({
    queryKey: ["srs-stats"],
    queryFn: progress.srsStats,
  })
  const sessionsQ = useQuery({
    queryKey: ["study-sessions"],
    queryFn: () => progress.studySessions(50, 0),
  })
  const recommendedQ = useQuery({
    queryKey: ["exam-recommended"],
    queryFn: exam.recommended,
  })
  const vocabQ = useQuery({
    queryKey: ["wotd", language],
    queryFn: () => loadVocabulary(language),
    staleTime: 86_400_000,
  })

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return t("home.morning")
    if (h < 18) return t("home.afternoon")
    return t("home.evening")
  }, [t])

  const due = dueCardsQ.data?.length ?? 0
  const streak = progressQ.data?.streak ?? 0
  const todayKey = new Date().toISOString().slice(0, 10)
  const studiedToday = useMemo(
    () =>
      (sessionsQ.data ?? []).some(
        (s) => (s.date ?? "").slice(0, 10) === todayKey
      ),
    [sessionsQ.data, todayKey]
  )

  const coach = useMemo(() => {
    if (due > 0) return `${due} ${t("home.reviewBody")}`
    if (streak > 0 && !studiedToday) return t("home.coachRisk")
    if (streak >= 3) return `${streak} ${t("home.coachStreak")}`
    return t("home.coachDefault")
  }, [due, streak, studiedToday, t])

  // Deterministic word of the day from the real CDN bundle (was hardcoded).
  const word = useMemo(() => {
    const all = vocabQ.data ?? []
    if (all.length === 0) return null
    const d = Math.floor(Date.now() / 86_400_000)
    return all[d % all.length]
  }, [vocabQ.data])

  const [dismissed, setDismissed] = useState(false)
  const [addedId, setAddedId] = useState<string | null>(null)
  const showWord = !dismissed && !!word && addedId !== word?.id

  const addM = useMutation({
    mutationFn: (id: string) => progress.ensureCard(id, "word"),
    onSuccess: (_, id) => {
      setAddedId(id)
      qc.invalidateQueries({ queryKey: ["due-cards"] })
      qc.invalidateQueries({ queryKey: ["srs-stats"] })
    },
  })

  const run = useEntranceRun()
  const gR = useReveal({
    at: entranceScore.greeting.at,
    duration: entranceScore.greeting.for,
    run,
  })
  const c0 = useReveal({
    at: entranceScore.cards.at,
    duration: entranceScore.cards.for,
    run,
  })
  const c1 = useReveal({
    at: entranceScore.cards.at + entranceScore.cards.stagger,
    duration: entranceScore.cards.for,
    run,
  })
  const c2 = useReveal({
    at: entranceScore.cards.at + entranceScore.cards.stagger * 2,
    duration: entranceScore.cards.for,
    run,
  })
  const c3 = useReveal({
    at: entranceScore.cards.at + entranceScore.cards.stagger * 3,
    duration: entranceScore.cards.for,
    run,
  })
  const typed = useTypewriter(coach.length, run)
  const isLoading = progressQ.isLoading || dueCardsQ.isLoading

  const refreshing =
    progressQ.isRefetching || dueCardsQ.isRefetching || sessionsQ.isRefetching

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.bg }}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={{
          paddingBottom: 48,
          flexGrow: 1,
          alignItems: "center",
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              progressQ.refetch()
              dueCardsQ.refetch()
              srsStatsQ.refetch()
              sessionsQ.refetch()
            }}
            tintColor={theme.accent}
          />
        }
      >
        <View
          style={{
            width: columnWidth,
            padding: spacing.screen,
            gap: spacing.cardGap,
          }}
        >
          {/* Hero */}
          <Animated.View
            style={{
              opacity: gR.opacity,
              transform: [{ translateX: gR.translate }],
            }}
          >
            <View style={{ gap: spacing.md }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: spacing.md,
                }}
              >
                <View style={{ flex: 1, gap: spacing.sm }}>
                  <Text style={[type.labelSm, { color: theme.textMuted }]}>
                    {new Date().toLocaleDateString(
                      locale === "id" ? "id-ID" : "en-US",
                      { weekday: "long", month: "long", day: "numeric" }
                    )}
                  </Text>
                  <Text
                    style={[
                      studyType.greeting,
                      {
                        color: theme.text,
                        fontFamily: fonts.sans,
                        fontWeight: "800",
                      },
                    ]}
                  >
                    {greeting},{"\n"}
                    <Text
                      style={{
                        color: theme.accent,
                        fontStyle: "italic",
                        fontFamily: fonts.serif,
                      }}
                    >
                      {user?.name?.split(" ")[0] ?? t("home.reader")}.
                    </Text>
                  </Text>
                </View>
                <Motif char={motifChar(language)} size={64} />
              </View>
              <SpeechBubble text={coach.slice(0, typed)} />
              <View style={{ height: 1, backgroundColor: theme.border }} />
            </View>
          </Animated.View>

          {isLoading ? (
            <ActivityIndicator color={theme.accent} />
          ) : (
            <>
              {/* Review */}
              <Animated.View
                style={{
                  opacity: c0.opacity,
                  transform: [{ translateY: c0.translate }],
                }}
              >
                <StudyCard
                  tone="review"
                  tag={t("home.reviewTitle").toUpperCase()}
                  title={t("home.reviewTitle")}
                  body={
                    due > 0
                      ? `${due} ${t("home.reviewBody")}`
                      : t("home.reviewBodyNone")
                  }
                >
                  {due > 0 ? (
                    <LiftedButton
                      title={t("home.startReview")}
                      onPress={() => {
                        tap()
                        router.push("/review")
                      }}
                    />
                  ) : (
                    <Pressable
                      onPress={() => {
                        tap()
                        router.push("/(tabs)/learn")
                      }}
                    >
                      <Text
                        style={[
                          studyType.link,
                          {
                            color: theme.accent,
                            fontFamily: fonts.sans,
                            fontWeight: "700",
                          },
                        ]}
                      >
                        {t("home.browseVocab")} →
                      </Text>
                    </Pressable>
                  )}
                </StudyCard>
              </Animated.View>

              {/* New word */}
              {showWord && word && (
                <Animated.View
                  style={{
                    opacity: c1.opacity,
                    transform: [{ translateY: c1.translate }],
                  }}
                >
                  <StudyCard
                    tone="word"
                    tag={t("home.newWordTitle").toUpperCase()}
                    title={headword(word)}
                    body={`${reading(word) ?? ""}${reading(word) ? " · " : ""}${String(word.translation ?? "")}`}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.serif,
                        fontSize: 64,
                        lineHeight: 76,
                        color: theme.text,
                      }}
                    >
                      {headword(word)}
                    </Text>
                    {addedId === word.id ? (
                      <Text
                        style={[
                          studyType.link,
                          {
                            color: theme.green,
                            fontFamily: fonts.sans,
                            fontWeight: "700",
                          },
                        ]}
                      >
                        {t("home.addedWord")}
                      </Text>
                    ) : (
                      <View style={{ flexDirection: "row", gap: spacing.sm }}>
                        <View style={{ flex: 1 }}>
                          <LiftedButton
                            small
                            title={
                              addM.isPending
                                ? t("common.loading")
                                : t("home.addWord")
                            }
                            onPress={() => {
                              tap()
                              addM.mutate(word.id)
                            }}
                          />
                        </View>
                        <Pressable
                          onPress={() => {
                            tap()
                            setDismissed(true)
                          }}
                          style={{
                            justifyContent: "center",
                            paddingHorizontal: spacing.md,
                          }}
                        >
                          <Text
                            style={[
                              studyType.link,
                              {
                                color: theme.textMuted,
                                fontFamily: fonts.sans,
                                fontWeight: "700",
                              },
                            ]}
                          >
                            {t("home.dismiss")}
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  </StudyCard>
                </Animated.View>
              )}

              {/* Challenges */}
              <Animated.View
                style={{
                  opacity: c2.opacity,
                  transform: [{ translateY: c2.translate }],
                }}
              >
                <StudyCard
                  tone="challenge"
                  tag={t("home.challengesTitle").toUpperCase()}
                  title={`${streak} ${t("home.streak")}`}
                  body={`${srsStatsQ.data?.due ?? 0} ${t("home.waiting")} · ${t("home.challengesBody")}`}
                  onPress={() => {
                    tap()
                    router.push("/challenges")
                  }}
                >
                  <Text
                    style={[
                      studyType.link,
                      {
                        color: theme.accent2,
                        fontFamily: fonts.sans,
                        fontWeight: "700",
                      },
                    ]}
                  >
                    {t("home.viewAll")} →
                  </Text>
                </StudyCard>
              </Animated.View>

              {/* This week */}
              <Animated.View
                style={{
                  opacity: c3.opacity,
                  transform: [{ translateY: c3.translate }],
                }}
              >
                <StudyCard
                  tone="week"
                  tag={t("home.weekTitle").toUpperCase()}
                  onPress={() => {
                    tap()
                    router.push("/progress")
                  }}
                >
                  <WeekStrip sessions={sessionsQ.data ?? []} />
                  <Text
                    style={[
                      studyType.link,
                      {
                        color: theme.green,
                        fontFamily: fonts.sans,
                        fontWeight: "700",
                      },
                    ]}
                  >
                    {t("home.viewProgress")} →
                  </Text>
                </StudyCard>
              </Animated.View>

              {/* Recommended exam */}
              {recommendedQ.data && (
                <StudyCard tone="neutral">
                  <Text
                    style={[
                      studyType.cardBody,
                      { color: theme.textMuted, fontFamily: fonts.sans },
                    ]}
                  >
                    {t("home.recommendedExam")}
                  </Text>
                  <LiftedButton
                    title={`${t("home.start")} ${recommendedQ.data.examType.toUpperCase()} ${recommendedQ.data.examLevel}`}
                    onPress={() => {
                      tap()
                      router.push("/(tabs)/exam")
                    }}
                  />
                </StudyCard>
              )}

              {/* Daily goal */}
              <View style={{ gap: spacing.sm }}>
                <ProgressBar
                  value={studiedToday ? 1 : 0}
                  height={3}
                  tint={theme.accent}
                />
              </View>

              {due === 0 && !recommendedQ.data && (
                <EmptyState
                  title={t("home.allCaughtUp")}
                  message={t("home.caughtUpMsg")}
                  glyph={motifChar(language)}
                />
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
