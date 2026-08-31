import { useCallback, useEffect, useMemo, useState } from "react"
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
import { Card } from "@/components/ui/Card"
import { EmptyState } from "@/components/ui/EmptyState"
import { ProgressBar } from "@/components/ui/ProgressBar"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"
import { progress } from "@/api/endpoints"
import { loadVocabulary } from "@/lib/content-data"
import {
  drain,
  getPendingCount,
  logStudyWithQueue,
  reviewWithQueue,
} from "@/utils/offlineQueue"
import type { SrsCard, VocabWord } from "@/types/api"

type Grade = 0 | 1 | 2 | 3
const GRADES: { grade: Grade; label: string; hint: string }[] = [
  { grade: 0, label: "Lupa", hint: "Again" },
  { grade: 1, label: "Susah", hint: "Hard" },
  { grade: 2, label: "Oke", hint: "Good" },
  { grade: 3, label: "Gampang", hint: "Easy" },
]

export default function ReviewScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const qc = useQueryClient()

  const dueQ = useQuery({
    queryKey: ["due-cards"],
    queryFn: () => progress.dueCards(50),
  })

  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)

  const cards = useMemo<SrsCard[]>(() => dueQ.data ?? [], [dueQ.data])
  const current = cards[index]

  // We need the vocabulary word for this card — look it up by id.
  const wordQ = useQuery({
    queryKey: ["vocab-item", current?.item_id],
    queryFn: async () => {
      const all = await loadVocabulary()
      return (all.find((w) => w.id === current?.item_id) ??
        null) as VocabWord | null
    },
    enabled: !!current,
  })

  const reviewM = useMutation({
    mutationFn: async (grade: Grade) => {
      const start = Date.now()
      const res = await reviewWithQueue(current!.item_id, current!.kind, grade)
      // optimistic: also record a tiny study session (2 min per card is a
      // heuristic; real time-tracking lands in a follow-up)
      await logStudyWithQueue(1, 5)
      return res
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["due-cards"] })
      qc.invalidateQueries({ queryKey: ["srs-stats"] })
      setRevealed(false)
      if (index < cards.length - 1) {
        setIndex(index + 1)
      } else {
        setIndex(cards.length) // done
      }
    },
  })

  const done = cards.length > 0 && index >= cards.length

  // Show how many ops are still queued (offline mode)
  const [pending, setPending] = useState(0)
  const refreshPending = useCallback(async () => {
    setPending(await getPendingCount())
  }, [])
  useEffect(() => {
    refreshPending().catch(() => {})
  }, [refreshPending, reviewM.isSuccess])

  if (dueQ.isLoading) {
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
          padding: 16,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: theme.textMuted, fontSize: 16 }}>← Back</Text>
        </Pressable>
        <Text style={[type.labelSm, { color: theme.textMuted }]}>
          {done ? "Complete" : `${index + 1} / ${cards.length}`}
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
            paddingHorizontal: 12,
            alignItems: "center",
            backgroundColor: theme.surface,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <Text
            style={{ color: theme.textMuted, fontSize: 11, letterSpacing: 1 }}
          >
            {pending} OP{pending === 1 ? "" : "S"} QUEUED — TAP TO SYNC
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
            title="Review complete"
            message="Nice work. Come back tomorrow for the next batch."
            glyph="毕"
          />
          <Button title="Back to Learn" onPress={() => router.back()} />
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
          <EmptyState title="No cards due" glyph="完" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24, gap: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* The card itself */}
          <View style={{ flex: 1, justifyContent: "center" }}>
            <Card>
              <Pressable
                onPress={() => setRevealed((r) => !r)}
                style={{ gap: 24, alignItems: "center", paddingVertical: 24 }}
                accessibilityHint={
                  revealed ? "Answer revealed" : "Tap to reveal"
                }
              >
                <Text
                  style={{
                    fontFamily: fonts.serif,
                    fontSize: 120,
                    lineHeight: 138,
                    color: theme.text,
                    fontWeight: "500",
                  }}
                >
                  {wordQ.data?.hanzi ?? "…"}
                </Text>

                {revealed ? (
                  <View style={{ gap: 8, alignItems: "center" }}>
                    <Text style={[type.label, { color: theme.accent }]}>
                      {(wordQ.data as { pinyin?: string } | null)?.pinyin ??
                        "—"}
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
                    Tap to reveal
                  </Text>
                )}
              </Pressable>
            </Card>
          </View>

          {/* Grade buttons */}
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              opacity: revealed ? 1 : 0.3,
            }}
            pointerEvents={revealed ? "auto" : "none"}
          >
            {GRADES.map((g) => (
              <Pressable
                key={g.grade}
                onPress={() => reviewM.mutate(g.grade)}
                disabled={reviewM.isPending}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderWidth: 1.5,
                  borderColor: theme.border,
                  backgroundColor:
                    g.grade === 0
                      ? theme.red + "0D"
                      : g.grade === 3
                        ? theme.accent
                        : "transparent",
                  borderRadius: 2,
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Text
                  style={{
                    color:
                      g.grade === 3
                        ? theme.white
                        : g.grade === 0
                          ? theme.red
                          : theme.text,
                    fontWeight: "700",
                    fontSize: 14,
                  }}
                >
                  {g.label}
                </Text>
                <Text
                  style={{
                    color:
                      g.grade === 3
                        ? theme.white + "CC"
                        : g.grade === 0
                          ? theme.red
                          : theme.textMuted,
                    fontSize: 10,
                    letterSpacing: 1,
                  }}
                >
                  {g.hint.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
