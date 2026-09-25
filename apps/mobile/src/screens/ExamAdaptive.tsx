import { useMemo, useState } from "react"
import { ActivityIndicator, Pressable, Text, View } from "react-native"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Stack, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { Screen } from "@/components/ui/Screen"
import { EmptyState } from "@/components/ui/EmptyState"
import { ProgressBar } from "@/components/ui/ProgressBar"
import { StudyCard, SectionHeader } from "@/components/study/StudyCard"
import { LiftedButton } from "@/components/study/LiftedButton"
import { CONTENT_MAX, spacing, studyType } from "@/components/study/tokens"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"
import { cat } from "@/api/endpoints"
import { loadPlacement } from "@/lib/content-data"
import { languageInfo, motifChar } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useTts } from "@/hooks/useTts"
import { useT } from "@/i18n"
import { tap, thud } from "@/utils/feedback"
import type { CatAnswer, PlacementItem } from "@/types/api"

const MAX_QUESTIONS = 12
const REVEAL_MS = 650

/**
 * /exam-adaptive — repeatable adaptive session (web parity:
 * /exam/adaptive). Same band-walk + elo-v1 submit semantics as the
 * onboarding placement test, but repeatable practice: it records a CAT
 * result and shows past estimates instead of gating onboarding.
 */
