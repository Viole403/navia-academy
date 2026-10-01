import { BackLink } from "@/components/ui/BackLink"
import { Ionicons } from "@expo/vector-icons"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { PaperCard, LiftedFace } from "@/components/study/PaperCard"
import { ReadingAid } from "@/components/study/ReadingAid"
import { FlexGap } from "@/components/study/press"
import { HanziStage } from "@/components/hanzi/HanziStage"
import { Celebration } from "@/components/study/Celebration"
import { useTheme } from "@/theme/ThemeProvider"
import { useContentFaces } from "@/hooks/useContentFaces"
import { useContentLayout } from "@/theme/layout"
import { paperType, families, hanziFont, hanziType } from "@/theme/paperType"
import { progress } from "@/api/endpoints"
import { findWord } from "@/lib/content-data"
import { hasHan } from "@/lib/han"
import { headword, reading, isCharScript } from "@/lib/languages"
import { useOnboardingStore } from "@/store/onboarding"
import { useTts } from "@/hooks/useTts"
import { useGuardedBack } from "@/hooks/useGuardedBack"
import { useT } from "@/i18n"
import { playSound } from "@/utils/sound"
import { careful, tap, thud, thunk } from "@/utils/feedback"
import {
  drain,
  getPendingCount,
  logStudyWithQueue,
  reviewWithQueue,
} from "@/utils/offlineQueue"
import type { SrsCard, VocabWord } from "@/types/api"

type Mode = "flashcards" | "listening" | "mistakes"
type Grade = 0 | 1 | 2 | 3

/**
 * The review session.
 *
 * Three rules govern the whole session, each forced by what the backend
 * records:
 *
 *  1. **The step queue is built once.** Grading mutates the deck, so recomputing
 *     mid-session reshuffles the plan underneath the learner.
 *  2. **"I don't know" re-queues without grading.** Pressing "Again" to escape a
 *     word never attempted records a lapse against a card the learner did not
 *     try, and teaches guessing over admitting. It re-queues *at most once per
 *     word per session* — without that cap, pressing it on the last card extends
 *     the session by one every time and the end never arrives.
 *  3. **Grades are SM-2 (0–3), not FSRS.** The scheduler is the server's.
 */
