import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
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
import { ProgressBar } from "@/components/ui/ProgressBar"
import { StudyCard } from "@/components/study/StudyCard"
import { LiftedButton } from "@/components/study/LiftedButton"
import { CONTENT_MAX, spacing, studyType } from "@/components/study/tokens"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"
import { progress } from "@/api/endpoints"
import { findWord } from "@/lib/content-data"
import { headword, motifChar, reading } from "@/lib/languages"
import { useT } from "@/i18n"
import { useOnboardingStore } from "@/store/onboarding"
import { thunk, tap } from "@/utils/feedback"
import {
  drain,
  getPendingCount,
  logStudyWithQueue,
  reviewWithQueue,
} from "@/utils/offlineQueue"
import type { SrsCard } from "@/types/api"

type Grade = 0 | 1 | 2 | 3

/**
 * Review session — ported from Chinese-Easy `ReviewSession`:
 * the step queue is built once (grading mutates the deck, so recomputing
 * mid-session would reshuffle it underneath the learner). "Don't know"
 * re-queues the card once without grading — an honest admission is not a
 * mistake. Back is guarded: deep links have nothing to pop.
 */
export default function ReviewScreen() {
  const { theme } = useTheme()
  const t = useT()
  const language = useOnboardingStore((s) => s.language)
  const router = useRouter()
  const qc = useQueryClient()

  const GRADES: { grade: Grade; label: string; hint: string }[] = [
    { grade: 0, label: t("review.g0"), hint: t("review.g0h") },
    { grade: 1, label: t("review.g1"), hint: t("review.g1h") },
    { grade: 2, label: t("review.g2"), hint: t("review.g2h") },
    { grade: 3, label: t("review.g3"), hint: t("review.g3h") },
  ]

  const dueQ = useQuery({
    queryKey: ["due-cards"],
    queryFn: () => progress.dueCards(50),
  })

  // Fixed plan: freeze the queue the first time data arrives.
  const [queue, setQueue] = useState<SrsCard[] | null>(null)
  useEffect(() => {
    if (dueQ.data && queue === null) setQueue(dueQ.data)
  }, [dueQ.data, queue])

  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [skippedOnce, setSkippedOnce] = useState<Set<string>>(new Set())
  const [skipNote, setSkipNote] = useState(false)
  const cards = useMemo<SrsCard[]>(() => queue ?? [], [queue])
  const current = cards[index]

  const wordQ = useQuery({
    queryKey: ["vocab-item", current?.item_id],
    queryFn: async () =>
      current ? (await findWord(current.item_id)).word : null,
    enabled: !!current,
  })

  const advance = useCallback(() => {
    setRevealed(false)
    setSkipNote(false)
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

  // "Don't know": re-queue once at the end, grade nothing.
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

  const done = cards.length > 0 && index >= cards.length

  const [pending, setPending] = useState(0)
  const refreshPending = useCallback(async () => {
    setPending(await getPendingCount())
  }, [])
  useEffect(() => {
    refreshPending().catch(() => {})
  }, [refreshPending, reviewM.isSuccess])

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back()
    else router.replace("/(tabs)/learn")
  }, [router])

  if (dueQ.isLoading || queue === null) {
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
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
          {done
            ? t("review.complete")
            : `${Math.min(index + 1, cards.length)} / ${cards.length}`}
        </Text>
      </View>

      <ProgressBar
        value={cards.length === 0 ? 0 : index / cards.length}
        height={2}
        tint={theme.accent}
      />

      {pending > 0 && (
        <Pressable
          onPress={() =>
            drain()
              .then(() => refreshPending())
              .catch(() => {})
          }
          style={{
            paddingVertical: 6,
            alignItems: "center",
            backgroundColor: theme.surface,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <Text
            style={{ color: theme.textMuted, fontSize: 11, letterSpacing: 1 }}
          >
            {pending} · {t("review.queued")}
          </Text>
        </Pressable>
      )}

      {done ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
          }}
        >
          <EmptyState
            title={t("review.done")}
            message={t("review.doneMsg")}
            glyph={motifChar(language)}
          />
          <Button title={t("review.backToLearn")} onPress={goBack} />
        </View>
      ) : !current ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
          }}
        >
          <EmptyState title={t("review.noCards")} glyph={motifChar(language)} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: "center",
            padding: spacing.screen,
            paddingBottom: 48,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              width: "100%",
              maxWidth: CONTENT_MAX,
              gap: spacing.lg,
              flexGrow: 1,
            }}
          >
            <StudyCard tone="review" tag={t("home.reviewTitle").toUpperCase()}>
              <Pressable
                onPress={() => setRevealed((r) => !r)}
                style={{
                  gap: spacing.lg,
                  alignItems: "center",
                  paddingVertical: spacing.md,
                }}
                accessibilityHint={
                  revealed ? t("review.revealed") : t("review.tapReveal")
                }
              >
                <Text
                  style={{
                    fontFamily: fonts.serif,
                    fontSize: 104,
                    lineHeight: 122,
                    color: theme.text,
                    fontWeight: "500",
                    textAlign: "center",
                  }}
                >
                  {wordQ.data ? headword(wordQ.data) : "…"}
                </Text>
                {revealed ? (
                  <View style={{ gap: spacing.sm, alignItems: "center" }}>
                    <Text style={[type.label, { color: theme.accent }]}>
                      {wordQ.data ? (reading(wordQ.data) ?? "—") : "—"}
                    </Text>
                    <Text
                      style={{
                        fontFamily: fonts.serif,
                        fontStyle: "italic",
                        fontSize: 22,
                        color: theme.text,
                        textAlign: "center",
                      }}
                    >
                      {(wordQ.data as { translation?: string } | null)
                        ?.translation ?? "—"}
                    </Text>
                    {(wordQ.data as { exampleSentence?: string } | null)
                      ?.exampleSentence && (
                      <Text
                        style={[
                          type.caption,
                          { color: theme.textMuted, textAlign: "center" },
                        ]}
                      >
                        {
                          (wordQ.data as { exampleSentence?: string })
                            .exampleSentence
                        }
                      </Text>
                    )}
                  </View>
                ) : (
                  <Text style={[type.labelSm, { color: theme.textMuted }]}>
                    {t("review.tapReveal")}
                  </Text>
                )}
              </Pressable>
            </StudyCard>

            {skipNote && (
              <Text
                style={[
                  type.caption,
                  { color: theme.gold, textAlign: "center" },
                ]}
              >
                {t("review.skipped")}
              </Text>
            )}

            <View
              style={{ gap: spacing.sm, opacity: revealed ? 1 : 0.35 }}
              pointerEvents={revealed ? "auto" : "none"}
            >
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                {GRADES.slice(0, 2).map((g) => (
                  <View key={g.grade} style={{ flex: 1 }}>
                    <LiftedButton
                      small
                      title={`${g.label} · ${g.hint}`}
                      face={g.grade === 0 ? theme.red : theme.surfaceAlt}
                      textColor={g.grade === 0 ? theme.white : theme.text}
                      disabled={reviewM.isPending}
                      onPress={() => reviewM.mutate(g.grade)}
                    />
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                {GRADES.slice(2).map((g) => (
                  <View key={g.grade} style={{ flex: 1 }}>
                    <LiftedButton
                      small
                      title={`${g.label} · ${g.hint}`}
                      face={g.grade === 3 ? theme.accent : theme.green}
                      disabled={reviewM.isPending}
                      onPress={() => reviewM.mutate(g.grade)}
                    />
                  </View>
                ))}
              </View>
              <Pressable
                onPress={skip}
                style={{ alignItems: "center", paddingVertical: spacing.sm }}
              >
                <Text
                  style={[
                    studyType.link,
                    {
                      color: theme.gold,
                      fontFamily: fonts.sans,
                      fontWeight: "700",
                    },
                  ]}
                >
                  {t("review.skip")}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