export function ExamAdaptive() {
  const { theme } = useTheme()
  const t = useT()
  const router = useRouter()
  const qc = useQueryClient()
  const language = useOnboardingStore((s) => s.language)
  const examType = useOnboardingStore((s) => s.examType)
  const tts = useTts()

  const [started, setStarted] = useState(false)
  const [band, setBand] = useState(3)
  const [asked, setAsked] = useState<string[]>([])
  const [answered, setAnswered] = useState<
    { item: PlacementItem; correct: boolean }[]
  >([])
  const [picked, setPicked] = useState<string | null>(null)
  const [revealing, setRevealing] = useState(false)
  const [startTs, setStartTs] = useState(0)

  const bankQ = useQuery({
    queryKey: ["placement", language],
    queryFn: () => loadPlacement(language),
  })
  const historyQ = useQuery({
    queryKey: ["cat-progress"],
    queryFn: cat.progress,
  })

  const bank = bankQ.data ?? []
  const current = useMemo<PlacementItem | null>(() => {
    if (!started || bank.length === 0) return null
    const pool = bank.filter((q) => !asked.includes(q.id))
    if (pool.length === 0) return null
    pool.sort((a, b) => Math.abs(a.band - band) - Math.abs(b.band - band))
    return pool[0] ?? null
  }, [started, bank, asked, band])

  const finished =
    answered.length > 0 && (answered.length >= MAX_QUESTIONS || !current)
  const correctCount = answered.filter((a) => a.correct).length

  const saveM = useMutation({
    mutationFn: async () => {
      const type = examType ?? languageInfo(language).examTypes[0]
      const answers: CatAnswer[] = answered.map((a) => ({
        item_id: a.item.id,
        item_elo: a.item.band * 100,
        correct: a.correct,
        format: "multiple-choice",
      }))
      await cat.submitResult({
        exam_type: type,
        elo_estimate: band * 100,
        total_questions: answered.length,
        correct_answers: correctCount,
        time_taken: Math.max(1, Math.round((Date.now() - startTs) / 1000)),
        answers,
        engine_version: "elo-v1",
      })
    },
    onSuccess: () => {
      thud()
      qc.invalidateQueries({ queryKey: ["cat-progress"] })
    },
  })

  const begin = () => {
    tap()
    setStarted(true)
    setBand(3)
    setAsked([])
    setAnswered([])
    setPicked(null)
    setStartTs(Date.now())
  }

  const pick = (optionId: string) => {
    if (!current || revealing || finished) return
    const correct = optionId === current.correct
    setPicked(optionId)
    setRevealing(true)
    setTimeout(() => {
      setAnswered((a) => [...a, { item: current, correct }])
      setAsked((a) => [...a, current.id])
      setBand((b) => Math.max(1, Math.min(6, b + (correct ? 1 : -1))))
      setPicked(null)
      setRevealing(false)
    }, REVEAL_MS)
  }

  const goBack = () => {
    if (router.canGoBack()) router.back()
    else router.replace("/(tabs)/exam")
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={{
          padding: spacing.lg,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <Pressable onPress={goBack}>
          <Text style={{ color: theme.textMuted, fontSize: 16 }}>
            {t("review.back")}
          </Text>
        </Pressable>
        <Text style={[type.labelSm, { color: theme.textMuted }]}>
          {started && !finished
            ? `${t("adapt.question")} ${answered.length + 1} / ${MAX_QUESTIONS}`
            : t("adapt.kicker").toUpperCase()}
        </Text>
      </View>
      <ProgressBar
        value={started ? answered.length / MAX_QUESTIONS : 0}
        height={2}
        tint={theme.accent}
      />
      <Screen>
        <View
          style={{
            width: "100%",
            maxWidth: CONTENT_MAX,
            alignSelf: "center",
            gap: spacing.lg,
          }}
        >
          {!started ? (
            <>
              <SectionHeader
                kicker={t("adapt.kicker")}
                title={t("adapt.title")}
              />
              <StudyCard tone="word" body={t("adapt.intro")} />
              <LiftedButton title={t("adapt.start")} onPress={begin} />
              {(historyQ.data ?? []).length > 0 && (
                <StudyCard tone="neutral" title={t("adapt.history")}>
                  <View>
                    {(historyQ.data ?? []).slice(0, 5).map((h) => (
                      <View
                        key={h.id}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          paddingVertical: spacing.sm,
                          borderBottomWidth: 1,
                          borderBottomColor: theme.border,
                        }}
                      >
                        <Text
                          style={[
                            studyType.cardBody,
                            { color: theme.text, fontFamily: fonts.sans },
                          ]}
                        >
                          {(h.created_at ?? "").slice(0, 10)}
                        </Text>
                        <Text
                          style={[
                            studyType.cardBody,
                            {
                              color: theme.accent,
                              fontFamily: fonts.sans,
                              fontWeight: "700",
                            },
                          ]}
                        >
                          {h.elo_estimate}
                        </Text>
                      </View>
                    ))}
                  </View>
                </StudyCard>
              )}
            </>
          ) : finished ? (
            <>
              <SectionHeader
                kicker={t("adapt.kicker")}
                title={t("adapt.done")}
              />
              <StudyCard tone="review" tag={t("adapt.elo").toUpperCase()}>
                <Text
                  style={{
                    fontFamily: fonts.sans,
                    fontWeight: "800",
                    fontSize: 52,
                    lineHeight: 60,
                    color: theme.accent,
                  }}
                >
                  {band * 100}
                </Text>
                <Text
                  style={[
                    studyType.cardBody,
                    { color: theme.textMuted, fontFamily: fonts.sans },
                  ]}
                >
                  {correctCount} {t("exam.correct")} / {answered.length}
                </Text>
              </StudyCard>
              <LiftedButton
                title={saveM.isPending ? t("prog.saving") : t("common.save")}
                face={theme.green}
                onPress={() => saveM.mutate()}
              />
              <LiftedButton
                small
                title={t("common.retry")}
                face={theme.surfaceAlt}
                textColor={theme.text}
                onPress={begin}
              />
            </>
          ) : bankQ.isLoading ? (
            <ActivityIndicator color={theme.accent} />
          ) : !current ? (
            <EmptyState
              title={t("adapt.noBank")}
              message={t("adapt.noBankMsg")}
              glyph={motifChar(language)}
            />
          ) : (
            <StudyCard tone="word">
              <Text
                style={[
                  studyType.cardTitleSm,
                  {
                    color: theme.text,
                    fontFamily: fonts.sans,
                    fontWeight: "800",
                  },
                ]}
              >
                {current.prompt}
              </Text>
              <Pressable
                onPress={() => tts.play(current.prompt)}
                style={{ alignSelf: "flex-start", paddingVertical: 4 }}
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
                  ▸ {t("xsess.playAudio")}
                </Text>
              </Pressable>
              <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
                {current.options.map((o) => {
                  const isPick = picked === o.id
                  const showRight = revealing && o.id === current.correct
                  const showWrong =
                    revealing && isPick && o.id !== current.correct
                  return (
                    <Pressable
                      key={o.id}
                      onPress={() => pick(o.id)}
                      disabled={revealing}
                      style={{
                        borderWidth: 1.5,
                        borderColor: showRight
                          ? theme.green
                          : showWrong
                            ? theme.red
                            : theme.border,
                        backgroundColor: showRight
                          ? theme.green + "14"
                          : showWrong
                            ? theme.red + "0D"
                            : "transparent",
                        borderRadius: 12,
                        padding: spacing.md,
                      }}
                    >
                      <Text
                        style={[
                          studyType.cardBody,
                          { color: theme.text, fontFamily: fonts.sans },
                        ]}
                      >
                        {o.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </StudyCard>
          )}
        </View>
      </Screen>
    </SafeAreaView>
  )
}
