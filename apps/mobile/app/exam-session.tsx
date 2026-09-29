import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { EmptyState } from "@/components/ui/EmptyState"
import { ProgressBar } from "@/components/ui/ProgressBar"
import { LiftedFace, PaperCard } from "@/components/study/PaperCard"
import { PressableScale } from "@/components/study/press"
import { useContentFaces } from "@/hooks/useContentFaces"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentLayout } from "@/theme/layout"
import { paperType } from "@/theme/paperType"
import { MatchingQuestion } from "@/components/study/MatchingQuestion"
import { fonts } from "@/theme/typography"
import { exam } from "@/api/endpoints"
import { useTts } from "@/hooks/useTts"
import { useT } from "@/i18n"
import { motifChar } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import type { ExamQuestion, ExamSession } from "@/types/api"

const LETTERS = ["A", "B", "C", "D", "E", "F"]

function OptionRow({
  letter,
  label,
  selected,
  onPress,
  last,
}: {
  letter: string
  label: string
  selected: boolean
  onPress: () => void
  last: boolean
}) {
  const { paper } = useTheme()
  return (
    <PressableScale
      onPress={onPress}
      scale={0.99}
      wrapperStyle={{ alignSelf: "stretch" }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        borderTopWidth: last ? 0 : 1,
        borderTopColor: paper.line,
        borderLeftWidth: 3,
        borderLeftColor: selected ? paper.green : "transparent",
        backgroundColor: selected ? paper.greenSoft : "transparent",
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          borderWidth: 1.5,
          borderColor: selected ? paper.green : paper.track,
          backgroundColor: selected ? paper.green : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={[
            paperType.note,
            {
              color: selected ? paper.card : paper.inkMuted,
              fontWeight: "700",
            },
          ]}
        >
          {selected ? "✓" : letter}
        </Text>
      </View>
      <Text
        style={[
          paperType.body,
          { color: paper.ink, flex: 1, paddingVertical: 18 },
        ]}
      >
        {label}
      </Text>
    </PressableScale>
  )
}

function AudioPlayButton({
  text,
  playing,
  loading,
  onPlay,
}: {
  text: string
  playing: boolean
  loading: boolean
  onPlay: () => void
}) {
  const { paper } = useTheme()
  const t = useT()
  const label = loading
    ? t("xsess.loadingAudio")
    : playing
      ? t("xsess.playingAudio")
      : t("xsess.playAudio")
  return (
    <PressableScale
      onPress={onPlay}
      disabled={loading}
      wrapperStyle={{ alignSelf: "stretch" }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderRadius: paper.radius.pill,
        backgroundColor: paper.greenSoft,
        borderWidth: 1,
        borderColor: paper.greenRing,
        opacity: loading ? 0.6 : 1,
      }}
      accessibilityLabel={label}
    >
      <Text style={{ fontSize: 18, color: paper.greenDark }}>
        {playing ? "…" : "▶"}
      </Text>
      <Text style={[paperType.cardTitleSm, { color: paper.greenDark }]}>
        {label}
      </Text>
    </PressableScale>
  )
}

