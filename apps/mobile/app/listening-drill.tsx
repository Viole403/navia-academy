import { useMemo, useState } from "react"
import { ActivityIndicator, ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { EmptyState } from "@/components/ui/EmptyState"
import { ProgressBar } from "@/components/ui/ProgressBar"
import { LiftedFace, PaperCard, PaperStat } from "@/components/study/PaperCard"
import { PressableScale } from "@/components/study/press"
import { QueuedNote } from "@/components/study/QueuedNote"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentLayout } from "@/theme/layout"
import { paperType } from "@/theme/paperType"
import { loadVocabulary } from "@/lib/content-data"
import { headword, motifChar } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useTts } from "@/hooks/useTts"
import { useT } from "@/i18n"
import { logStudyWithQueue } from "@/utils/offlineQueue"
import type { VocabWord } from "@/types/api"

const ROUNDS = 10

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type RowState = "idle" | "correct" | "wrong" | "dim"

export default function ListeningDrillScreen() {
  const { paper } = useTheme()
  const { column } = useContentLayout()
  const t = useT()
  const language = useOnboardingStore((s) => s.language)
  const qc = useQueryClient()
  const tts = useTts()

  const [round, setRound] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  /** Whether the study log only reached the outbox — see QueuedNote. */
  const [queued, setQueued] = useState(false)

  const poolQ = useQuery({
    queryKey: ["listening-pool", language],
    queryFn: () => loadVocabulary(language),
  })

  const rounds = useMemo(() => {
    const pool = shuffle(poolQ.data ?? []).slice(0, ROUNDS)
    return pool.map((w) => {
      const distractors = shuffle(
        (poolQ.data ?? []).filter((x) => x.id !== w.id)
      ).slice(0, 3)
      return { word: w, options: shuffle([w, ...distractors]) }
    })
  }, [poolQ.data])

  const current = rounds[round]

  const finishM = useMutation({
    mutationFn: (finalScore: number) =>
      logStudyWithQueue(8, Math.round((finalScore / ROUNDS) * 100)),
    onSuccess: (res) => {
      setQueued(res.offline)
      qc.invalidateQueries({ queryKey: ["progress"] })
    },
  })

  const pick = (w: VocabWord) => {
    if (picked || !current) return
    setPicked(w.id)
    const correct = w.id === current.word.id
    const next = score + (correct ? 1 : 0)
    if (correct) setScore(next)
    setTimeout(() => {
      if (round + 1 >= rounds.length) {
        setDone(true)
        finishM.mutate(next)
      } else {
        setRound(round + 1)
        setPicked(null)
      }
    }, 900)
  }

  const masthead = (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 16 }}>
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={[paperType.label, { color: paper.inkMuted }]}>
            {t("listen.kicker")}
          </Text>
          <Text
            style={[
              paperType.greeting,
              { color: paper.ink, fontSize: 30, lineHeight: 34 },
            ]}
          >
            {t("listen.title")}
          </Text>
        </View>
      </View>
      <View style={{ height: 1, backgroundColor: paper.line }} />
    </View>
  )

  if (poolQ.isError) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: paper.paper }}
        edges={["top"]}
      >
        <ScrollView
          contentContainerStyle={{
            padding: 20,
            paddingBottom: 48,
            gap: 22,
            maxWidth: column,
            width: "100%",
            alignSelf: "center",
          }}
        >
          {masthead}
          <EmptyState
            title={t("listen.failedTitle")}
            message={t("listen.failedMsg")}
            glyph={motifChar(language)}
          />
          <LiftedFace
            title={t("common.retry")}
            face={paper.green}
            onPress={() => poolQ.refetch()}
          />
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: paper.paper }}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 48,
          gap: 22,
          maxWidth: column,
          width: "100%",
          alignSelf: "center",
        }}
      >
        {masthead}

        {poolQ.isLoading ? (
          <PaperCard tone="review" style={{ alignItems: "center" }}>
            <ActivityIndicator color={paper.green} />
          </PaperCard>
        ) : rounds.length === 0 ? (
          <EmptyState title={t("listen.noWords")} glyph={motifChar(language)} />
        ) : done ? (
          <PaperCard tone="review" style={{ gap: 10 }}>
            <PaperStat
              value={`${score}/${rounds.length}`}
              label={
                score === rounds.length
                  ? t("listen.perfect")
                  : score >= rounds.length / 2
                    ? t("listen.good")
                    : t("listen.retry")
              }
            />
            <QueuedNote show={queued} />
          </PaperCard>
        ) : (
          current && (
            <View style={{ gap: 18 }}>
              <ProgressBar value={round / rounds.length} tint={paper.green} />

              {/* The prompt is a sound, so the play control is the hero: the
                  page's one unmistakable action before the sheet of answers. */}
              <View style={{ alignItems: "center", gap: 10 }}>
                <Text style={[paperType.label, { color: paper.inkMuted }]}>
                  {t("listen.round")} {round + 1} {t("listen.of")}{" "}
                  {rounds.length} · {t("listen.score")} {score}
                </Text>
                <PressableScale
                  onPress={() => tts.play(headword(current.word))}
                  disabled={tts.loading || tts.playing}
                  accessibilityLabel={t("listen.play")}
                >
                  <View
                    style={{
                      paddingHorizontal: 22,
                      paddingVertical: 14,
                      borderRadius: 999,
                      backgroundColor: paper.greenSoft,
                      borderWidth: 1,
                      borderColor: paper.greenRing,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <Text style={{ fontSize: 15, color: paper.greenDark }}>
                      {tts.playing ? "…" : "▶"}
                    </Text>
                    <Text
                      style={[
                        paperType.button,
                        { color: paper.greenDark, fontSize: 15 },
                      ]}
                    >
                      {tts.playing ? t("listen.playing") : t("listen.play")}
                    </Text>
                  </View>
                </PressableScale>
                {!!tts.error && (
                  <Text style={[paperType.note, { color: paper.coral }]}>
                    {tts.error}
                  </Text>
                )}
              </View>

              {/* One sheet, not four boxes. The stripe marks the answer, the
                  untouched options recede while the ear is still learning
                  which sound goes with which meaning. */}
              <PaperCard padded={false}>
                {current.options.map((o, i) => {
                  const isAnswer = o.id === current.word.id
                  const selected = picked === o.id
                  const state: RowState = !picked
                    ? "idle"
                    : isAnswer
                      ? "correct"
                      : selected
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
                      onPress={() => pick(o)}
                      disabled={!!picked}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          paddingHorizontal: 16,
                          paddingVertical: 16,
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
                            paperType.cardBody,
                            { color: paper.ink, flex: 1 },
                          ]}
                        >
                          {o.translation ?? o.id}
                        </Text>
                        {state === "correct" && (
                          <Text
                            style={{ color: paper.greenDark, fontSize: 15 }}
                          >
                            ✓
                          </Text>
                        )}
                      </View>
                    </PressableScale>
                  )
                })}
              </PaperCard>
            </View>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
