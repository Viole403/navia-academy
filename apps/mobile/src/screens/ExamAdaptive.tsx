import { useRef, useState } from "react"
import { ActivityIndicator, ScrollView, Text, View } from "react-native"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Stack, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { cefrBandOf } from "@navia/utils"

import { EmptyState } from "@/components/ui/EmptyState"
import { ProgressBar } from "@/components/ui/ProgressBar"
import { LiftedFace, PaperCard, PaperStat } from "@/components/study/PaperCard"
import { PressableScale } from "@/components/study/press"
import { useCatExam, type CatResult } from "@/hooks/useCatExam"
import { useIntegrityTracking } from "@/hooks/useIntegrityTracking"
import { useContentFaces } from "@/hooks/useContentFaces"
import { useContentLayout } from "@/theme/layout"
import { useTheme } from "@/theme/ThemeProvider"
import { paperType } from "@/theme/paperType"
import { cat } from "@/api/endpoints"
import { loadVocabulary } from "@/lib/content-data"
import { languageInfo, motifChar } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useTts } from "@/hooks/useTts"
import { useT } from "@/i18n"
import { tap, thud } from "@/utils/feedback"
import type { CatAnswer } from "@/types/api"

const REVEAL_MS = 650

/**
 * /exam-adaptive — the adaptive estimate (web parity: /exam/adaptive).
 *
 * Runs the same engine as the web session: a single rating updated by the
 * logistic Elo rule, questions chosen near that rating, and a stop once the
 * estimate is precise enough to name a band. The maths is in `@navia/utils`
 * because the web session and the Go backend that recomputes the rating all have
 * to agree on it.
 *
 * This replaced a band walk that stepped through the placement bands and
 * submitted `band * 100` as the rating under the `elo-v1` engine version. Same
 * field names, different algorithm: the same answers scored differently
 * depending on which device collected them, and the label claimed an engine the
 * screen did not run.
 *
 * The result is an estimate, and it is labelled as one. An adaptive score is a
 * guess about a level, not a grade, so the number appears with its spread beside
 * it and the history is a list of previous guesses rather than a record of
 * achievement.
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
  const [picked, setPicked] = useState<string | null>(null)
  const [revealing, setRevealing] = useState(false)
  const [startTs, setStartTs] = useState(0)
  const [savedResult, setSavedResult] = useState<CatResult | null>(null)
  const startTsRef = useRef(0)
  const sessionIdRef = useRef<number | null>(null)
  // The server keeps the tally; the client only reports the leave.
  const integrity = useIntegrityTracking(() => {
    const sid = sessionIdRef.current
    if (sid === null) return
    // A delta of one, added server-side: a dropped request lowers nothing, and
    // a late one only adds. The server decides what the tally means.
    void cat
      .updateSession(sid, { answers: [], tab_warnings: 1 })
      .catch(() => {})
  })

  const vocabQ = useQuery({
    queryKey: ["library-vocabulary", language],
    queryFn: () => loadVocabulary(language),
  })
  const historyQ = useQuery({
    queryKey: ["cat-progress"],
    queryFn: cat.progress,
  })

  const activeExam = examType ?? languageInfo(language).examTypes[0]
  const exam = useCatExam(vocabQ.data ?? [], activeExam)

  const saveM = useMutation({
    mutationFn: async (r: CatResult) => {
      // The log is the source of truth: the backend replays it and ignores the
      // rating sent here, so the submitted estimate is only a cached copy.
      const answers: CatAnswer[] = exam.log.map((a) => ({
        item_id: a.wordId,
        item_elo: a.elo,
        correct: a.correct,
        format: a.format,
      }))
      await cat.submitResult({
        exam_type: activeExam,
        elo_estimate: r.eloEstimate,
        total_questions: r.answered,
        correct_answers: r.correct,
        time_taken: Math.max(
          1,
          Math.round((Date.now() - startTsRef.current) / 1000)
        ),
        answers,
        engine_version: "elo-v1",
        integrity_flag: integrity.flagged,
      })
    },
    onSuccess: (_d, r) => {
      thud()
      setSavedResult(r)
      qc.invalidateQueries({ queryKey: ["cat-progress"] })
    },
  })

  const begin = () => {
    tap()
    setStarted(true)
    setPicked(null)
    setRevealing(false)
    setSavedResult(null)
    setStartTs(Date.now())
    startTsRef.current = Date.now()
    integrity.reset()
    // A server session gives the warning tally somewhere to live, which is the
    // whole point: kept in component state it reset on every launch.
    void cat
      .startSession({
        exam_type: activeExam,
        start_theta: Math.round(exam.theta),
      })
      .then((sess) => {
        sessionIdRef.current = sess.id
        integrity.seed(sess.tab_warnings)
      })
      .catch(() => {
        // No session means no tally; the exam still runs.
        sessionIdRef.current = null
      })
    exam.start()
  }

  const current = exam.current
  const finished = exam.done
  const answeredCount = exam.log.length

  const choose = (option: string) => {
    if (!current || revealing || finished) return
    setPicked(option)
    setRevealing(true)
    // The reveal is a beat for the learner to see which answer was right; the
    // rating moves on the next question either way.
    setTimeout(() => {
      setPicked(null)
      setRevealing(false)
      exam.answer(option)
    }, REVEAL_MS)
  }

  // Submit once the engine says it is done.
  if (finished && exam.result && !savedResult && !saveM.isPending) {
    saveM.mutate(exam.result)
  }

  const goBack = () => {
    if (router.canGoBack()) router.back()
    else router.replace("/(tabs)/exam")
  }

  const result = savedResult ?? exam.result
  const band = result ? cefrBandOf(result.eloEstimate) : null

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
            {t("adapt.question")} {answeredCount + 1}
          </Text>
        ) : null}
      </View>
      <ProgressBar
        value={finished ? 1 : Math.min(1, answeredCount / 20)}
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
              <Text style={[paperType.bodySm, { color: paper.ink }]}>
                {t("adapt.intro")}
              </Text>
            </PaperCard>
            {vocabQ.isError ? (
              <>
                <EmptyState
                  title={t("lib.failedTitle")}
                  message={t("common.loadFailed")}
                  glyph={motifChar(language)}
                />
                <LiftedFace
                  title={t("common.retry")}
                  face={paper.green}
                  onPress={() => vocabQ.refetch()}
                />
              </>
            ) : (
              <LiftedFace
                title={t("adapt.begin")}
                face={paper.green}
                disabled={vocabQ.isLoading || (vocabQ.data ?? []).length < 4}
                onPress={begin}
              />
            )}
            {historyQ.data && historyQ.data.length > 0 && (
              <View style={{ gap: 10 }}>
                <Text style={[paperType.label, { color: paper.inkMuted }]}>
                  {t("adapt.past")}
                </Text>
                <PaperCard padded={false}>
                  {historyQ.data.slice(0, 5).map((h, i) => (
                    <View
                      key={h.id ?? i}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        paddingVertical: 11,
                        paddingHorizontal: 14,
                        borderTopWidth: i === 0 ? 0 : 1,
                        borderTopColor: paper.lineSoft,
                      }}
                    >
                      <Text style={[paperType.bodySm, { color: paper.ink }]}>
                        {String(h.exam_type ?? "").toUpperCase()}
                      </Text>
                      <Text style={[paperType.note, { color: paper.inkMuted }]}>
                        {Math.round(Number(h.elo_estimate ?? 0))} ·{" "}
                        {String(h.cefr_band ?? "")}
                      </Text>
                    </View>
                  ))}
                </PaperCard>
              </View>
            )}
          </>
        ) : finished && result ? (
          <>
            {masthead}
            <PaperCard tone="word" style={{ alignItems: "center", gap: 6 }}>
              <Text
                style={[
                  paperType.greeting,
                  { color: paper.ink, fontSize: 34, lineHeight: 38 },
                ]}
              >
                {band ? band.name : ""}
              </Text>
              <Text style={[paperType.note, { color: paper.inkMuted }]}>
                {t("adapt.estimate", {
                  elo: String(Math.round(result.eloEstimate)),
                  sd: String(Math.round(result.eloSd)),
                })}
              </Text>
              {!!result.recommendedLevel && (
                <Text style={[paperType.bodySm, { color: paper.greenDark }]}>
                  {t("adapt.recommended", {
                    level: result.recommendedLevel,
                  })}
                </Text>
              )}
            </PaperCard>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <PaperStat
                label={t("adapt.answered")}
                value={String(result.answered)}
              />
              <PaperStat
                label={t("adapt.correct")}
                value={String(result.correct)}
              />
            </View>
            {result.weakBands.length > 0 && (
              <PaperCard tone="plain">
                <Text style={[paperType.note, { color: paper.inkMuted }]}>
                  {t("adapt.weak", { bands: result.weakBands.join(", ") })}
                </Text>
              </PaperCard>
            )}
            <LiftedFace
              title={t("adapt.again")}
              face={paper.green}
              onPress={begin}
            />
          </>
        ) : vocabQ.isLoading ? (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <ActivityIndicator color={paper.green} />
          </View>
        ) : current ? (
          <>
            {integrity.flagged && (
              <PaperCard tone="plain">
                <Text style={[paperType.note, { color: paper.coral }]}>
                  {t("adapt.integrity")}
                </Text>
              </PaperCard>
            )}
            <PaperCard tone="plain">
              {current.stimulusType === "audio" ? (
                <LiftedFace
                  title={t("common.play")}
                  face={paper.green}
                  onPress={() =>
                    tts.play(current.audioText ?? current.word.hanzi)
                  }
                />
              ) : (
                <Text
                  style={[
                    paperType.greeting,
                    { color: paper.ink, fontSize: 26, lineHeight: 32 },
                  ]}
                >
                  {current.prompt}
                </Text>
              )}
            </PaperCard>
            <PaperCard padded={false}>
              {current.options.map((o, i) => {
                const chosen = picked === o
                const isRight = o === current.correctAnswer
                const state = !revealing
                  ? "idle"
                  : isRight
                    ? "correct"
                    : chosen
                      ? "wrong"
                      : "dim"
                return (
                  <PressableScale
                    key={o + i}
                    onPress={() => choose(o)}
                    scale={0.99}
                    disabled={revealing}
                    accessibilityLabel={o}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      paddingVertical: 13,
                      paddingHorizontal: 14,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: paper.lineSoft,
                      opacity: state === "dim" ? 0.45 : 1,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: faces.display,
                        fontSize: 20,
                        color: paper.green,
                      }}
                    >
                      {String.fromCharCode(65 + i)}
                    </Text>
                    <Text
                      style={[
                        paperType.cardTitleSm,
                        {
                          color:
                            state === "wrong"
                              ? paper.coral
                              : state === "correct"
                                ? paper.greenDark
                                : paper.ink,
                        },
                      ]}
                    >
                      {o}
                    </Text>
                  </PressableScale>
                )
              })}
            </PaperCard>
          </>
        ) : (
          <EmptyState
            title={t("lib.failedTitle")}
            message={t("common.loadFailed")}
            glyph={motifChar(language)}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
