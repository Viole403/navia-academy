import { useMemo, useState } from "react"
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { DashboardHero } from "@/components/study/DashboardHero"
import {
  ReviewCard,
  NewWordCard,
  ChallengesSummaryCard,
  WeeklyActivityCard,
} from "@/components/study/dashboardCards"
import { LiftedFace } from "@/components/study/PaperCard"
import { FlexGap } from "@/components/study/press"
import {
  useEntranceRun,
  useReveal,
  useTypewriter,
} from "@/components/study/Reveal"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentLayout } from "@/theme/layout"
import { paperType, families } from "@/theme/paperType"
import { exam, progress } from "@/api/endpoints"
import { loadVocabulary } from "@/lib/content-data"
import { useAuthStore } from "@/store/auth"
import { useOnboardingStore } from "@/store/onboarding"
import { headword, reading } from "@/lib/languages"
import { useLocaleStore, useT } from "@/i18n"
import { playSound } from "@/utils/sound"
import { careful, tap } from "@/utils/feedback"

/**
 * Hero height, measured against the first viewport on a 390×844 screen. Taller
 * than this and the last card falls past the fold, and the point of the last
 * card is the two buttons underneath it.
 */
const HERO_HEIGHT = 268
const entrance = {
  scenery: { at: 0, for: 560 },
  greeting: { at: 170, for: 460 },
  cards: { at: 360, for: 440, stagger: 90 },
  shifu: { at: 600, for: 540 },
  bubble: { at: 1120, for: 300 },
  typingPerChar: 16,
  backstop: 140,
}

/**
 * Today.
 *
 * The scene assembles itself in the order a person would draw it: scenery
 *
 * The scene assembles itself in the order a person would draw it: scenery
 * first, then who is being spoken to, then what there is to do, then the coach's
 * line typed on. Every card is a pure function of numbers fetched above; the
 * wiring lives here and nowhere else.
 *
 * Coming back to this screen means coming back to the greeting, not to wherever
 * the last visit left the scroll.
 */
export default function HomeTab() {
  const { paper } = useTheme()
  const router = useRouter()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const language = useOnboardingStore((s) => s.language)
  const { column: columnWidth } = useContentLayout()

  const progressQ = useQuery({ queryKey: ["progress"], queryFn: progress.get })
  const dueCardsQ = useQuery({
    queryKey: ["due-cards", 50],
    queryFn: () => progress.dueCards(50),
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
  const atRisk = streak > 0 && !studiedToday

  const coach = useMemo(() => {
    if (atRisk) return t("home.coachRisk")
    if (streak >= 3) return t("home.coachStreak").replace("%d", String(streak))
    return t("home.coachDefault")
  }, [atRisk, streak, t])

  // Deterministic word of the day from the real CDN bundle.
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
      playSound("chime")
      qc.invalidateQueries({ queryKey: ["due-cards"] })
      qc.invalidateQueries({ queryKey: ["srs-stats"] })
    },
  })

  const run = useEntranceRun()
  const gR = useReveal({
    at: entrance.greeting.at,
    duration: entrance.greeting.for,
    run,
  })
  const c0 = useReveal({
    at: entrance.cards.at,
    duration: entrance.cards.for,
    run,
  })
  const c1 = useReveal({
    at: entrance.cards.at + entrance.cards.stagger,
    duration: entrance.cards.for,
    run,
  })
  const c2 = useReveal({
    at: entrance.cards.at + entrance.cards.stagger * 2,
    duration: entrance.cards.for,
    run,
  })
  const c3 = useReveal({
    at: entrance.cards.at + entrance.cards.stagger * 3,
    duration: entrance.cards.for,
    run,
  })
  const typed = useTypewriter(coach.length, run, entrance.typingPerChar)

  const loading = progressQ.isLoading || dueCardsQ.isLoading
  const refreshing =
    progressQ.isRefetching || dueCardsQ.isRefetching || sessionsQ.isRefetching

  /*
   * A streak that is alive but untouched today is about to lapse. Warned once
   * per mount — the hero is right there, so the buzz has something to point at
   * rather than arriving out of nowhere.
   */
  const warned = useMemo(() => {
    if (atRisk) {
      careful()
      return true
    }
    return false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atRisk])

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    const base =
      h < 12
        ? t("home.morning")
        : h < 18
          ? t("home.afternoon")
          : t("home.evening")
    return base.replace(",", "")
  }, [t])

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: paper.paper }}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={{
          paddingBottom: 40,
          flexGrow: 1,
          alignItems: "center",
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              progressQ.refetch()
              dueCardsQ.refetch()
              sessionsQ.refetch()
            }}
            tintColor={paper.coral}
          />
        }
      >
        <View style={{ width: columnWidth, padding: 20, gap: 13 }}>
          <DashboardHero
            greeting={greeting}
            name={user?.name?.split(" ")[0] ?? t("home.reader")}
            message={coach}
            typedChars={typed}
            heroHeight={HERO_HEIGHT}
          />

          {loading ? (
            <View style={{ paddingVertical: 40 }}>
              <ActivityIndicator color={paper.coral} />
            </View>
          ) : (
            <View style={{ gap: 13 }}>
              <Animated.View
                style={{
                  opacity: gR.opacity,
                  transform: [{ translateX: gR.translate }],
                }}
              />

              <Animated.View
                style={{
                  opacity: c0.opacity,
                  transform: [{ translateY: c0.translate }],
                }}
              >
                <ReviewCard
                  due={due}
                  onStart={() => {
                    tap()
                    router.push("/review")
                  }}
                />
              </Animated.View>

              {showWord && word ? (
                <Animated.View
                  style={{
                    opacity: c1.opacity,
                    transform: [{ translateY: c1.translate }],
                  }}
                >
                  <NewWordCard
                    word={headword(word)}
                    reading={reading(word)}
                    gloss={String(word.translation ?? "")}
                    added={addedId === word.id}
                    adding={addM.isPending}
                    onOpen={() => {
                      tap()
                      router.push({
                        pathname: "/vocab/[id]",
                        params: { id: word.id },
                      })
                    }}
                    onAdd={() => {
                      tap()
                      addM.mutate(word.id)
                    }}
                    onDismiss={() => {
                      tap()
                      setDismissed(true)
                    }}
                  />
                </Animated.View>
              ) : null}

              <Animated.View
                style={{
                  opacity: c2.opacity,
                  transform: [{ translateY: c2.translate }],
                }}
              >
                <ChallengesSummaryCard
                  streak={streak}
                  due={due}
                  onOpen={() => {
                    tap()
                    router.push("/challenges")
                  }}
                />
              </Animated.View>

              <Animated.View
                style={{
                  opacity: c3.opacity,
                  transform: [{ translateY: c3.translate }],
                }}
              >
                <WeeklyActivityCard
                  sessions={sessionsQ.data ?? []}
                  onOpen={() => {
                    tap()
                    router.push("/progress")
                  }}
                />
              </Animated.View>

              {recommendedQ.data ? (
                <View style={{ gap: 8, marginTop: 4 }}>
                  <Text
                    style={[
                      paperType.label,
                      {
                        color: paper.inkMuted,
                        fontFamily: families.interSemiBold,
                      },
                    ]}
                  >
                    {t("home.recommendedExam")}
                  </Text>
                  <LiftedFace
                    title={`${t("home.start")} ${recommendedQ.data.examType.toUpperCase()} ${recommendedQ.data.examLevel}`}
                    face={paper.coral}
                    onPress={() => {
                      tap()
                      router.push("/(tabs)/exam")
                    }}
                  />
                </View>
              ) : null}

              <FlexGap min={0} />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
