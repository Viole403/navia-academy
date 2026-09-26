import { useMemo, useState } from "react"
import { ActivityIndicator, ScrollView, Text, View } from "react-native"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Stack, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { EmptyState } from "@/components/ui/EmptyState"
import { ProgressBar } from "@/components/ui/ProgressBar"
import { LiftedFace, PaperCard, PaperStat } from "@/components/study/PaperCard"
import { PressableScale } from "@/components/study/press"
import { useContentFaces } from "@/hooks/useContentFaces"
import { useContentLayout } from "@/theme/layout"
import { useTheme } from "@/theme/ThemeProvider"
import { paperType } from "@/theme/paperType"
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

type RowState = "idle" | "correct" | "wrong" | "dim"

/**
 * /exam-adaptive — repeatable adaptive practice (web parity: /exam/adaptive).
 *
 * Same band-walk and `elo-v1` submit semantics as the onboarding placement test,
 * but repeatable: it records a CAT result and shows past estimates rather than
 * gating onboarding. **The options are one sheet with a stripe, matching the
 * placement test it shares its engine with** — two sibling screens that answer
 * the same kind of question should not ask for the answer in two different ways.
 *
 * The result is an estimate, and it is labelled as one. An adaptive score is a
 * *guess about a level*, not a grade, so the number is presented with its
 * confidence beside it and the history underneath is a list of previous guesses
 * rather than a record of achievement.
 */
export function ExamAdaptive() {
  const { paper } = useTheme()
  const { column: columnWidth } = useContentLayout()
  const faces = useContentFaces()
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

  const masthead = (
    <View style={{ gap: 8 }}>
      <Text style={[paperType.label, { color: paper.inkMuted }]}>
        {t("adapt.kicker").toUpperCase()}
      </Text>
      <Text
        style={[
          paperType.greeting,
          { color: paper.ink, fontSize: 28, lineHeight: 32 },
        ]}
      >
        {t("adapt.title")}
      </Text>
    </View>
  )

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: paper.paper }}
      edges={["top"]}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 14,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <PressableScale onPress={goBack} accessibilityLabel={t("review.back")}>
          <Text style={[paperType.link, { color: paper.inkMuted }]}>
            ← {t("review.back")}
          </Text>
        </PressableScale>
        {started && !finished ? (
          <Text style={[paperType.label, { color: paper.inkMuted }]}>
            {t("adapt.question")} {answered.length + 1} / {MAX_QUESTIONS}
          </Text>
        ) : null}
      </View>
      <ProgressBar
        value={started ? answered.length / MAX_QUESTIONS : 0}
        height={2}
        tint={paper.green}
      />

      <ScrollView
        contentContainerStyle={{
          width: "100%",
          maxWidth: columnWidth,
          alignSelf: "center",
          padding: 20,
          paddingBottom: 48,
          gap: 22,
        }}
      >
        {!started ? (
          <>
            {masthead}
            <PaperCard tone="word">
              <Text style={[paperType.prose, { color: paper.inkSoft }]}>
                {t("adapt.intro")}
              </Text>
            </PaperCard>
            <LiftedFace
              title={t("adapt.start")}
              face={paper.green}
              onPress={begin}
            />

            {(historyQ.data ?? []).length > 0 && (
              <View style={{ gap: 10 }}>
                <Text style={[paperType.label, { color: paper.inkMuted }]}>
                  {t("adapt.history")}
                </Text>
                <PaperCard padded={false}>
                  {(historyQ.data ?? []).slice(0, 5).map((h, i) => (
                    <View
                      key={h.id}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderTopWidth: i === 0 ? 0 : 1,
                        borderTopColor: paper.lineSoft,
                      }}
                    >
                      <Text style={[paperType.cardBody, { color: paper.ink }]}>
                        {(h.created_at ?? "").slice(0, 10)}
                      </Text>
                      <Text
                        style={[
                          paperType.statValue,
                          { color: paper.green, fontSize: 19 },
                        ]}
                      >
                        {h.elo_estimate}
                      </Text>
                    </View>
                  ))}
                </PaperCard>
              </View>
            )}
          </>
        ) : finished ? (
          <>
            {masthead}
            <PaperCard tone="review">
              <Text style={[paperType.label, { color: paper.inkMuted }]}>
                {t("adapt.elo").toUpperCase()}
              </Text>
              <PaperStat
                value={`${band * 100}`}
                label={`${correctCount} ${t("exam.correct")} / ${answered.length}`}
              />
            </PaperCard>
            {saveM.isError && (
              <Text style={[paperType.note, { color: paper.coral }]}>
                {t("game.saveFailed")}
              </Text>
            )}
            <LiftedFace
              title={saveM.isPending ? t("prog.saving") : t("common.save")}
              face={paper.green}
              disabled={saveM.isPending}
              onPress={() => saveM.mutate()}
            />
            <LiftedFace
              small
              title={t("common.retry")}
              face={paper.inkSoft}
              textColor={paper.ink}
              onPress={begin}
            />
          </>
        ) : bankQ.isLoading ? (
          <PaperCard tone="review" style={{ alignItems: "center" }}>
            <ActivityIndicator color={paper.green} />
          </PaperCard>
        ) : bankQ.isError ? (
          <View style={{ gap: 16 }}>
            <EmptyState
              title={t("adapt.noBank")}
              message={t("common.loadFailed")}
              glyph={motifChar(language)}
            />
            <LiftedFace
              title={t("common.retry")}
              face={paper.green}
              onPress={() => bankQ.refetch()}
            />
          </View>
        ) : !current ? (
          <EmptyState
            title={t("adapt.noBank")}
            message={t("adapt.noBankMsg")}
            glyph={motifChar(language)}
          />
        ) : (
          <View style={{ gap: 18 }}>
            <Text
              style={[
                paperType.cardTitle,
                { color: paper.ink, fontSize: 24, lineHeight: 30 },
              ]}
            >
              {current.prompt}
            </Text>
            <PressableScale
              onPress={() => tts.play(current.prompt)}
              accessibilityLabel={t("xsess.playAudio")}
              style={{ alignSelf: "flex-start" }}
            >
              <Text style={[paperType.link, { color: paper.inkMuted }]}>
                ▸ {t("xsess.playAudio")}
              </Text>
            </PressableScale>

            <PaperCard padded={false}>
              {current.options.map((o, i) => {
                const isPick = picked === o.id
                const state: RowState = !revealing
                  ? "idle"
                  : o.id === current.correct
                    ? "correct"
                    : isPick
                      ? "wrong"
                      : "dim"
                const stripe =
                  state === "correct"
                    ? paper.green
                    : state === "wrong"
                      ? paper.coral
                      : "transparent"
                return (
                  <PressableScale
                    key={o.id}
                    onPress={() => pick(o.id)}
                    disabled={revealing}
                    scale={0.99}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isPick }}
                    style={{
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: paper.lineSoft,
                      borderLeftWidth: 3,
                      borderLeftColor: stripe,
                      backgroundColor:
                        state === "correct"
                          ? paper.greenSoft
                          : state === "wrong"
                            ? paper.coralSoft
                            : "transparent",
                      opacity: state === "dim" ? 0.55 : 1,
                    }}
                  >
                    <Text
                      style={[
                        paperType.body,
                        {
                          color: paper.ink,
                          fontFamily: faces.display,
                          paddingVertical: 17,
                          paddingHorizontal: 16,
                        },
                      ]}
                    >
                      {o.label}
                    </Text>
                  </PressableScale>
                )
              })}
            </PaperCard>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
