import { useMemo, useState } from "react"
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { STUDY_DIRTY_KEYS } from "@/utils/offlineQueue"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { EmptyState } from "@/components/ui/EmptyState"
import { Motif } from "@/components/ui/Motif"
import { ProgressBar } from "@/components/ui/ProgressBar"
import { LiftedFace, PaperCard, PaperStat } from "@/components/study/PaperCard"
import { PressableScale } from "@/components/study/press"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentLayout } from "@/theme/layout"
import { paperType } from "@/theme/paperType"
import { cat, progress, tasks } from "@/api/endpoints"
import { loadPlacement } from "@/lib/content-data"
import { examDisplayName, languageInfo, motifChar } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useT } from "@/i18n"
import type { CatAnswer, PlacementItem, PlacementResult } from "@/types/api"
import { useTargetLanguage } from "@/hooks/useTargetLanguage"

const MAX_QUESTIONS = 12
const REVEAL_MS = 900

/** band 1..6 → estimated exam level. Mirrors web placement-test. */
function bandToLevel(band: number): number {
  const map: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 }
  return map[band] ?? 1
}

function buildResult(
  answered: { item: PlacementItem; correct: boolean }[]
): PlacementResult {
  const total = answered.length
  const correctList = answered.filter((a) => a.correct)
  const correctCount = correctList.length
  const estBand = Math.max(
    1,
    Math.min(
      6,
      Math.round(
        correctList.reduce((s, a) => s + a.item.band, 0) /
          Math.max(1, correctCount)
      )
    )
  )
  const bySkill = new Map<string, { t: number; c: number }>()
  for (const a of answered) {
    const skill = a.item.skill ?? "vocabulary"
    const cur = bySkill.get(skill) ?? { t: 0, c: 0 }
    cur.t += 1
    if (a.correct) cur.c += 1
    bySkill.set(skill, cur)
  }
  const strengths: string[] = []
  const weaknesses: string[] = []
  for (const [skill, { t, c }] of bySkill) {
    const rate = t === 0 ? 0 : c / t
    if (t >= 2 && rate >= 0.75) strengths.push(skill)
    else if (rate <= 0.4) weaknesses.push(skill)
  }
  const confidence: PlacementResult["confidence"] =
    total < 6 ? "low" : total < 10 ? "medium" : "high"
  return {
    estimatedBand: estBand,
    estimatedHsk: bandToLevel(estBand),
    confidence,
    strengths,
    weaknesses,
    correctCount,
    totalCount: total,
  }
}

type RowState = "idle" | "correct" | "wrong" | "dim"

function OptionRow({
  label,
  state,
  onPress,
  last,
}: {
  label: string
  state: RowState
  onPress: () => void
  last: boolean
}) {
  const { paper } = useTheme()
  // A left stripe rather than a border all round: the answer and the mistake
  // are the only two things on this row that need to be told apart, and a stripe
  // reads at a glance without boxing every option in.
  const accent =
    state === "correct"
      ? paper.green
      : state === "wrong"
        ? paper.coral
        : "transparent"
  return (
    <PressableScale
      onPress={onPress}
      disabled={state !== "idle"}
      scale={0.99}
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderTopWidth: last ? 0 : 1,
        borderTopColor: paper.line,
        borderLeftWidth: 3,
        borderLeftColor: accent,
        backgroundColor:
          state === "correct"
            ? paper.greenSoft
            : state === "wrong"
              ? paper.coralSoft
              : "transparent",
        opacity: state === "dim" ? 0.55 : 1,
      }}
      wrapperStyle={{ alignSelf: "stretch" }}
    >
      <Text
        style={[
          paperType.body,
          {
            color: state === "dim" ? paper.inkMuted : paper.ink,
            flex: 1,
            paddingVertical: 18,
            paddingHorizontal: 16,
          },
        ]}
      >
        {label}
      </Text>
    </PressableScale>
  )
}

