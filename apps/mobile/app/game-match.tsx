import { useMemo, useState } from "react"
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
import { Motif } from "@/components/ui/Motif"
import { useTheme } from "@/theme/ThemeProvider"
import { fonts, type } from "@/theme/typography"
import { progress, game } from "@/api/endpoints"
import { loadVocabulary } from "@/lib/content-data"
import { headword, isCharScript, motifChar } from "@/lib/languages"
import { useT } from "@/i18n"
import { useOnboardingStore } from "@/store/onboarding"
import { logStudyWithQueue } from "@/utils/offlineQueue"
import type { VocabWord } from "@/types/api"

interface Card {
  id: string
  label: string
  type: "hanzi" | "meaning"
  wordId: string
  matched: boolean
}

export default function GameMatch() {
  const { theme, paper } = useTheme()
  const router = useRouter()
  const qc = useQueryClient()
  const language = useOnboardingStore((s) => s.language)
  const t = useT()

  const page = useQuery({
    queryKey: ["game-match-pool", language],
    queryFn: async () => {
      const all = await loadVocabulary(language)
      return all.slice(0, 8)
    },
  })

  const [cards, setCards] = useState<Card[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const [matches, setMatches] = useState(0)
  const [moves, setMoves] = useState(0)
  const [startTs, setStartTs] = useState<number | null>(null)

  const submitM = useMutation({
    mutationFn: async () => {
      if (!page.data) return
      const total = page.data.length * 2
      const accuracy = total === 0 ? 0 : matches / (total / 2)
      await game.addGameResult(
        isCharScript(language) ? "match-hanzi" : "match-word",
        accuracy,
        matches * 10
      )
      const durMin = startTs
        ? Math.max(1, Math.round((Date.now() - startTs) / 60000))
        : 1
      await logStudyWithQueue(durMin, matches * 10)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["progress"] })
    },
  })

  const start = () => {
    if (!page.data) return
    const pool = page.data
    const list: Card[] = []
    pool.forEach((w) => {
      list.push({
        id: `${w.id}-h`,
        label: headword(w),
        type: "hanzi",
        wordId: w.id,
        matched: false,
      })
      list.push({
        id: `${w.id}-m`,
        label: (w as { translation?: string }).translation ?? "—",
        type: "meaning",
        wordId: w.id,
        matched: false,
      })
    })
    // shuffle
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[list[i], list[j]] = [list[j], list[i]]
    }
    setCards(list)
    setOpen(null)
    setMatches(0)
    setMoves(0)
    setStartTs(Date.now())
  }

  const totalPairs = useMemo(() => cards.length / 2, [cards])

  const flip = (id: string) => {
    if (!open) {
      setOpen(id)
      return
    }
    if (open === id) {
      setOpen(null)
      return
    }
    const c1 = cards.find((c) => c.id === open)
    const c2 = cards.find((c) => c.id === id)
    setMoves((m) => m + 1)
    if (c1 && c2 && c1.wordId === c2.wordId && c1.type !== c2.type) {
      setCards((cs) =>
        cs.map((c) =>
          c.id === c1.id || c.id === c2.id ? { ...c, matched: true } : c
        )
      )
      setMatches((m) => m + 1)
    }
    setOpen(null)
  }

  if (page.isLoading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: paper.paper,
          alignItems: "center",
          justifyContent: "center",
        }}
        edges={["top"]}
      >
        <ActivityIndicator color={theme.accent} size="large" />
      </SafeAreaView>
    )
  }

  if (!page.data) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: paper.paper }}
        edges={["top"]}
      >
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
          }}
        >
          <EmptyState
            title={t("game.nothingToPlay")}
            glyph={motifChar(language)}
          />
          <Button title={t("game.back")} onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    )
  }

  const won = totalPairs > 0 && matches === totalPairs

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: paper.paper }}
      edges={["top"]}
    >
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
          <Text style={{ color: theme.textMuted, fontSize: 16 }}>
            ← {t("game.back")}
          </Text>
        </Pressable>
        <Text style={[type.labelSm, { color: theme.textMuted }]}>
          {matches}/{totalPairs} {t("game.pairs")} · {moves} {t("game.moves")}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {cards.length === 0 ? (
          <View style={{ gap: 16, paddingTop: 24 }}>
            <View style={{ alignItems: "center", gap: 12 }}>
              <Motif char={motifChar(language)} size={64} />
              <Text
                style={[type.h2, { color: theme.text, textAlign: "center" }]}
              >
                {isCharScript(language)
                  ? t("learn.hanziMatch")
                  : t("learn.wordMatch")}
              </Text>
              <Text
                style={[
                  type.bodySm,
                  { color: theme.textMuted, textAlign: "center" },
                ]}
              >
                {isCharScript(language)
                  ? t("game.pairChar")
                  : t("game.pairWord")}{" "}
                {page.data?.length ?? 0} {t("game.cards")}
              </Text>
            </View>
            <Button title={t("game.start")} onPress={start} size="lg" />
          </View>
        ) : won ? (
          <View style={{ gap: 16, paddingTop: 24 }}>
            <View style={{ alignItems: "center", gap: 12 }}>
              <Motif char={motifChar(language)} size={64} />
              <Text
                style={[type.h2, { color: theme.text, textAlign: "center" }]}
              >
                {t("game.allMatched")}
              </Text>
              <Text
                style={[
                  type.bodySm,
                  { color: theme.textMuted, textAlign: "center" },
                ]}
              >
                {moves} {t("game.moves")} · +{matches * 10} XP{" "}
                {t("game.xpLogged")}
              </Text>
            </View>
            <Button
              title={submitM.isPending ? t("game.saving") : t("game.saveExit")}
              onPress={() => {
                submitM.mutate()
                router.back()
              }}
              size="lg"
              disabled={submitM.isPending}
            />
          </View>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {cards.map((c) => {
              const isOpen = open === c.id
              return (
                <Pressable
                  key={c.id}
                  onPress={() => !c.matched && flip(c.id)}
                  disabled={c.matched}
                  style={{
                    width: "48%",
                    aspectRatio: 1.3,
                    borderWidth: c.matched || isOpen ? 1.5 : 2,
                    borderColor: c.matched
                      ? theme.green
                      : isOpen
                        ? theme.accent
                        : theme.textDim,
                    backgroundColor: c.matched
                      ? theme.green + "15"
                      : isOpen
                        ? theme.accent + "08"
                        : theme.surface,
                    borderRadius: 4,
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 8,
                  }}
                >
                  <Text
                    style={{
                      fontFamily:
                        c.matched || isOpen
                          ? c.type === "hanzi"
                            ? fonts.hanzi
                            : fonts.sans
                          : fonts.serif,
                      fontSize:
                        c.matched || isOpen
                          ? c.type === "hanzi"
                            ? 26
                            : 14
                          : 24,
                      color: c.matched
                        ? theme.green
                        : isOpen || c.matched
                          ? theme.text
                          : theme.textDim,
                      textAlign: "center",
                      fontWeight: "600",
                    }}
                    numberOfLines={2}
                  >
                    {c.matched || isOpen ? c.label : "?"}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