export function ReviewSession() {
  const { paper } = useTheme()
  const faces = useContentFaces()
  const t = useT()
  const goBack = useGuardedBack("/review")
  const router = useRouter()
  const qc = useQueryClient()
  const language = useOnboardingStore((s) => s.language)
  const tts = useTts()
  const { column: columnWidth } = useContentLayout()

  const params = useLocalSearchParams<{ mode?: string }>()
  const mode: Mode =
    params.mode === "listening" || params.mode === "mistakes"
      ? (params.mode as Mode)
      : "flashcards"

  const dueQ = useQuery({
    queryKey: ["due-cards", 50],
    queryFn: () => progress.dueCards(50),
  })
  const progressQ = useQuery({ queryKey: ["progress"], queryFn: progress.get })

  // Fixed plan, frozen the first time data arrives.
  const [queue, setQueue] = useState<SrsCard[] | null>(null)
  useEffect(() => {
    // `queue !== null` means the plan is already frozen. Bailing on `!queue`
    // instead returned on the initial state, so it never ran and the screen
    // stayed on its spinner for good.
    if (queue !== null || dueQ.isLoading) return
    const all = dueQ.data ?? []
    if (mode === "mistakes") {
      const difficult = new Set(progressQ.data?.difficult_item_ids ?? [])
      const subset = all.filter(
        (c) => difficult.has(c.item_id) || c.mastery < 40
      )
      // A mistakes run with nothing flagged is still a review of the due cards —
      // an empty session is never the answer.
      setQueue(subset.length > 0 ? subset : all)
    } else {
      setQueue(all)
    }
  }, [dueQ.data, dueQ.isLoading, mode, progressQ.data, queue])

  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [writing, setWriting] = useState(false)
  const [strokesLeft, setStrokesLeft] = useState<number | null>(null)
  const [skippedOnce, setSkippedOnce] = useState<Set<string>>(new Set())
  const [skipNote, setSkipNote] = useState(false)
  const [celebrate, setCelebrate] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)

  const cards = useMemo<SrsCard[]>(() => queue ?? [], [queue])
  const current = cards[index]
  const done = cards.length > 0 && index >= cards.length

  const wordQ = useQuery({
    queryKey: ["vocab-item", current?.item_id],
    queryFn: async () =>
      current ? (await findWord(current.item_id)).word : null,
    enabled: !!current,
  })
  const word = wordQ.data
  // Writing practice needs an ideograph, not a "character script" label: kana
  // have no stroke order, and a Japanese entry carries its text in `text` rather
  // than `hanzi`, so asking for a `hanzi` field would hide the feature entirely
  // on a language that is written with kanji.
  const charScript = isCharScript(language) && hasHan(headword(word ?? {}))

  const advance = useCallback(() => {
    setRevealed(false)
    setSkipNote(false)
    setWriting(false)
    setStrokesLeft(null)
    setPicked(null)
    setIndex((i) => i + 1)
  }, [])

  const reviewM = useMutation({
    mutationFn: async (grade: Grade) => {
      await reviewWithQueue(current!.item_id, current!.kind, grade)
      await logStudyWithQueue(1, 5)
    },
    onSuccess: () => {
      thunk()
      qc.invalidateQueries({ queryKey: ["due-cards"] })
      qc.invalidateQueries({ queryKey: ["srs-stats"] })
      advance()
    },
  })

  const skip = useCallback(() => {
    if (!current) return
    tap()
    setSkipNote(true)
    if (!skippedOnce.has(current.item_id)) {
      setSkippedOnce((s) => new Set(s).add(current.item_id))
      setQueue((q) => (q ? [...q, current] : q))
    }
    setTimeout(advance, 450)
  }, [current, skippedOnce, advance])

  const [pending, setPending] = useState(0)
  const refreshPending = useCallback(async () => {
    setPending(await getPendingCount())
  }, [])
  useEffect(() => {
    refreshPending().catch(() => {})
  }, [refreshPending, reviewM.isSuccess])

  // Listening options come from the due set itself, so a wrong answer is never
  // another card in the same session. An SrsCard carries only an item_id, so the
  // distractors are resolved through the same lookup the current card uses —
  // casting them to VocabWord left `translation` undefined and three of the four
  // answer rows rendered blank.
  const distractorIds = useMemo(
    () =>
      mode === "listening"
        ? cards
            .filter((c) => c.item_id !== current?.item_id)
            .slice(0, 3)
            .map((c) => c.item_id)
        : [],
    [mode, cards, current]
  )
  const distractorsQ = useQuery({
    queryKey: ["vocab-distractors", distractorIds],
    enabled: distractorIds.length > 0,
    queryFn: async () => {
      const found = await Promise.all(
        distractorIds.map((id) => findWord(id).then((r) => r.word))
      )
      return found.filter((w): w is VocabWord => w !== null)
    },
  })

  const options = useMemo(() => {
    if (mode !== "listening" || !word) return []
    return [word, ...(distractorsQ.data ?? [])]
  }, [mode, word, distractorsQ.data])

  if (dueQ.isLoading || queue === null) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: paper.paper,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <BackLink label={t("common.back")} fallback="/review" />
        <ActivityIndicator color={paper.coral} size="large" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: paper.paper }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header: back, mode, counter. */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 12,
        }}
      >
        <BackLink label={t("common.back")} fallback="/review" />
        <Text
          style={[
            paperType.label,
            { color: paper.inkMuted, fontFamily: families.interSemiBold },
          ]}
        >
          {done
            ? t("review.complete")
            : `${Math.min(index + 1, cards.length)} / ${cards.length}`}
        </Text>
      </View>

      {pending > 0 ? (
        <Pressable
          onPress={() =>
            drain()
              .then(() => refreshPending())
              .catch(() => {})
          }
          style={{
            alignItems: "center",
            paddingVertical: 6,
            backgroundColor: paper.cardAlt,
          }}
        >
          <Text
            style={[
              paperType.statLabel,
              { color: paper.inkMuted, fontFamily: families.nunitoSemiBold },
            ]}
          >
            {pending} · {t("review.queued")}
          </Text>
        </Pressable>
      ) : null}

      {done ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
          }}
        >
          <Celebration visible={celebrate} />
          <Text
            style={[
              paperType.cardTitle,
              {
                color: paper.ink,
                fontFamily: families.nunitoExtraBold,
                textAlign: "center",
              },
            ]}
          >
            {t("rev.doneTitle")}
          </Text>
          <Text
            style={[
              paperType.cardBody,
              {
                color: paper.inkSoft,
                fontFamily: families.nunitoSemiBold,
                textAlign: "center",
                marginTop: 6,
              },
            ]}
          >
            {t("rev.doneBody")}
          </Text>
          <View style={{ height: 20 }} />
          <LiftedFace
            title={t("common.continue")}
            face={paper.coral}
            onPress={() => {
              thud()
              playSound("fanfare")
              setCelebrate(true)
              goBack()
            }}
          />
        </View>
      ) : !current || !word ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
          }}
        >
          <Text
            style={[
              paperType.cardBody,
              { color: paper.inkMuted, fontFamily: families.nunitoSemiBold },
            ]}
          >
            {t("review.noCards")}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            padding: 20,
            paddingBottom: 48,
            alignItems: "center",
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              width: "100%",
              maxWidth: columnWidth,
              gap: 16,
              flexGrow: 1,
            }}
          >
            {mode === "listening" ? (
              <ListeningCard
                word={word}
                options={options}
                picked={picked}
                onPick={(id) => {
                  if (picked) return
                  const correct = id === word.id
                  setPicked(id)
                  playSound(correct ? "chime" : "retry")
                  setTimeout(() => reviewM.mutate(correct ? 2 : 0), 700)
                }}
                onPlay={() => tts.play(headword(word), `vocab:${word.id}`)}
                playing={tts.playing || tts.loading}
              />
            ) : (
              <PaperCard tone="review">
                {writing ? (
                  <View style={{ height: 240 }}>
                    <HanziStage
                      character={headword(word)}
                      mode="quiz"
                      showOutline={false}
                      showGuides
                      onQuizProgress={(remaining) => setStrokesLeft(remaining)}
                      onQuizComplete={() => {
                        playSound("chime")
                        setWriting(false)
                        setStrokesLeft(null)
                        setRevealed(true)
                      }}
                      maxSize={200}
                    />
                  </View>
                ) : (
                  <Pressable
                    onPress={() => {
                      tap()
                      setRevealed((r) => !r)
                    }}
                    style={{
                      gap: 14,
                      alignItems: "center",
                      paddingVertical: 12,
                    }}
                    accessibilityHint={
                      revealed ? t("rev.revealed") : t("rev.tapReveal")
                    }
                  >
                    <Text
                      style={{
                        fontFamily: faces.hanzi,
                        ...hanziType(88),
                        color: paper.ink,
                        textAlign: "center",
                      }}
                    >
                      {headword(word)}
                    </Text>
                    {revealed ? (
                      <View style={{ gap: 6, alignItems: "center" }}>
                        <ReadingAid pinyin={reading(word)} />
                        <Text
                          style={[
                            paperType.proseSm,
                            { color: paper.ink, textAlign: "center" },
                          ]}
                        >
                          {String(word.translation ?? "")}
                        </Text>
                      </View>
                    ) : (
                      <Text
                        style={[
                          paperType.statLabel,
                          {
                            color: paper.inkMuted,
                            fontFamily: families.nunitoSemiBold,
                          },
                        ]}
                      >
                        {t("rev.tapReveal")}
                      </Text>
                    )}
                  </Pressable>
                )}

                {strokesLeft !== null && (
                  <Text
                    style={[
                      paperType.statLabel,
                      {
                        color: paper.inkMuted,
                        fontFamily: families.nunitoSemiBold,
                        textAlign: "center",
                      },
                    ]}
                  >
                    {strokesLeft} {t("rev.strokesLeft")}
                  </Text>
                )}
              </PaperCard>
            )}

            {skipNote ? (
              <Text
                style={[
                  paperType.statLabel,
                  {
                    color: paper.gold,
                    fontFamily: families.nunitoSemiBold,
                    textAlign: "center",
                  },
                ]}
              >
                {t("rev.requeued")}
              </Text>
            ) : null}

            {mode !== "listening" ? (
              <View
                style={{
                  gap: 8,
                  opacity: revealed || writing ? 1 : 0.35,
                }}
                pointerEvents={revealed || writing ? "auto" : "none"}
              >
                {charScript && !writing ? (
                  <LiftedFace
                    title={t("rev.writeIt")}
                    face={paper.surface.week.fill}
                    textColor={paper.ink}
                    small
                    onPress={() => {
                      careful()
                      setWriting(true)
                    }}
                  />
                ) : null}
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <LiftedFace
                      title={t("rev.again")}
                      face={paper.coralDark}
                      small
                      disabled={reviewM.isPending}
                      onPress={() => reviewM.mutate(0)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <LiftedFace
                      title={t("rev.hard")}
                      face={paper.surface.week.fill}
                      textColor={paper.ink}
                      small
                      disabled={reviewM.isPending}
                      onPress={() => reviewM.mutate(1)}
                    />
                  </View>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <LiftedFace
                      title={t("rev.good")}
                      face={paper.green}
                      small
                      disabled={reviewM.isPending}
                      onPress={() => reviewM.mutate(2)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <LiftedFace
                      title={t("rev.easy")}
                      face={paper.coral}
                      small
                      disabled={reviewM.isPending}
                      onPress={() => reviewM.mutate(3)}
                    />
                  </View>
                </View>
                <Pressable
                  onPress={skip}
                  style={{ alignItems: "center", paddingVertical: 8 }}
                >
                  <Text
                    style={[
                      paperType.link,
                      { color: paper.gold, fontFamily: families.nunitoBold },
                    ]}
                  >
                    {t("rev.dontKnow")}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={skip}
                style={{ alignItems: "center", paddingVertical: 8 }}
              >
                <Text
                  style={[
                    paperType.link,
                    { color: paper.gold, fontFamily: families.nunitoBold },
                  ]}
                >
                  {t("rev.dontKnow")}
                </Text>
              </Pressable>
            )}

            <FlexGap min={0} />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

/**
 * The listening card.
 *
 * Multiple-choice audio recognition, graded on the answer. It passes no preview
 * to the scheduler — the learner was never shown four intervals to choose
 * between, so there is no displayed number for the commit to match, and
 * scheduling fresh at the moment of the answer is correct.
 */
function ListeningCard({
  word,
  options,
  picked,
  onPick,
  onPlay,
  playing,
}: {
  word: VocabWord
  options: VocabWord[]
  picked: string | null
  onPick: (id: string) => void
  onPlay: () => void
  playing: boolean
}) {
  const { paper } = useTheme()
  const t = useT()
  return (
    <PaperCard tone="week">
      <View style={{ alignItems: "center", gap: 10, paddingVertical: 8 }}>
        <Pressable onPress={onPlay} style={{ alignItems: "center", gap: 4 }}>
          <Ionicons name="volume-high" size={30} color={paper.inkSoft} />
          <Text
            style={[
              paperType.link,
              { color: paper.greenDark, fontFamily: families.nunitoBold },
            ]}
          >
            {playing ? t("vocab.playing") : t("rev.listen")}
          </Text>
        </Pressable>
        <Text
          style={[
            paperType.cardTitleSm,
            {
              color: paper.ink,
              fontFamily: families.nunitoExtraBold,
              textAlign: "center",
            },
          ]}
        >
          {t("rev.pickMeaning")}
        </Text>
      </View>
      <View style={{ gap: 8, marginTop: 8 }}>
        {options.map((o) => {
          const isPick = picked === o.id
          const right = picked !== null && o.id === word.id
          const wrong = picked !== null && isPick && o.id !== word.id
          return (
            <Pressable
              key={o.id}
              onPress={() => onPick(o.id)}
              disabled={picked !== null}
              style={{
                borderWidth: 1.5,
                borderColor: right
                  ? paper.green
                  : wrong
                    ? paper.coral
                    : paper.line,
                backgroundColor: right
                  ? paper.greenSoft
                  : wrong
                    ? paper.coralSoft
                    : "transparent",
                borderRadius: paper.radius.inner,
                padding: 12,
              }}
            >
              <Text
                style={[
                  paperType.cardBody,
                  { color: paper.ink, fontFamily: families.nunitoSemiBold },
                ]}
              >
                {String(o.translation ?? "")}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </PaperCard>
  )
}