export default function PlacementTestScreen() {
  const { paper } = useTheme()
  const { column } = useContentLayout()
  const router = useRouter()
  const qc = useQueryClient()
  const language = useTargetLanguage()
  const examType = useOnboardingStore((s) => s.examType)
  const t = useT()

  const [started, setStarted] = useState(false)
  const [band, setBand] = useState(2)
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
  const bank = bankQ.data ?? []

  const current = useMemo<PlacementItem | null>(() => {
    if (!started || bank.length === 0) return null
    const pool = bank.filter((q) => !asked.includes(q.id))
    if (pool.length === 0) return null
    pool.sort((a, b) => Math.abs(a.band - band) - Math.abs(b.band - band))
    return pool[0] ?? null
  }, [started, bank, asked, band])

  const result: PlacementResult | null =
    answered.length > 0 && (answered.length >= MAX_QUESTIONS || !current)
      ? buildResult(answered)
      : null

  const acceptM = useMutation({
    mutationFn: async (r: PlacementResult) => {
      const type = examType ?? languageInfo(language).examTypes[0]
      const answers: CatAnswer[] = answered.map((a) => ({
        item_id: a.item.id,
        item_elo: a.item.band * 100,
        correct: a.correct,
        format: "multiple-choice",
      }))
      await cat
        .submitResult({
          exam_type: type,
          elo_estimate: r.estimatedBand * 100,
          exam_level: String(r.estimatedHsk ?? r.estimatedBand),
          total_questions: r.totalCount,
          correct_answers: r.correctCount,
          time_taken: Math.max(1, Math.round((Date.now() - startTs) / 1000)),
          answers,
          engine_version: "elo-v1",
        })
        .catch(() => null)
      await progress.update({
        placement: {
          estimatedBand: r.estimatedBand,
          level: r.estimatedHsk ?? r.estimatedBand,
          confidence: r.confidence,
          strengths: r.strengths,
          weaknesses: r.weaknesses,
        },
      })
      await tasks
        .create(t("place.weakTask") + ": " + (r.weaknesses.join(", ") || "—"))
        .catch(() => null)
    },
    onSuccess: () => {
      STUDY_DIRTY_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
      router.replace("/(tabs)/learn")
    },
    onError: () => {
      Alert.alert(t("place.saveFail"), t("place.saveFailMsg"))
    },
  })

  const begin = () => {
    setStarted(true)
    setBand(2)
    setAsked([])
    setAnswered([])
    setPicked(null)
    setStartTs(Date.now())
  }

  const pick = (optionId: string) => {
    if (!current || revealing) return
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

  if (bankQ.isLoading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: paper.paper,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={paper.green} size="large" />
      </SafeAreaView>
    )
  }

  if (bankQ.isError || bank.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: paper.paper }}>
        <EmptyState
          glyph="∅"
          title={t("place.noBank")}
          message={t("place.noBankMsg")}
        />
      </SafeAreaView>
    )
  }

  const displayType = examType ?? languageInfo(language).examTypes[0]

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: paper.paper }}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          gap: 22,
          paddingBottom: 48,
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
                {examDisplayName(displayType)} · {t("place.suffix")}
              </Text>
              <Text
                style={[
                  paperType.greeting,
                  { color: paper.ink, fontSize: 30, lineHeight: 34 },
                ]}
              >
                {t("place.findLevel")}
              </Text>
            </View>
            <Motif char={motifChar(language)} size={56} />
          </View>
          <View style={{ height: 1, backgroundColor: paper.line }} />
        </View>

        {!started && (
          <View style={{ gap: 20 }}>
            <PaperCard tone="plain">
              <Text style={[paperType.prose, { color: paper.inkSoft }]}>
                {MAX_QUESTIONS} {t("place.introA")}
              </Text>
            </PaperCard>
            <LiftedFace
              title={t("place.start")}
              face={paper.green}
              onPress={begin}
            />
          </View>
        )}

        {started && !result && current && (
          <View style={{ gap: 18 }}>
            <ProgressBar
              value={answered.length / MAX_QUESTIONS}
              tint={paper.green}
            />
            <Text style={[paperType.label, { color: paper.inkMuted }]}>
              {t("place.question")} {answered.length + 1} {t("place.of")}{" "}
              {MAX_QUESTIONS}
            </Text>
            {/* The prompt is the only thing on this page that is not a choice,
                so it gets air rather than a box around it. */}
            <Text
              style={[
                paperType.cardTitle,
                { color: paper.ink, fontSize: 26, lineHeight: 32 },
              ]}
            >
              {current.prompt}
            </Text>
            <PaperCard padded={false}>
              {current.options.map((opt, i) => {
                const isPicked = picked === opt.id
                const isCorrect = opt.id === current.correct
                const state: RowState = !revealing
                  ? "idle"
                  : isCorrect
                    ? "correct"
                    : isPicked
                      ? "wrong"
                      : "dim"
                return (
                  <OptionRow
                    key={opt.id}
                    label={opt.label}
                    state={state}
                    onPress={() => pick(opt.id)}
                    last={i === current.options.length - 1}
                  />
                )
              })}
            </PaperCard>
          </View>
        )}

        {result && (
          <View style={{ gap: 20 }}>
            <PaperCard tone="review">
              <View style={{ gap: 16 }}>
                <Text style={[paperType.label, { color: paper.inkMuted }]}>
                  {t("place.yourLevel")}
                </Text>
                <PaperStat
                  value={String(result.estimatedHsk ?? result.estimatedBand)}
                  label={examDisplayName(displayType)}
                />
                <View style={{ height: 1, backgroundColor: paper.line }} />
                <Text style={[paperType.body, { color: paper.inkSoft }]}>
                  {result.correctCount}/{result.totalCount}{" "}
                  {t("place.correctWord")} ·{" "}
                  {result.confidence === "low"
                    ? t("place.confLow")
                    : result.confidence === "medium"
                      ? t("place.confMid")
                      : t("place.confHigh")}{" "}
                  {t("place.confidence")}
                </Text>
                {result.strengths.length > 0 && (
                  <Text style={[paperType.body, { color: paper.ink }]}>
                    {t("place.strong")}: {result.strengths.join(", ")}
                  </Text>
                )}
                {result.weaknesses.length > 0 && (
                  <Text style={[paperType.body, { color: paper.ink }]}>
                    {t("place.workOn")}: {result.weaknesses.join(", ")}
                  </Text>
                )}
              </View>
            </PaperCard>
            <LiftedFace
              title={t("place.saveStart")}
              face={paper.green}
              onPress={() => acceptM.mutate(result)}
              disabled={acceptM.isPending}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
