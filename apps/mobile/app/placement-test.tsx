import { useMemo, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/Button"
import { EmptyState } from "@/components/ui/EmptyState"
import { Enter } from "@/components/ui/Enter"
import { Motif } from "@/components/ui/Motif"
import { ProgressBar } from "@/components/ui/ProgressBar"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"
import { cat, progress, tasks } from "@/api/endpoints"
import { loadPlacement } from "@/lib/content-data"
import {
  examBadgeColor,
  examDisplayName,
  languageInfo,
  motifChar,
} from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useT } from "@/i18n"
import type { CatAnswer, PlacementItem, PlacementResult } from "@/types/api"

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

export default function PlacementTestScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const qc = useQueryClient()
  const language = useOnboardingStore((s) => s.language)
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
      qc.invalidateQueries({ queryKey: ["progress"] })
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
          backgroundColor: theme.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={theme.accent} size="large" />
      </SafeAreaView>
    )
  }

  if (bankQ.isError || bank.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
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
      style={{ flex: 1, backgroundColor: theme.bg }}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={{ padding: 24, gap: 24, paddingBottom: 48 }}
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
              <Text style={[type.labelSm, { color: theme.textMuted }]}>
                {examDisplayName(displayType)} · {t("place.suffix")}
              </Text>
              <Text style={[type.display, { color: theme.text, fontSize: 36 }]}>
                {t("place.findLevel")}
              </Text>
            </View>
            <Motif char={motifChar(language)} size={56} />
          </View>
          <View style={{ height: 1, backgroundColor: theme.border }} />
        </View>

        {!started && (
          <Enter>
            <View style={{ gap: 16 }}>
              <Text style={[type.body, { color: theme.textMuted }]}>
                {MAX_QUESTIONS} {t("place.introA")}
              </Text>
              <Button title={t("place.start")} onPress={begin} />
            </View>
          </Enter>
        )}

        {started && !result && current && (
          <View style={{ gap: 20 }}>
            <ProgressBar
              value={answered.length / MAX_QUESTIONS}
              tint={examBadgeColor(displayType)}
            />
            <Text style={[type.labelSm, { color: theme.textMuted }]}>
              {t("place.question")} {answered.length + 1} {t("place.of")}{" "}
              {MAX_QUESTIONS}
            </Text>
            <Text style={[type.h2, { color: theme.text }]}>
              {current.prompt}
            </Text>
            <View style={{ gap: 12 }}>
              {current.options.map((opt, i) => {
                const isPicked = picked === opt.id
                const showCorrect = revealing && opt.id === current.correct
                return (
                  <Enter key={opt.id} index={i}>
                    <Pressable
                      onPress={() => pick(opt.id)}
                      disabled={revealing}
                      style={{
                        borderWidth: 1,
                        borderColor: showCorrect
                          ? theme.green
                          : isPicked
                            ? theme.red
                            : theme.border,
                        backgroundColor: showCorrect
                          ? theme.green + "18"
                          : theme.surface,
                        padding: 16,
                        opacity:
                          revealing && !isPicked && !showCorrect ? 0.6 : 1,
                      }}
                    >
                      <Text style={[type.body, { color: theme.text }]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  </Enter>
                )
              })}
            </View>
          </View>
        )}

        {result && (
          <Enter>
            <View style={{ gap: 16 }}>
              <Text style={[type.labelSm, { color: theme.textMuted }]}>
                {t("place.yourLevel")}
              </Text>
              <Text style={[type.display, { color: theme.text, fontSize: 48 }]}>
                {result.estimatedHsk ?? result.estimatedBand}
              </Text>
              <Text style={[type.body, { color: theme.textMuted }]}>
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
                <Text style={[type.body, { color: theme.text }]}>
                  {t("place.strong")}: {result.strengths.join(", ")}
                </Text>
              )}
              {result.weaknesses.length > 0 && (
                <Text style={[type.body, { color: theme.text }]}>
                  {t("place.workOn")}: {result.weaknesses.join(", ")}
                </Text>
              )}
              <Button
                title={t("place.saveStart")}
                onPress={() => acceptM.mutate(result)}
                loading={acceptM.isPending}
              />
            </View>
          </Enter>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