export default function ExamSessionScreen() {
  const { paper } = useTheme()
  const faces = useContentFaces()
  const { column } = useContentLayout()
  const t = useT()
  const language = useOnboardingStore((s) => s.language)
  const router = useRouter()
  const params = useLocalSearchParams<{ id?: string }>()
  const sessionId = Number(params.id)
  const qc = useQueryClient()

  const [picked, setPicked] = useState<Record<string, unknown>>({})
  const [elapsed, setElapsed] = useState(0)
  const tts = useTts()

  const sessionQ = useQuery({
    queryKey: ["exam-session", sessionId],
    queryFn: () => exam.get(sessionId),
    enabled: Number.isFinite(sessionId) && sessionId > 0,
  })
  const session = sessionQ.data

  const questions = useMemo<ExamQuestion[]>(
    () => (session?.questions ?? []) as ExamQuestion[],
    [session]
  )
  const currentIdx = session?.current_question_index ?? 0
  const current: ExamQuestion | undefined = questions[currentIdx]

  const answerM = useMutation({
    mutationFn: (vars: { qid: string; answer: unknown }) =>
      exam.answer(sessionId, vars.qid, vars.answer),
    onError: (_e, vars) => {
      // The tick is optimistic, so a failed write would otherwise leave the
      // option looking chosen, unlock Next, and carry an answer the server
      // never received. Undo the tick and say so.
      setPicked((p) => {
        const next = { ...p }
        delete next[vars.qid]
        return next
      })
      Alert.alert(t("xsess.submitFail"), t("xsess.tryAgain"))
    },
  })
  const submitM = useMutation({
    mutationFn: () => exam.submit(sessionId),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["exam-active"] })
      qc.invalidateQueries({ queryKey: ["exam-history"] })
      // The standing list on the exam tab reads this; without it the level and
      // score stay whatever they were before the sitting.
      qc.invalidateQueries({ queryKey: ["exam-progress"] })
      router.replace({
        pathname: "/exam-result" as never,
        params: {
          total: String(result.total_questions ?? 0),
          correct: String(result.correct_answers ?? 0),
          score: String(result.score ?? 0),
          passing: String(result.passing_score ?? 0),
          time: String(result.time_taken ?? 0),
          examType: result.exam_type ?? "",
          examLevel: result.exam_level ?? "",
        } as never,
      })
    },
    onError: (e: unknown) => {
      Alert.alert(
        t("xsess.submitFail"),
        (e as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? t("xsess.tryAgain")
      )
    },
  })

  useEffect(() => {
    const tick = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(tick)
  }, [])

  // A multiple-choice answer is a string; a matching answer is a set of
  // pairings, so this is not typed to a string.
  const pick = (qid: string, option: unknown) => {
    setPicked((p) => ({ ...p, [qid]: option }))
    answerM.mutate({ qid, answer: option })
  }

  const nextQ = () => {
    if (!session) return
    if (currentIdx + 1 >= questions.length) {
      Alert.alert(t("xsess.submitTitle"), t("xsess.submitMsg"), [
        { text: t("xsess.cancel"), style: "cancel" },
        { text: t("xsess.submit"), onPress: () => submitM.mutate() },
      ])
    } else {
      // Optimistically advance: the backend tracks current_question_index;
      // we re-query to move on.
      qc.setQueryData<ExamSession | undefined>(
        ["exam-session", sessionId],
        (old) =>
          old ? { ...old, current_question_index: currentIdx + 1 } : old
      )
    }
  }

  const abandon = () =>
    Alert.alert(t("xsess.abandonTitle"), t("xsess.abandonMsg"), [
      { text: t("xsess.cancel"), style: "cancel" },
      {
        text: t("xsess.abandon"),
        style: "destructive",
        onPress: async () => {
          await exam.abandon(sessionId)
          qc.invalidateQueries({ queryKey: ["exam-active"] })
          router.back()
        },
      },
    ])

  if (sessionQ.isLoading) {
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

  if (!session || questions.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: paper.paper }}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
            gap: 20,
          }}
        >
          <EmptyState
            title={t("xsess.notFound")}
            message={t("xsess.notFoundMsg")}
            glyph={motifChar(language)}
          />
          <LiftedFace title={t("xsess.goBack")} onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    )
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0")
  const ss = String(elapsed % 60).padStart(2, "0")
  const isLast = currentIdx + 1 >= questions.length
  const answeredCurrent = Boolean(current && picked[current.id])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: paper.paper }}>
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 14,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <View style={{ gap: 4, flex: 1 }}>
          <Text style={[paperType.label, { color: paper.inkMuted }]}>
            {session.exam_type.toUpperCase()} · {t("exam.level")}{" "}
            {session.exam_level}
          </Text>
          <Text style={[paperType.cardTitleSm, { color: paper.ink }]}>
            {t("exam.question")} {currentIdx + 1} {t("xsess.of")}{" "}
            {questions.length}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 2 }}>
          {/* Monospaced on purpose: a clock that ticks once a second jitters
              visibly in a proportional face. */}
          <Text
            style={{
              fontFamily: fonts.mono,
              fontSize: 22,
              color: paper.ink,
            }}
          >
            {mm}:{ss}
          </Text>
          <PressableScale
            onPress={abandon}
            scale={0.96}
            style={{ paddingVertical: 10, paddingHorizontal: 4 }}
          >
            <Text style={[paperType.note, { color: paper.coral }]}>
              {t("xsess.abandon")}
            </Text>
          </PressableScale>
        </View>
      </View>
      <ProgressBar
        value={
          questions.length
            ? (currentIdx + (answeredCurrent ? 1 : 0)) / questions.length
            : 0
        }
        height={2}
        tint={paper.green}
      />
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          gap: 22,
          paddingBottom: 48,
          flexGrow: 1,
          maxWidth: column,
          width: "100%",
          alignSelf: "center",
        }}
      >
        {current ? (
          <View style={{ gap: 20 }}>
            <View style={{ gap: 10 }}>
              <Text style={[paperType.label, { color: paper.inkMuted }]}>
                {current.type ?? t("xsess.question")}
              </Text>
              <Text
                style={[
                  paperType.cardTitle,
                  { color: paper.ink, fontSize: 26, lineHeight: 32 },
                ]}
              >
                {current.prompt}
              </Text>
              {current.prompt_chinese && (
                <Text
                  style={{
                    fontFamily: faces.hanzi,
                    fontSize: 26,
                    lineHeight: 36,
                    color: paper.inkSoft,
                  }}
                >
                  {current.prompt_chinese}
                </Text>
              )}
              {(current.type === "listening" || current.type === "audio") &&
                current.audioText && (
                  <AudioPlayButton
                    text={current.audioText}
                    playing={tts.playing}
                    loading={tts.loading}
                    onPlay={() => tts.play(current.audioText!)}
                  />
                )}
            </View>

            {current.pairs?.length ? (
              // A matching question has no option list to render, and picking
              // one option cannot answer it — the answer is a set of pairings,
              // and it is committed by the component once the last one lands.
              <MatchingQuestion
                prompt={current.prompt}
                pairs={current.pairs}
                onAnswered={(answer: Record<string, string>) =>
                  pick(current.id, answer)
                }
              />
            ) : (
              <PaperCard padded={false}>
                {(current.options ?? []).map((opt, idx) => (
                  <OptionRow
                    key={opt}
                    letter={LETTERS[idx] ?? String(idx + 1)}
                    label={opt}
                    selected={picked[current.id] === opt}
                    onPress={() => pick(current.id, opt)}
                    last={idx === (current.options ?? []).length - 1}
                  />
                ))}
              </PaperCard>
            )}
          </View>
        ) : (
          <EmptyState title={t("xsess.noQ")} glyph="？" />
        )}
      </ScrollView>
      {/* The action stays outside the scroll: on a long question the only way
          forward must not be something you have to scroll to find. */}
      <View
        style={{
          padding: 20,
          paddingBottom: 28,
          borderTopWidth: 1,
          borderTopColor: paper.line,
          backgroundColor: paper.paper,
        }}
      >
        <LiftedFace
          title={
            submitM.isPending
              ? t("xsess.submitting")
              : isLast
                ? t("xsess.submitExam")
                : t("xsess.nextQ")
          }
          face={isLast ? paper.coral : paper.green}
          onPress={nextQ}
          disabled={!current || !answeredCurrent || submitM.isPending}
        />
      </View>
    </SafeAreaView>
  )
}
